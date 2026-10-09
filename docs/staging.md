# Staging

A private online copy of Sakina that follows `dev`: every merge into `dev` builds the images and deploys them. The team tests there before a release to `main`.

**Status: prepared, switched off.** Nothing is built or deployed until the `STAGING_HOST` variable exists (step 4). Until then the "Staging" workflow shows as skipped.

## How it works

```
merge into dev
  └─ .github/workflows/staging.yml
       1. build web + API images, push to ghcr.io (private, tagged with the commit)
       2. copy deploy/staging/ to the server, write its .env from GitHub secrets
       3. docker compose pull + up --wait   (migrations run first; old version keeps serving if anything fails)
       4. reset the demo accounts (db:seed)
       5. check https://<domain>/api/health, and that the site refuses visitors without the password
```

On the server (`deploy/staging/compose.yaml`): Caddy (HTTPS, password, `noindex`) → web → API → Postgres, plus Mailpit. Only ports 80 and 443 are open.

## Rules

- **Private.** One password in front of everything (site, API, mail inbox). `robots.txt` and `X-Robots-Tag` keep search engines out.
- **No real people.** Only the demo accounts (`amal_dawn`, `leaf_demo`, `still_water`, password `calm-river-22`) and test sign-ups. Never copy production data here.
- **No real email.** The API sends to Mailpit; read it at `https://<domain>/mail`.
- **Own secrets.** Staging never shares a database password or encryption key with production.

## Setup (once, about 30 minutes)

### 1. A server

Any VPS with Ubuntu 24.04, 2 GB RAM (e.g. Hetzner CX22, OVH VPS, DigitalOcean). Note its public IP.

Without a domain, the address is free from sslip.io: for IP `203.0.113.5` use `staging.203-0-113-5.sslip.io` (it points at your IP; Caddy gets a real HTTPS certificate for it). With a domain later: add a DNS `A` record `staging.<domain>` → the IP and change `STAGING_DOMAIN`.

### 2. Prepare it (as root, once)

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443 && ufw --force enable
```

### 3. A deploy key (on your computer)

```bash
ssh-keygen -t ed25519 -f sakina-staging-deploy -C "github-actions staging" -N ""
```

Put the **public** key on the server:

```bash
ssh root@<ip> "mkdir -p /home/deploy/.ssh && cat >> /home/deploy/.ssh/authorized_keys && chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys" < sakina-staging-deploy.pub
```

And note the server's host key (so the deploy refuses an impostor):

```bash
ssh-keyscan -t ed25519 <ip>
```

### 4. GitHub (Settings > Environments > New environment: `staging`)

Environment **secrets**:

| Secret | Value |
| --- | --- |
| `STAGING_SSH_KEY` | the **private** key file `sakina-staging-deploy` (whole file) |
| `STAGING_SSH_KNOWN_HOSTS` | the `ssh-keyscan` output line |
| `STAGING_POSTGRES_PASSWORD` | `openssl rand -hex 24` |
| `STAGING_DATA_ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `STAGING_BASIC_AUTH_PASSWORD` | the password the team types to open staging |

No single quotes (`'`) in these values.

Repository **variables** (Settings > Secrets and variables > Actions > Variables):

| Variable | Value |
| --- | --- |
| `STAGING_DOMAIN` | e.g. `staging.203-0-113-5.sslip.io` |
| `STAGING_HOST` | the server IP. **Setting this switches staging on.** |
| `STAGING_BASIC_AUTH_USER` | optional, default `team` |
| `STAGING_SSH_USER` | optional, default `deploy` |

Then delete the key files from your computer, or keep the private one in a password manager.

### 5. First deploy

Actions > Staging > Run workflow (branch `dev`). After that, every merge into `dev` deploys by itself. The run's summary links to the site.

## Day to day

- **Logs:** `ssh deploy@<ip>`, then `cd sakina-staging && docker compose logs -f api`
- **Reset the database:** `docker compose down -v && docker compose up -d --wait && docker compose run --rm --no-deps seed`
- **Roll back:** Actions > Staging > Run workflow on an older commit of `dev`
- **Switch off:** delete the `STAGING_HOST` variable (the server keeps running until you stop it)

## Tested

The stack was run locally with images built from this branch (`localhost:8443` instead of a domain): health check through Caddy, site closed without the password (401), `robots.txt` and `noindex`, Mailpit at `/mail`, sign-in with the `__Host-` cookie over HTTPS, demo seed, and per-IP rate limits that a faked `X-Forwarded-For` no longer gets around.
