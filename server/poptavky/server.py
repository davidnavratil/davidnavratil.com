#!/usr/bin/env python3
"""Příjem poptávek vystoupení z davidnavratil.com.

Jak to funguje:
1. nginx předá POST /api/poptavka sem (jen z 127.0.0.1, s omezením počtu dotazů na IP).
2. Poptávka se NEJDŘÍV uloží na disk do fronty (/var/lib/poptavky/fronta). Nic se tedy neztratí,
   ani když selže e-mail.
3. Pak se odešle e-mailem přes msmtp (účet Mozek) na adresu v PRIJEMCE. Při úspěchu se soubor
   přesune do /var/lib/poptavky/odeslano.
4. Co se odeslat nepovedlo, zkusí znovu `server.py --znovu` (spouští ho časovač každých 15 minut).

Ochrana proti spamu: skryté pole „web“, minimální doba vyplnění 3 s a limit nginx na IP. Nic se nezahazuje:
podezřelé poptávky odejdou s „[ověřit]“ v předmětu. Dál délkové limity, kontrola e-mailu, limit nginx na IP.
Uchování: automatické mazání je vypnuté (POPTAVKY_UCHOVAT_DNI=0); lze ho zapnout nastavením počtu dní.
Bez externích knihoven, jen standardní Python 3.
"""
import json, os, re, sys, time, uuid, subprocess, logging, threading, fcntl
from email.parser import BytesParser
from email import policy as email_policy
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs

PRIJEMCE = os.environ.get('POPTAVKY_PRIJEMCE', 'davidxnavratil@gmail.com')
ODESILATEL = os.environ.get('POPTAVKY_ODESILATEL', 'davidxnavratilxmozek@gmail.com')
ADRESAR = os.environ.get('POPTAVKY_ADRESAR', '/var/lib/poptavky')
PORT = int(os.environ.get('POPTAVKY_PORT', '8731'))
MSMTP_LOG = os.path.join(ADRESAR, 'msmtp.log')
FRONTA, ODESLANO, PODEZRELE = (os.path.join(ADRESAR, d) for d in ('fronta', 'odeslano', 'podezrele'))
UCHOVAT_DNI = int(os.environ.get('POPTAVKY_UCHOVAT_DNI', '0'))  # 0 = automaticky nemazat (David maže ručně po vyřízení)  # pak se poptávka smaže (informace u formuláře)
POLE = {'name': ('Jméno', 120, True), 'email': ('E-mail', 200, True), 'company': ('Firma nebo akce', 200, True),
        'date': ('Termín', 120, False), 'format': ('Formát', 60, False), 'message': ('Zpráva', 4000, False),
        'page': ('Stránka', 200, False)}
FORMATY = {'prednaska': 'Přednáška', 'debata': 'Strategická debata s vedením', 'nevim': 'Zatím nevím'}
EMAIL_RE = re.compile(r'^[^@\s<>"]{1,64}@[^@\s<>"]{1,190}\.[a-zA-Z]{2,24}$')
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('poptavky')


def cisty(s, n, radky=False):
    s = str(s or '')
    s = s.replace('\r\n', '\n').replace('\r', '\n')
    if not radky:  # do hlaviček e-mailu nesmí projít konec řádku
        s = re.sub(r'\s*\n\s*', ' ', s)
    s = re.sub(r'[\x00-\x08\x0b-\x1f\x7f]', '', s).strip()
    return s[:n]


def ulozit(zaznam, kam=FRONTA):
    os.makedirs(kam, exist_ok=True)
    cesta = os.path.join(kam, zaznam['id'] + '.json')
    docasny = cesta + '.tmp'
    with open(docasny, 'w', encoding='utf-8') as f:
        json.dump(zaznam, f, ensure_ascii=False, indent=1)
        f.flush(); os.fsync(f.fileno())
    os.replace(docasny, cesta)
    return cesta


def odeslat(zaznam):
    p = zaznam['pole']
    m = EmailMessage()
    m['From'] = f'Web davidnavratil.com <{ODESILATEL}>'
    m['To'] = PRIJEMCE
    m['Reply-To'] = p['email']
    kontakt = zaznam.get('zdroj') == 'kontakt'
    druh = 'Zpráva z webu' if kontakt else 'Poptávka vystoupení'
    m['Subject'] = ('[ověřit] ' if zaznam.get('podezrela') else '') + f"{druh}: {p.get('company') or p.get('name')}"
    m['Date'] = formatdate(localtime=True)
    m['Message-ID'] = make_msgid(domain='davidnavratil.com')
    radky = [f'{POLE[k][0]}: {p.get(k) or "neuvedeno"}' for k in (('name', 'email', 'company') if kontakt else ('name', 'email', 'company', 'date', 'format'))]
    radky += ['', p.get('message') or '(bez zprávy)', '', '---']
    if zaznam.get('podezrela'):
        radky.append('Pozor: ' + zaznam['podezrela'] + '. Může jít o robota.')
    radky += [
              f"Přijato {zaznam['prijato']}, stránka {p.get('page') or 'neuvedena'}, id {zaznam['id']}.",
              'Odpovědí na tento e-mail píšete přímo tazateli.']
    m.set_content('\n'.join(radky))
    r = subprocess.run(['/usr/bin/msmtp', '--logfile=' + MSMTP_LOG, '-a', 'default', PRIJEMCE],
                       input=m.as_bytes(), capture_output=True, timeout=60)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.decode('utf-8', 'replace')[-300:])


