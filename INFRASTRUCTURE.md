# Infrastructure Runbook — davidnavratil.com

> Last updated: 2026-04-03

## Server "Mozek"

| Property | Value |
|---|---|
| IP | 77.42.84.152 |
| OS | Ubuntu 24.04.4 LTS |
| Kernel | 6.8.0-101-generic |
| Disk | 75 GB (41% used) |
| RAM | 7.6 GB |
| SSH | `ssh root@77.42.84.152` (key-only, password disabled) |

## DNS

- **Registrar:** Websupport
- **NS:** Cloudflare (`gene.ns.cloudflare.com`, `todd.ns.cloudflare.com`)
- **A records:** DNS-only (no Cloudflare proxy)
- **Domains:** `davidnavratil.com`, `www.davidnavratil.com`

## Software Stack

| Component | Version | Config |
|---|---|---|
| Nginx | 1.24.0 | `/etc/nginx/sites-available/davidnavratil.com` |
| Node.js | 18.19.1 | `/usr/bin/node` |
| Docker | 29.2.1 | containers below |
| Certbot | 2.9.0 | auto-renewal via systemd timer |

## Web Root

```
/var/www/davidnavratil.com/
├── index.html              # Astro static build (deployed via GitHub Actions)
├── en/                     # English locale
├── analyses/
│   ├── hormuz/             # Vanilla JS (deployed manually)
│   ├── hormuz-energy-simulator/  # Next.js static export
│   ├── qatar-infrastructure/     # Next.js static export
│   ├── ree-dashboard/            # Next.js static export
│   └── uzka-hrdla/               # Next.js static export
├── js/plausible.js         # Self-hosted Plausible script
└── 404.html                # Custom error page
```

## Docker Containers

| Container | Image | Port Binding | Volume |
|---|---|---|---|
| n8n | `n8nio/n8n` | `127.0.0.1:5678` | `/root/n8n-data:/home/node/.n8n` |
| docker-r2r-1 | `sciphiai/r2r:latest` | `127.0.0.1:7272` | user_configs, user_tools |
| docker-postgres-1 | `pgvector/pgvector:pg16` | `127.0.0.1:5432` | `postgres_data` (Docker volume) |
| n8n-api-mcp | — | `127.0.0.1:8100` | — |

All containers bind to `127.0.0.1` (not `0.0.0.0`) to prevent direct internet access.

## Systemd Services

| Service | Description |
|---|---|
| `nginx.service` | Web server |
| `r2r-mcp.service` | Supergateway MCP server (port 3100), auto-restart |
| `docker.service` | Docker daemon |

### r2r-mcp.service

```ini
[Unit]
Description=R2R MCP Server (Supergateway)
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/root/r2r-mcp
ExecStart=/usr/bin/node /usr/local/bin/supergateway --stdio "node index.js" --port 3100 --outputTransport streamableHttp
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## SSL Certificates

| Domain | Expiry | Auto-renew |
|---|---|---|
| `davidnavratil.com` + `www` | 2026-06-25 | Yes (certbot timer) |
| `77.42.84.152.sslip.io` | 2026-06-10 | Yes (certbot timer) |

Check: `certbot certificates`
Force renew: `certbot renew --force-renewal`

## Security

### Firewall (UFW)

```
22/tcp   ALLOW  (SSH)
80/tcp   ALLOW  (HTTP)
443/tcp  ALLOW  (HTTPS)
```

Docker bypass protection via DOCKER-USER chain in `/etc/ufw/after.rules`:
- Allow inter-container traffic (172.16.0.0/12)
- Allow established connections
- DROP everything else

### SSH Hardening

- `PermitRootLogin prohibit-password` (key-only)
- `PasswordAuthentication no`

### Nginx Security Headers

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy: script-src 'self' + SHA-256 hashes` (auto-updated by deploy)
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- `server_tokens off`

### CSP Hash Management

Post-build script `scripts/update-csp-hashes.mjs` extracts SHA-256 hashes of inline scripts from `dist/` and updates nginx CSP on the server. Runs automatically in the GitHub Actions deploy pipeline.

## Cron Jobs

