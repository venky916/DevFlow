# DevFlow: deployment runbook

How DevFlow is deployed and how to operate it, written from the real deploy (November 2026).

Commands are labelled with where they run:

- **[laptop]**: Windows cmd, from the repo root unless noted
- **[server]**: the EC2 server, over SSH, inside `~/devflow`

Never put real secrets in this file. Secrets live in the `apps/*/.env` files, which are not in git.

---

## 1. What runs where

| Piece | Where | Address / notes |
|---|---|---|
| Web (Next.js) | Vercel | https://dev-flow-blush.vercel.app |
| API | EC2, container `api` | https://devflow-api.duckdns.org (through Caddy) |
| Websocket server | EC2, container `ws` | wss://devflow-ws.duckdns.org (the web app does not use it yet) |
| Background workers | EC2, container `workers` | activity log, notifications, email, file cleanup |
| Redis x3 | EC2, containers | cache, queue, pub/sub. No published ports. |
| HTTPS | EC2, container `caddy` | Let's Encrypt certificates, renewed automatically |
| Database | Neon (Singapore) | currently shared by dev and production (see section 9) |
| Files | Cloudflare R2 | one private and one public bucket |
| Sign-in | Firebase | |
| Email | Gmail through nodemailer, inside the workers | |
| Names | DuckDNS | two names pointing at the server's Elastic IP |

The release flow:

```
laptop: docker compose build  ->  docker compose push  ->  Docker Hub
server: docker compose pull   ->  docker compose up -d
```

The images contain the code but **no secrets**. The `.env` files are copied to the server separately, and Docker Compose gives them to a container when it starts.

## 2. Compose files

| File | Used for |
|---|---|
| `docker-compose.dev.yml` | Daily coding on the laptop. Mounts the source, reloads on edits, publishes Redis ports. |
| `docker-compose.yml` | Testing the production build on the laptop, and **building and pushing** the images |
| `docker-compose.server.yml` | Runs on the server. Pulls images only, no `build:`. Has Caddy, restarts and log limits. It is copied to the server as `docker-compose.yml`. |

Image names: `venkateshmaliga/devflow-api`, `venkateshmaliga/devflow-ws`, `venkateshmaliga/devflow-workers`. Keep the three Docker Hub repositories **Public**, or the server cannot pull them.

## 3. One-time setup

### 3.1 AWS

1. Region: the account's assigned region (Sydney, `ap-southeast-2`).
2. Launch an EC2 instance: name `devflow`, Ubuntu Server LTS (x86_64), type **t3.small** (2 GB), a new key pair `devflow.pem`, storage **20 GiB gp3**.
3. Security group, inbound: SSH (22), HTTP (80), HTTPS (443). Nothing else. SSH is currently open to everyone and protected only by the key (see section 9).
4. Allocate an **Elastic IP** and associate it with the instance, so the address survives a stop and start. Release it if the instance is ever deleted, because an idle address still costs money.
5. Optional: enable termination protection on the instance.

### 3.2 DuckDNS

Create two names (`devflow-api` and `devflow-ws`), both pointing at the Elastic IP. Check:

```
[laptop] nslookup devflow-api.duckdns.org
[laptop] nslookup devflow-ws.duckdns.org
```

### 3.3 Server

```
[laptop] cd %USERPROFILE%\Downloads            (the folder that has devflow.pem)
[laptop] icacls devflow.pem /inheritance:r
[laptop] icacls devflow.pem /grant:r "%USERNAME%:R"
[laptop] ssh -i devflow.pem ubuntu@<ELASTIC_IP>
```

Then on the server:

```
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Log out and back in (so the Docker group applies), then check:

```
docker run --rm hello-world
docker compose version
free -h            (Swap should show 2.0Gi)
```

### 3.4 Production env files

Copy `apps/api/.env`, `apps/ws/.env` and `apps/workers/.env` to a folder outside the repo, for example `%USERPROFILE%\prod-env\` as `api.env`, `ws.env` and `workers.env`. Edit the **copies**. Variable names only:

| File | Variables |
|---|---|
| `api.env` | `PORT`, `NODE_ENV`, `BASE_WEB_URL`, `DATABASE_URL` (pooled), `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `REDIS_CACHE_URL`, `REDIS_QUEUE_URL`, `REDIS_PUBSUB_URL`, `STORAGE_*` |
| `ws.env` | `PORT`, `NODE_ENV`, `DATABASE_URL`, `FIREBASE_*`, `REDIS_PUBSUB_URL` |
| `workers.env` | `NODE_ENV`, `BASE_WEB_URL`, `EMAIL_LOGO_URL` (optional), `DATABASE_URL`, `REDIS_QUEUE_URL`, `REDIS_PUBSUB_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `STORAGE_*` |

Rules for the values:

- `NODE_ENV=production`
- `BASE_WEB_URL` is the exact Vercel address, with no trailing slash
- Redis addresses use the Docker service names: `redis://redis-cache:6379`, `redis://redis-queue:6379`, `redis://redis-pubsub:6379`
- `DIRECT_URL` is **not** needed on the server. It is only for running migrations from the laptop.