def zpracovat_frontu():
    """Pošle všechno, co ve frontě čeká. Vrací (odesláno, selhalo).
    Zámek zajistí, že frontu nikdy neposílají dva procesy naráz (server i časovač), takže nic neodejde dvakrát."""
    os.makedirs(ODESLANO, exist_ok=True)
    zamek = open(os.path.join(ADRESAR, '.zamek'), 'w')
    try:
        fcntl.flock(zamek, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        zamek.close()
        return 0, 0
    try:
        return _poslat_frontu()
    finally:
        fcntl.flock(zamek, fcntl.LOCK_UN); zamek.close()


def _poslat_frontu():
    ok = chyba = 0
    for n in sorted(os.listdir(FRONTA)) if os.path.isdir(FRONTA) else []:
        if not n.endswith('.json'):
            continue
        cesta = os.path.join(FRONTA, n)
        try:
            with open(cesta, encoding='utf-8') as f:
                z = json.load(f)
            odeslat(z)
            z['odeslano'] = time.strftime('%Y-%m-%dT%H:%M:%S%z')
            with open(os.path.join(ODESLANO, n), 'w', encoding='utf-8') as f:
                json.dump(z, f, ensure_ascii=False, indent=1)
            os.remove(cesta)
            ok += 1
        except Exception as e:  # zůstane ve frontě, zkusí se příště
            chyba += 1
            log.warning('odeslání %s selhalo: %s', n, e)
    return ok, chyba


def promazat():
    """Smaže poptávky (fronta, odeslané, podezřelé) starší než UCHOVAT_DNI dní od přijetí."""
    if UCHOVAT_DNI <= 0:
        return 0
    hranice = time.time() - UCHOVAT_DNI * 86400
    smazano = 0
    for d in (FRONTA, ODESLANO, PODEZRELE):
        for n in os.listdir(d) if os.path.isdir(d) else []:
            c = os.path.join(d, n)
            if not n.endswith('.json'):
                continue
            try:
                with open(c, encoding='utf-8') as f:
                    prijato = time.mktime(time.strptime(json.load(f)['prijato'][:19], '%Y-%m-%dT%H:%M:%S'))
            except Exception:
                prijato = os.path.getmtime(c)
            if prijato < hranice:
                os.remove(c); smazano += 1
    return smazano


class Obsluha(BaseHTTPRequestHandler):
    server_version = 'poptavky'
    sys_version = ''

    def odpoved(self, kod, data):
        b = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(kod)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def odpoved_html(self, kod, nadpis, text):
        """Odpověď pro odeslání bez JavaScriptu (klasický formulář): čitelná stránka místo JSON."""
        b = (f'<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
             f'<title>{nadpis}</title></head><body style="font:18px/1.6 Georgia,serif;max-width:640px;margin:15vh auto;padding:0 20px;color:#163a5f;background:#f5f1e8">'
             f'<h1 style="font-weight:400">{nadpis}</h1><p>{text}</p><p><a href="/">Zpět na davidnavratil.com</a></p></body></html>').encode('utf-8')
        self.send_response(kod)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def log_message(self, fmt, *args):  # bez osobních údajů v logu
        log.info('%s %s', self.command, args[1] if len(args) > 1 else '')

    def do_GET(self):
        if self.path == '/api/poptavka/zdravi':
            # Veřejná kontrola pro hlídání zvenku (nezávisle na poště): jen počty a stáří, žádné osobní údaje.
            fr = [os.path.join(FRONTA, n) for n in os.listdir(FRONTA) if n.endswith('.json')] if os.path.isdir(FRONTA) else []
            nejstarsi = int((time.time() - min(os.path.getmtime(f) for f in fr)) / 60) if fr else 0
            return self.odpoved(200, {'ok': not fr or nejstarsi < 60, 've_fronte': len(fr), 'nejstarsi_min': nejstarsi})
        self.odpoved(404, {'ok': False})

    def do_POST(self):
        if self.path != '/api/poptavka':
            return self.odpoved(404, {'ok': False})
        typ = (self.headers.get('Content-Type') or '').split(';')[0].strip()
        # HTML odpověď jen pro klasický formulář bez JavaScriptu; kdo chce JSON (fetch), dostane JSON.
        html = typ != 'application/json' and 'application/json' not in (self.headers.get('Accept') or '')
        try:
            delka = int(self.headers.get('Content-Length') or 0)
        except ValueError:
            delka = 0
        if delka <= 0 or delka > 32000:
            if html:
                return self.odpoved_html(413, 'Poptávka je příliš dlouhá', 'Zkraťte prosím zprávu, nebo napište přímo na davidxnavratil@gmail.com.')
            return self.odpoved(413, {'ok': False, 'chyba': 'velikost'})
        surove_b = self.rfile.read(delka)
        surove = surove_b.decode('utf-8', 'replace')
        try:
            if typ == 'application/json':
                data = json.loads(surove)
            else:
                if typ == 'multipart/form-data':  # kontaktní formulář na úvodní stránce posílá FormData
                    msg = BytesParser(policy=email_policy.default).parsebytes(
                        b'Content-Type: ' + (self.headers.get('Content-Type') or '').encode() + b'\r\n\r\n' + surove_b)
                    data = {}
                    for cast in msg.iter_parts():
                        jmeno = cast.get_param('name', header='content-disposition')
                        if jmeno and not cast.get_filename():
                            data[jmeno] = (cast.get_payload(decode=True) or b'').decode('utf-8', 'replace')  # prohlížeče posílají UTF-8 bez charsetu
                else:
                    data = {k: v[0] for k, v in parse_qs(surove).items()}
            if not isinstance(data, dict):
                raise ValueError
        except ValueError:
            if html:
                return self.odpoved_html(400, 'Poptávku se nepodařilo přečíst', 'Zkuste to prosím znovu, nebo napište přímo na davidxnavratil@gmail.com.')
            return self.odpoved(400, {'ok': False, 'chyba': 'format'})
        # Podezřelé znaky (vyplněné skryté pole, chybějící čas, odeslání do 3 s od načtení stránky) poptávku jen označí;
        # e-mail přesto odejde s „[ověřit]“ v předmětu, takže se nic neztratí.
        try:
            stari = time.time() * 1000 - float(data['t'])
        except (KeyError, ValueError, TypeError):
            stari = -1
        kontakt = cisty(data.get('zdroj'), 20) == 'kontakt'  # obecný kontakt z úvodní stránky
        robot = bool(cisty(data.get('web') or data.get('_gotcha'), 200))
        rychle = stari < 3000 and not kontakt
        pole = {k: cisty(data.get(k), n, radky=(k == 'message')) for k, (_, n, _) in POLE.items()}
        pole['format'] = FORMATY.get(pole['format'], pole['format'] or 'neuvedeno')
        chybi = [k for k, (_, _, povinne) in POLE.items() if povinne and not pole[k] and not (kontakt and k == 'company')]
        if kontakt and not pole['message']:
            chybi.append('message')
        if chybi or not EMAIL_RE.match(pole['email']):
            if html:
                return self.odpoved_html(422, 'Poptávku se nepodařilo odeslat', 'Chybí jméno, e-mail nebo firma, nebo e-mail nemá správný tvar. Vraťte se prosím zpět a údaje doplňte, případně napište na davidxnavratil@gmail.com.')
            return self.odpoved(422, {'ok': False, 'chyba': 'pole', 'pole': chybi or ['email']})
        z = {'id': time.strftime('%Y%m%d-%H%M%S-') + uuid.uuid4().hex[:6], 'prijato': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
             'pole': pole, 'zdroj': 'kontakt' if kontakt else 'prednasky'}
        if rychle:
            z['podezrela'] = 'odesláno do 3 s od načtení stránky nebo bez času'
        if robot:  # vyplněné skryté pole: může to být robot, ale i správce hesel; nic se nezahazuje, jen se označí
            z['podezrela'] = 'vyplněné skryté pole' + (' a ' + z['podezrela'] if z.get('podezrela') else '')
        try:
            ulozit(z)
        except Exception as e:
            log.error('uložení selhalo: %s', e)
            if html:
                return self.odpoved_html(500, 'Poptávku se nepodařilo uložit', 'Omlouváme se. Napište prosím přímo na davidxnavratil@gmail.com.')
            return self.odpoved(500, {'ok': False, 'chyba': 'ulozeni'})
        log.info('přijata poptávka %s', z['id'])
        # Odpověď hned po uložení; e-mail se posílá na pozadí, aby pomalá pošta nikdy nezdržela návštěvníka.
        threading.Thread(target=self.poslat_na_pozadi, daemon=True).start()
        if html:
            return self.odpoved_html(200, 'Děkujeme, poptávka dorazila', 'Odpověď přijde na e-mail, který jste uvedli.')
        self.odpoved(200, {'ok': True})

    @staticmethod
    def poslat_na_pozadi():
        try:
            zpracovat_frontu()
        except Exception as e:
            log.warning('fronta: %s', e)


if __name__ == '__main__':
    for d in (FRONTA, ODESLANO, PODEZRELE): os.makedirs(d, exist_ok=True)
    if '--znovu' in sys.argv:
        ok, chyba = zpracovat_frontu()
        log.info('opakované odeslání: odesláno %d, ve frontě zůstává %d, smazáno starých %d', ok, chyba, promazat())
        sys.exit(0)
    log.info('poslouchám na 127.0.0.1:%d', PORT)
    ThreadingHTTPServer(('127.0.0.1', PORT), Obsluha).serve_forever()