| Schedule | Script | Purpose |
|---|---|---|
| `*/5 * * * *` | `/root/uptime-check.sh` | HTTPS uptime check, email alert to davidxnavratil@gmail.com |
| `0 3 * * *` | `/root/backup.sh` | Daily backup (www, n8n, postgres), 7-day retention |
| `0 4 * * 0` | curl → plausible.js | Weekly Plausible script refresh |

## Backups

### On-server (automatic)

- **Script:** `/root/backup.sh`
- **Location:** `/root/backups/`
- **Contents:** www tarball, n8n-data tarball, postgres dump
- **Retention:** 7 days
- **Schedule:** Daily at 03:00 UTC

### Off-site (manual/scheduled)

- **Script:** `server/pull-backups.sh` (in this repo)
- **Location:** `~/backups/mozek/` on local Mac
- **Retention:** 30 days
- **Usage:** `./server/pull-backups.sh` or add to local crontab

## Deploy Pipeline

### Main site (GitHub Actions)

Trigger: push to `main` or daily at 06:00 UTC.

1. `npm ci`
2. `node scripts/update-rss-cache.mjs` — fetch Substack RSS, commit cache if changed
3. `npm run build` — Astro static build
4. `rsync` to server (dynamically excludes `/analyses/*` subdirectories)
5. `node scripts/update-csp-hashes.mjs` — extract inline script hashes, update nginx CSP

### Analysis projects (manual)

Each analysis has `npm run deploy` which builds + rsync to `/var/www/davidnavratil.com/analyses/<slug>/`.

## Disaster Recovery

### Full server rebuild

1. Provision Ubuntu 24.04 VPS, set up SSH keys
2. Install: `apt install nginx certbot python3-certbot-nginx docker.io docker-compose-v2`
3. Install Node.js 18: `curl -fsSL https://deb.nodesource.com/setup_18.x | bash && apt install nodejs`
4. Restore nginx config: `scp server/nginx-davidnavratil.com.conf root@NEW_IP:/etc/nginx/sites-available/davidnavratil.com`
5. Set up SSL: `certbot --nginx -d davidnavratil.com -d www.davidnavratil.com`
6. Restore backups from `~/backups/mozek/`:
   - `tar xzf www-*.tar.gz -C /var/www/`
   - `tar xzf n8n-*.tar.gz -C /root/`
   - `gunzip -c postgres-*.sql.gz | docker exec -i postgres psql -U postgres`
7. Start Docker containers (n8n, R2R, postgres)
8. Restore cron jobs (see Cron Jobs section above)
9. Set up firewall: `ufw allow 22,80,443/tcp && ufw enable`
10. Configure DOCKER-USER iptables rules in `/etc/ufw/after.rules`
11. Update DNS A record to new IP
12. Deploy latest code: push to main (triggers GitHub Actions)

### Restore single component

- **Web only:** Re-run GitHub Actions deploy, or `tar xzf www-*.tar.gz -C /var/www/`
- **n8n:** `tar xzf n8n-*.tar.gz -C /root/ && docker restart n8n`
- **Postgres/R2R:** `gunzip -c postgres-*.sql.gz | docker exec -i docker-postgres-1 psql -U postgres`
- **Nginx config:** `scp server/nginx-davidnavratil.com.conf root@server:/etc/nginx/sites-available/davidnavratil.com && ssh root@server 'nginx -t && systemctl reload nginx'`

## Key File Locations

| What | Where |
|---|---|
| Nginx config | `/etc/nginx/sites-available/davidnavratil.com` |
| Nginx config (git) | `server/nginx-davidnavratil.com.conf` |
| Web root | `/var/www/davidnavratil.com/` |
| n8n data | `/root/n8n-data/` |
| R2R MCP server | `/root/r2r-mcp/` |
| Backups | `/root/backups/` |
| Backup log | `/var/log/backup.log` |
| Uptime script | `/root/uptime-check.sh` |
| Backup script | `/root/backup.sh` |
| SSL certs | `/etc/letsencrypt/live/davidnavratil.com/` |
| UFW after-rules | `/etc/ufw/after.rules` |