### 3.5 Images

```
[laptop] docker login -u venkateshmaliga          (password: a Docker Hub access token with Read and Write)
[laptop] docker compose build api ws workers
[laptop] docker compose push api ws workers
```

Check that no secret is inside an image. This should print nothing, or only `.env.example`:

```
[laptop] docker run --rm --entrypoint sh venkateshmaliga/devflow-api -c "find /app -name '.env*' -not -path '*/node_modules/*'"
```

### 3.6 Copy the files to the server

From the folder that has `devflow.pem`:

```
[laptop] ssh -i devflow.pem ubuntu@<ELASTIC_IP> "mkdir -p ~/devflow/apps/api ~/devflow/apps/ws ~/devflow/apps/workers"

[laptop] scp -i devflow.pem "<REPO_PATH>\docker-compose.server.yml" ubuntu@<ELASTIC_IP>:~/devflow/docker-compose.yml
[laptop] scp -i devflow.pem "<REPO_PATH>\Caddyfile" ubuntu@<ELASTIC_IP>:~/devflow/Caddyfile

[laptop] scp -i devflow.pem "%USERPROFILE%\prod-env\api.env" ubuntu@<ELASTIC_IP>:~/devflow/apps/api/.env
[laptop] scp -i devflow.pem "%USERPROFILE%\prod-env\ws.env" ubuntu@<ELASTIC_IP>:~/devflow/apps/ws/.env
[laptop] scp -i devflow.pem "%USERPROFILE%\prod-env\workers.env" ubuntu@<ELASTIC_IP>:~/devflow/apps/workers/.env
```

On the server, lock the env files and start everything:

```
cd ~/devflow
chmod 600 apps/*/.env
docker compose pull
docker compose up -d
docker compose ps
```

Check from the laptop (the first call can take a minute while Caddy gets certificates):

```
curl https://devflow-api.duckdns.org/health
curl https://devflow-ws.duckdns.org/health
```

### 3.7 Frontend on Vercel

Import the GitHub repo. Settings: framework Next.js, **Root Directory `apps/web`**, keep "include source files outside the Root Directory" enabled.

Environment variables (all `NEXT_PUBLIC_*`, so they are baked into the build and a change needs a **redeploy**):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://devflow-api.duckdns.org/api/v1` |
| `NEXT_PUBLIC_WS_URL` | `wss://devflow-ws.duckdns.org` |
| `NEXT_PUBLIC_APP_URL` | the Vercel address |
| `NEXT_PUBLIC_FIREBASE_*` | the six Firebase web values |

Do not put backend secrets in Vercel.

### 3.8 Connect the pieces

1. Server: set `BASE_WEB_URL` to the Vercel address in `api.env` and `workers.env`, copy them again, then recreate the containers (section 4.2). Without it, CORS blocks the web app.
2. Firebase Console, Authentication, Settings, **Authorized domains**: add the Vercel domain (domain only, no `https://`).
3. R2: each bucket needs a CORS rule so the browser can upload and download. It is currently open to all origins (see section 9).

### 3.9 Test

Sign in, open a workspace and project, create an issue, drag a card, post a comment, upload a file, invite someone by email. On the server: `docker compose logs -f api`.

## 4. Operating it

### 4.1 Release a new version

```
[laptop] docker compose build api ws workers
[laptop] docker compose push api ws workers
[server] docker compose pull
[server] docker compose up -d
[server] docker image prune -f              (removes old images, frees disk)
```

Tag releases so you can go back. On the laptop: `set TAG=v2`, then build and push. On the server: `TAG=v2 docker compose up -d`. Roll back with an older tag, for example `TAG=v1 docker compose up -d`.

### 4.2 Change an env value

A running container keeps the env it was created with. `docker compose restart` does **not** reload it. Edit the laptop copy, copy it again with `scp`, then:

```
[server] chmod 600 apps/*/.env
[server] docker compose up -d --force-recreate api workers      (name the services that read the value)
```

To see which variable **names** a container has (no values):

