#!/bin/bash
# Po restartu: zkontroluje služby a web a pošle souhrn e-mailem. Běží jen když existuje flag z nocni-aktualizace.sh.
set -uo pipefail
F=/root/udrzba/po-aktualizaci.flag
[ -f "$F" ] || exit 0
KOD=$(cat "$F"); rm -f "$F"
sleep 90   # Docker a kontejnery potřebují chvíli po startu
OK=1; R=""
for s in nginx docker fail2ban ufw poptavky poptavky-znovu.timer certbot.timer mozek-backup.timer r2r-mcp; do
  st=$(systemctl is-active "$s"); R="$R$s: $st\n"; [ "$st" = active ] || OK=0
done
for c in n8n docker-r2r-1 docker-postgres-1; do
  st=$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null || echo chybi); R="$R kontejner $c: $st\n"; [ "$st" = running ] || OK=0
done
for u in https://davidnavratil.com/ https://davidnavratil.com/prednasky/ https://davidnavratil.com/analyses/hormuz/; do
  c=$(curl -s -o /dev/null -w '%{http_code}' -m 20 "$u"); R="$R$u: $c\n"; [ "$c" = 200 ] || OK=0
done
Z=$(curl -s -m 10 https://davidnavratil.com/api/poptavka/zdravi); R="${R}poptávky: $Z\n"
echo "$Z" | grep -q '"ok": true' || OK=0
ZMENY=$(diff /root/udrzba/balicky-pred.txt /root/udrzba/balicky-po.txt | grep -c '^>')
[ "$KOD" = 0 ] || OK=0
if [ $OK = 1 ]; then P="v pořádku"; else P="POZOR, něco nesedí"; fi
printf 'Subject: Mozek: noční aktualizace %s\n\nApt upgrade: kód %s, aktualizováno balíčků: %s\nJádro: %s\n\n%b\nLog: /var/log/nocni-aktualizace.log\n' \
  "$P" "$KOD" "$ZMENY" "$(uname -r)" "$R" | msmtp -a default davidxnavratil@gmail.com
echo "[$(date -u '+%F %T') UTC] kontrola po restartu: $P" >> /var/log/nocni-aktualizace.log
