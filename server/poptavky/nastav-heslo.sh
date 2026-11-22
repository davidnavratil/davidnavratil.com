#!/bin/bash
# Nastaví nové heslo aplikace Gmailu pro odesílání pošty ze serveru (msmtp, účet davidxnavratilxmozek@gmail.com).
# Spouští David sám:  ssh -t root@77.42.84.152 bash /opt/poptavky/nastav-heslo.sh
# Heslo se nikde nevypisuje ani neukládá jinam než do /etc/msmtprc.
set -euo pipefail
read -rsp "Vložte heslo aplikace (16 znaků, mezery nevadí): " P; echo
P=$(printf '%s' "$P" | tr -d ' ')
[ ${#P} -eq 16 ] || { echo "Heslo nemá 16 znaků, nic jsem nezměnil."; exit 1; }
cp -p /etc/msmtprc /etc/msmtprc.zaloha-$(date +%Y%m%d-%H%M%S)
chmod 600 /etc/msmtprc.zaloha-*
awk -v p="$P" '/^password[ \t]/{print "password       " p; next} {print}' /etc/msmtprc > /etc/msmtprc.novy
chgrp poptavky /etc/msmtprc.novy; chmod 640 /etc/msmtprc.novy; mv /etc/msmtprc.novy /etc/msmtprc
unset P
printf 'Subject: Mozek: test odesílání pošty\n\nPokud tohle čtete, server Mozek zase umí posílat e-maily (upozornění na výpadky i poptávky z webu).\n' | msmtp davidxnavratil@gmail.com \
  && echo "Zkušební e-mail odešel na davidxnavratil@gmail.com." \
  || { echo "Odeslání selhalo, zkontrolujte heslo. Původní nastavení je v /etc/msmtprc.zaloha-*"; exit 1; }
systemctl start poptavky-znovu.service
echo "Poptávek čekajících ve frontě: $(ls /var/lib/poptavky/fronta/*.json 2>/dev/null | wc -l)"
