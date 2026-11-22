# Střih úvodního videa „Svět se nemění po kapitolách“: jedna scéna = jeden soubor, pak spojení bez překódování.
# Použití: python3 render.py [id scény ...]   (bez argumentů vyrenderuje všechny a spojí je)
import json, os, subprocess, sys
V = os.path.dirname(os.path.abspath(__file__)) + '/'
Z = '/mnt/user-data/uploads/megatrends/04_vystupy/video_intro/zdroje/'
D = json.load(open(V + 'scenar.json', encoding='utf8'))
ENC = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '30', '-an']
GRADE = 'eq=contrast=1.08:saturation=0.82:brightness=-0.03'
os.makedirs(V + 'sceny', exist_ok=True)


def run(cmd, out):
    tmp = out[:-4] + '.tmp.mp4'
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y'] + cmd + [tmp], capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-2500:]); sys.exit(1)
    os.replace(tmp, out)


def bg(s, extra=''):
    d = s['delka']
    tint = ',colorchannelmixer=rr=1.16:rg=0.04:gg=1.0:bb=0.78:bg=0.02' if s.get('teplota') == 'teplo' else ''
    return (f"[0:v]fps=30,scale=w='1280*(1.0+0.07*t/{d})':h=-2:eval=frame,crop=1280:720,{GRADE}{tint}{extra},vignette=PI/5,noise=alls=5:allf=t,setsar=1,format=rgba[bg]")


def scena(s):
    d, sid = s['delka'], s['id']
    out = V + f'sceny/{sid}.mp4'
    clip = ['-ss', str(s['od']), '-t', str(d + 0.3), '-i', Z + s['klip']]
    png = lambda f: ['-loop', '1', '-framerate', '30', '-t', str(d), '-i', V + f]
    tail = f"format=yuv420p,trim=duration={d}"
    if s.get('typ') == 'uvod':
        cmd = clip + png('o_prechod.png') + png(f'o_{sid}_a.png') + png(f'o_{sid}_b.png') + png('o_znacka.png')
        f = ';'.join([bg(s), '[1:v]format=rgba[g]',
                      f"[2:v]format=rgba,fade=t=in:st=0.35:d=0.6:alpha=1,fade=t=out:st={d - 0.45}:d=0.4:alpha=1[a]",
                      f"[3:v]format=rgba,fade=t=in:st=1.55:d=0.6:alpha=1,fade=t=out:st={d - 0.45}:d=0.4:alpha=1[b]",
                      '[4:v]format=rgba,fade=t=in:st=0.2:d=0.6:alpha=1[k]',
                      '[bg][g]overlay=0:0[x1]', "[x1][a]overlay=x=0:y='max(0,16*(1-(t-0.35)/0.7))':eval=frame[x2]",
                      "[x2][b]overlay=x=0:y='max(0,16*(1-(t-1.55)/0.7))':eval=frame[x3]", '[x3][k]overlay=0:0,fade=t=in:st=0:d=0.5,' + tail])
    elif s.get('typ') == 'zaver':
        cmd = clip + png('o_ztmav.png') + ['-framerate', '30', '-i', V + 'mapa_snimky/m_%03d.png'] + png(f'o_{sid}.png')
        f = ';'.join([bg(s, ',eq=brightness=-0.06'), '[1:v]format=rgba[g]',
                      f"[2:v]format=rgba,scale=560:560,tpad=start_duration=0.3:start_mode=add:color=black@0.0,tpad=stop_mode=clone:stop_duration={d}[m]",
                      f"[3:v]format=rgba,fade=t=in:st=1.9:d=0.8:alpha=1[t]",
                      '[bg][g]overlay=0:0[x1]', '[x1][m]overlay=x=56:y=80:shortest=0[x2]',
                      "[x2][t]overlay=x=0:y='max(0,14*(1-(t-1.9)/0.8))':eval=frame[x3]",
                      f"[x3]fade=t=out:st={d - 0.9}:d=0.9," + tail])
    else:
        cmd = clip + png('o_prechod.png') + png(f'o_{sid}.png') + png('o_znacka.png')
        f = ';'.join([bg(s), '[1:v]format=rgba[g]',
                      f"[2:v]format=rgba,fade=t=in:st=0.4:d=0.55:alpha=1,fade=t=out:st={d - 0.5}:d=0.42:alpha=1[t]",
                      '[3:v]format=rgba[k]', '[bg][g]overlay=0:0[x1]',
                      "[x1][t]overlay=x=0:y='max(0,18*(1-(t-0.4)/0.7))':eval=frame[x2]", '[x2][k]overlay=0:0,' + tail])
    run(cmd + ['-filter_complex', f] + ENC, out)
    return out


ids = [a for a in sys.argv[1:] if not a.startswith('--')] or [s['id'] for s in D['sceny']]
for s in D['sceny']:
    if s['id'] in ids:
        print('scéna', s['id'], scena(s))
if not sys.argv[1:] or '--spojit' in sys.argv:
    for nazev, vyber in (('svet-se-nemeni-po-kapitolach.mp4', D['sceny']), ('svet-se-nemeni-po-kapitolach-kratka.mp4', [s for s in D['sceny'] if s.get('kratka')])):
        with open(V + 'sceny/seznam.txt', 'w') as fh:
            for s in vyber:
                fh.write(f"file '{V}sceny/{s['id']}.mp4'\n")
        run(['-f', 'concat', '-safe', '0', '-i', V + 'sceny/seznam.txt', '-c', 'copy', '-movflags', '+faststart'], V + nazev)
        print('hotovo', nazev, len(vyber), 'scén')