```
[server] docker compose exec api sh -c 'printenv | cut -d= -f1 | sort'
```

### 4.3 Logs and health

```
docker compose ps
docker compose logs -f api
docker compose logs --tail 100 workers
docker compose logs --since 10m api ws workers
docker stats --no-stream
free -h
df -h /
```

At idle the seven containers use about 560 MiB of RAM, and the server shows about 1.0 GiB used out of 1.9 GiB, with swap almost untouched.

### 4.4 Reboot test

Proves that the containers come back by themselves after a restart (`restart: unless-stopped`), that the certificates and the queue data survive (they live in Docker volumes), and that swap returns (the `fstab` line).

```
[server] sudo reboot
(wait about a minute)
[laptop] ssh -i devflow.pem ubuntu@<ELASTIC_IP>
[server] cd ~/devflow && docker compose ps
[server] free -h
[laptop] curl https://devflow-api.duckdns.org/health
```

### 4.5 Database migrations

From the laptop, against the database you want to change. The quotes are needed because the URL contains `&`:

```
[laptop] set "DIRECT_URL=<direct connection string>"
[laptop] pnpm --filter @devflow/db exec prisma migrate status
[laptop] pnpm --filter @devflow/db exec prisma migrate deploy
```

Close the cmd window afterward so the variable disappears.

### 4.6 Save credits

Stopping the instance saves the server hours. The disk and the Elastic IP still cost money. The containers start by themselves after a start. Check Billing, Credits about once a week.

### 4.7 Keep the OS updated

```
[server] sudo apt-get update && sudo apt-get upgrade -y
```

## 5. Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| CORS error in the browser console | `BASE_WEB_URL` is not the exact web address, or the containers were not recreated | Fix it, then `docker compose up -d --force-recreate api workers` |
| Sign-in popup says "unauthorized domain" | The domain is not in Firebase's authorized list | Add it |
| API calls return 500 and the logs say a table does not exist | The database has no tables | Run `prisma migrate deploy` (section 4.5) |
| API calls return 401 | The Firebase project differs between the web and the server | Compare the project ids |
| Upload fails with a CORS error | The R2 bucket has no matching CORS rule | Add one |
| Certificate error | DNS does not point at the server yet, or ports 80 and 443 are closed | `docker compose logs caddy` |
| 502 Bad Gateway | The container behind Caddy is not running | `docker compose ps` |
| `pull` says "denied" or "not found" | A Docker Hub repository is private, or the name differs | Make it Public, check the name |
| A container keeps restarting | A variable is missing | `docker compose logs <name>`, the error names it |
| "no configuration file provided" | You are not in `~/devflow` | `cd ~/devflow` |
| SSH says the key is unprotected | Windows permissions on the `.pem` file | Run the two `icacls` lines from section 3.3 |
| `ws` and `workers` print nothing | The logger probably hides info lines in production | Check with `docker compose ps` and `docker inspect -f "{{.Name}} restarts={{.RestartCount}}" $(docker ps -q)` |

## 6. Costs and the AWS free plan

- The account is on the AWS Free plan with credits and a 6-month window. When the credits or the window end, the account can close, so check Billing, Credits regularly.
- Rough monthly cost (my estimate): t3.small about $19, public IPv4 about $3.65, 20 GiB disk a few dollars, about $25 in total. The server is billed by the hour whatever its load.
- A t3.micro (1 GiB) would not fit the stack comfortably, because the system already uses about 1.0 GiB.

## 7. Files that must never be committed

`apps/*/.env`, `packages/db/.env`, `devflow.pem`, the `prod-env` folder, and any Docker Hub or Vercel token.

## 8. What is not done yet

- Websocket integration in the web app (the `ws` container runs, but nothing connects to it)
- CI/CD and automated tests
- Monitoring (uptime check, Sentry, log search)
- Separate dev and production databases
- Credential rotation

## 9. Known limitations and security notes

- **SSH is open to the internet** and protected only by the key file. To be tightened with CI/CD.
- **Dev and production share one database** (Neon, Singapore). The plan is two separate projects: dev stays in Singapore, a new empty production project in the same region as the server.
- **Credentials need rotating** (Neon, the Firebase private key, Redis Cloud, R2, Gmail, Resend), because they were exposed during development.
- **R2 CORS allows all origins.** Tighten it to the web address and localhost.
- The web app logs the Firebase token to the browser console (`lib/axios.ts`). Remove it before recording a demo or adding error tracking.
- Redis has no password and no published ports. It is reachable only inside the Docker network.
- The images run the TypeScript source with `tsx`. A bundled build would be smaller.