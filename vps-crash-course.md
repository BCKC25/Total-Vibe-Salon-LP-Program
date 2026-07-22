# VPS Crash Course — Total Vibe Salon Loyalty App

This is written for someone who has never managed a server before. It assumes the stack we already built: Docker Compose running Next.js + Postgres, no Vercel, no Supabase.

**Note:** this doc was originally written for setting up a brand-new
droplet for the Elevate Aiken pilot. For Total Vibe Salon, the plan is
to reuse that same existing droplet rather than provision a new one —
so sections 1–4 below (picking a provider, SSH keys, creating the
server, first login) don't apply this time; skip to section 5 onward
for the actual app deployment steps once the droplet side is sorted
out together.

## 1. What a VPS actually is

A VPS (Virtual Private Server) is a computer you rent, sitting in a data center, that's on 24/7. You get a public IP address and full control (like a fresh laptop with no screen — you only talk to it over SSH). Unlike shared hosting, nothing else runs on it but what you put there.

For this project, one small VPS is plenty — the loyalty app is lightweight (a handful of API routes and a small Postgres database).

## 2. Picking a provider

Any of these work fine and cost roughly $5–12/month for a box big enough for this app:

- **DigitalOcean** — cleanest beginner docs, "Droplets," predictable pricing
- **Hetzner** — cheapest for the specs, slightly more technical UI
- **Linode/Akamai** — similar to DigitalOcean

Recommendation for a first server: DigitalOcean's cheapest "Droplet" (1GB–2GB RAM). You can resize later if needed.

When creating it, choose:
- **Image**: Ubuntu 24.04 LTS
- **Authentication**: SSH key (not password) — see step 3

## 3. SSH keys (do this before creating the server)

An SSH key is a password replacement that's much harder to break into. On your own Mac/PC:

```bash
ssh-keygen -t ed25519 -C "total-vibe-vps"
```

Press enter through the prompts (default file location, optional passphrase). This creates two files: a private key (never share it) and `~/.ssh/id_ed25519.pub` (safe to share — paste this into the provider's "SSH keys" field when creating the server).

Then connect:

```bash
ssh root@YOUR_SERVER_IP
```

## 4. First-time server setup

Once you're in via SSH, run this once:

```bash
# Update the OS
apt update && apt upgrade -y

# Create a non-root user (best practice — don't run everything as root)
adduser deploy
usermod -aG sudo deploy

# Copy your SSH key to the new user so you can log in as them too
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Basic firewall — only allow SSH, HTTP, HTTPS
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

From now on, log in as `ssh deploy@YOUR_SERVER_IP` instead of root.

## 5. Installing Docker

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
```

Log out and back in for the group change to apply. Test it:

```bash
docker run hello-world
```

## 6. Getting the app onto the server

Push the project to a private GitHub repo from your own machine first (once, from the folder with `CLAUDE.md` in it):

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/loyalty-punch.git
git push -u origin main
```

Then on the server:

```bash
git clone https://github.com/YOUR_USERNAME/loyalty-punch.git
cd loyalty-punch
```

You'll need a `.env` file on the server with real secrets (database password, session password, etc.) — copy `.env.example` if the repo has one, fill in real values, and **never commit this file to git**.

Then:

```bash
docker compose up --build -d
```

The `-d` runs it in the background. Run the migration once, same as locally:

```bash
docker compose exec db psql -U totalvibe -d totalvibe -f /migrations/001_init.sql
```

At this point the app is running on the server, but only reachable at `http://YOUR_SERVER_IP:3000` — no HTTPS yet, and using an IP instead of a real domain.

## 7. Domain + HTTPS with Caddy

Point your domain's DNS at the server first (an "A record" pointing to the server's IP — done in whatever service you bought the domain from, e.g. Namecheap, Cloudflare, Google Domains).

Caddy is the easiest way to get free, automatic HTTPS. Add it as another service in `docker-compose.yml`:

```yaml
services:
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on:
      - app

volumes:
  caddy_data:
```

And a `Caddyfile` in the repo root:

```
totalvibesalon.yourdomain.com {
    reverse_proxy app:3000
}
```

Caddy automatically gets a real TLS certificate from Let's Encrypt the first time it starts, and renews it forever — no cron jobs, no manual renewal.

## 8. Keeping it running

Docker's `restart: unless-stopped` (already in the compose file from the scaffold) means containers come back up automatically if the server reboots or a container crashes.

To see what's running:

```bash
docker compose ps
docker compose logs -f app       # follow the app's logs live
docker compose logs -f db        # follow Postgres's logs
```

## 9. Deploying an update

Whenever there's new code to ship:

```bash
cd ~/loyalty-punch
git pull
docker compose up --build -d
```

This rebuilds only what changed and swaps the container with near-zero downtime.

## 10. Backing up the database

This matters more than anything else here — losing the punches/customers table is the one truly bad outcome. Simple daily backup via cron:

```bash
# On the server, edit the crontab
crontab -e
```

Add this line (runs at 3am daily, keeps a dated dump):

```
0 3 * * * docker compose -f /home/deploy/loyalty-punch/docker-compose.yml exec -T db pg_dump -U loyalty loyalty > /home/deploy/backups/loyalty-$(date +\%F).sql
```

Make the backups folder first: `mkdir -p /home/deploy/backups`. Periodically copy these off the server too (download via `scp`, or sync to cheap object storage) — a backup that lives only on the same machine doesn't protect you if the server itself is lost.

## 11. Everyday commands cheat sheet

| Task | Command |
|---|---|
| Log into server | `ssh deploy@YOUR_SERVER_IP` |
| See running containers | `docker compose ps` |
| View live logs | `docker compose logs -f app` |
| Restart everything | `docker compose restart` |
| Stop everything | `docker compose down` |
| Start everything | `docker compose up -d` |
| Deploy new code | `git pull && docker compose up --build -d` |
| Connect to the database directly | `docker compose exec db psql -U loyalty -d loyalty` |

## 12. A few things that will bite you if you skip them

- **Don't skip the firewall** (`ufw`) — an open Postgres port to the internet is a common way small apps get compromised.
- **Don't commit `.env` to git** — it holds real secrets once deployed.
- **Do set up backups on day one**, not "once we have real customers" — that's exactly when losing data would hurt most.
- **Keep the server's OS updated** — `apt update && apt upgrade -y` every so often, or enable unattended-upgrades.
