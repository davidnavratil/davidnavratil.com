#!/bin/bash
# Jednorázová noční aktualizace serveru Mozek: záloha, apt full-upgrade (včetně nového jádra), restart.
# Zdroj: davidnavratil.com/server/udrzba/, na serveru /root/udrzba/.
# Spouští ho nocni-aktualizace.timer; po restartu výsledek zkontroluje a pošle e-mailem po-aktualizaci.service.
set -uo pipefail
LOG=/var/log/nocni-aktualizace.log
log() { echo "[$(date -u '+%F %T') UTC] $*" >> "$LOG"; }
log "=== začátek"
log "záloha před aktualizací (mozek-backup)"
if ! systemctl start mozek-backup.service; then
  log "CHYBA: záloha selhala, aktualizaci neprovádím"
  printf 'Subject: Mozek: noční aktualizace NEPROBĚHLA\n\nZáloha před aktualizací selhala, nic jsem neinstaloval. Log: %s\n' "$LOG" | msmtp -a default davidxnavratil@gmail.com
  exit 1
fi
dpkg -l | awk '/^ii/{print $2" "$3}' > /root/udrzba/balicky-pred.txt
export DEBIAN_FRONTEND=noninteractive
apt-get update -q >> "$LOG" 2>&1
apt-get -y -q -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold full-upgrade >> "$LOG" 2>&1
KOD=$?
log "apt full-upgrade skončil s kódem $KOD"
dpkg -l | awk '/^ii/{print $2" "$3}' > /root/udrzba/balicky-po.txt
echo "$KOD" > /root/udrzba/po-aktualizaci.flag
log "restart serveru"
systemctl reboot
