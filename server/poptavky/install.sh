#!/bin/bash
# Instalace příjmu poptávek na Mozek. Spouští se jako root z adresáře s instalačními soubory.
set -euo pipefail
cd "$(dirname "$0")"
Z=/root/nginx-zalohy/poptavky-$(date +%Y%m%d-%H%M%S); mkdir -p "$Z"
cp -p /etc/nginx/sites-enabled/davidnavratil.com /etc/nginx/conf.d/rate-limits.conf /root/backup.sh /etc/msmtprc "$Z/"
chmod 600 "$Z/msmtprc"
id poptavky >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin poptavky
install -d -o poptavky -g poptavky -m 750 /var/lib/poptavky /var/lib/poptavky/fronta /var/lib/poptavky/odeslano /var/lib/poptavky/podezrele
install -d -m 755 /opt/poptavky
install -m 644 server.py /opt/poptavky/server.py
# Služba posílá přes stávající účet msmtp; potřebuje číst jeho nastavení (jen skupina poptavky, ne ostatní).
chgrp poptavky /etc/msmtprc && chmod 640 /etc/msmtprc
install -m 644 poptavky.service poptavky-znovu.service poptavky-znovu.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now poptavky.service poptavky-znovu.timer
grep -q 'zone=poptavka' /etc/nginx/conf.d/rate-limits.conf || printf '\n# Formulář poptávek: průměrně 1 odeslání za minutu z jedné IP, nárazově 3 navíc.\nlimit_req_zone $binary_remote_addr zone=poptavka:10m rate=1r/m;\n' >> /etc/nginx/conf.d/rate-limits.conf
# Konfigurace webu z repozitáře (server/nginx-davidnavratil.com.conf), už obsahuje location /api/poptavka.
KONF=davidnavratil.com.conf; [ -f "$KONF" ] || KONF=../nginx-davidnavratil.com.conf
grep -q 'location = /api/poptavka' "$KONF" || { echo "CHYBA: $KONF neobsahuje /api/poptavka"; exit 1; }
install -m 644 "$KONF" /etc/nginx/sites-enabled/davidnavratil.com
if ! nginx -t 2>/tmp/nginx-t.log; then
  cat /tmp/nginx-t.log; echo "CHYBA nginx, vracím zálohu"
  cp -p "$Z/davidnavratil.com" /etc/nginx/sites-enabled/davidnavratil.com
  cp -p "$Z/rate-limits.conf" /etc/nginx/conf.d/rate-limits.conf
  nginx -t && exit 1
fi
systemctl reload nginx
grep -q '/var/lib/poptavky' /root/backup.sh || sed -i 's|^# Cleanup: keep last 7 days|# Poptávky z webu (fronta i odeslané)\ntar czf "$BACKUP_DIR/poptavky-$DATE.tar.gz" -C /var/lib poptavky 2>/dev/null \|\| true\n\n# Cleanup: keep last 7 days|' /root/backup.sh
echo "Hotovo. Záloha původních souborů: $Z"
systemctl is-active poptavky.service poptavky-znovu.timer
