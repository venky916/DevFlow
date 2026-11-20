# DevFlow: deployment runbook

How DevFlow is deployed and how to operate it, written from the real deploy (November 2026). A CI/CD pipeline is designed in section 10, and it is not built yet.

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
| Websocket server | EC2, container `ws` | wss://devflow-ws.duckdns.org. Live updates: notifications, board changes, pointers and drag markers, and presence, hints and comments on the issue page. |
| Background workers | EC2, container `workers` | activity log, notifications, email, file cleanup |
| Redis x3 | EC2, containers | cache, queue, pub/sub. No published ports. |
| HTTPS | EC2, container `caddy` | Let's Encrypt certificates, renewed automatically |
| Database | Neon | production: project `devflow-prod` (Sydney). development: project `devflow-dev` (Singapore). |
| Files | Cloudflare R2 | one private and one public bucket |
| Sign-in | Firebase | |
| Email | Gmail through nodemailer, inside the workers | |
| Names | DuckDNS | two names pointing at the server's Elastic IP |
| Logs | Docker, JSON lines | written by pino, rotated at 10 MB x 3 files per container |

The two environments:

| | Development | Production |
|---|---|---|
| Runs on | The laptop: `docker-compose.dev.yml` and `pnpm --filter web dev` | EC2 for the backend, Vercel for the web |
| Database | `devflow-dev` | `devflow-prod` |
| Env files | `apps/*/.env`, `packages/db/.env` | the `prod-env` copies, copied to the server |
| Logs | colored lines | JSON lines |

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
6. Create a monthly budget alert (Billing, Budgets).

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

echo 'cd ~/devflow' >> ~/.bashrc          (optional: every login starts in the right folder)
```

Log out and back in (so the Docker group applies), then check:

```
docker run --rm hello-world
docker compose version
free -h            (Swap should show 2.0Gi)
```

### 3.4 Production env files

Copy `apps/api/.env`, `apps/ws/.env` and `apps/workers/.env` to a folder outside the repo, for example `%USERPROFILE%\prod-env\` as `api.env`, `ws.env` and `workers.env`. Edit the **copies**. They are the master: a file copied to the server replaces the one there, so a change made only on the server is lost the next time. Variable names only:

| File | Variables |
|---|---|
| `api.env` | `SERVICE_NAME`, `PORT`, `NODE_ENV`, `BASE_WEB_URL`, `DATABASE_URL` (pooled), `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `REDIS_CACHE_URL`, `REDIS_QUEUE_URL`, `REDIS_PUBSUB_URL`, `STORAGE_*`, `AXIOM_TOKEN`, `AXIOM_DATASET`, `SENTRY_DSN` |
| `ws.env` | `SERVICE_NAME`, `PORT`, `NODE_ENV`, `DATABASE_URL`, `FIREBASE_*`, `REDIS_PUBSUB_URL`, `AXIOM_TOKEN`, `AXIOM_DATASET`, `SENTRY_DSN` |
| `workers.env` | `SERVICE_NAME`, `NODE_ENV`, `BASE_WEB_URL`, `EMAIL_LOGO_URL` (optional), `DATABASE_URL`, `REDIS_QUEUE_URL`, `REDIS_PUBSUB_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `STORAGE_*`, `AXIOM_TOKEN`, `AXIOM_DATASET`, `SENTRY_DSN`, `HEARTBEAT_URL` |

Rules for the values:

- `NODE_ENV=production`. It switches the logs to JSON.
- `DATABASE_URL` is the **pooled** connection string of `devflow-prod` (the host contains `-pooler` and `ap-southeast-2`).
- `SERVICE_NAME` is `api`, `ws` or `workers`. Every log line carries it, so log tools can tell the apps apart. Without it, lines say `"service":"unknown"`.
- `LOG_LEVEL` is optional (default `info`). Set `debug` only while troubleshooting.
- `BASE_WEB_URL` is the exact Vercel address, with no trailing slash
- Redis addresses use the Docker service names: `redis://redis-cache:6379`, `redis://redis-queue:6379`, `redis://redis-pubsub:6379`
- `DIRECT_URL` is **not** needed on the server. It is only for running migrations from the laptop.
- `AXIOM_TOKEN` is one ingest token for the dataset `devflow-prod`, the same in the three files. `AXIOM_DATASET` is `devflow-prod`. `SENTRY_DSN` is **different** in each file (one Sentry project per app). `HEARTBEAT_URL` is a secret and belongs only in `workers.env`.
- Do **not** add `LOG_FORMAT` or `SENTRY_ENVIRONMENT=development`. Before a release, run `node scripts/check-prod-env.mjs`: it checks the files and prints no values.
- The server also holds `~/devflow/host-metrics.sh` and `~/devflow/host-metrics.env` (its own Axiom token for the dataset `devflow-host`), run by cron every 2 minutes. See `docs/MONITORING.md`.

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

Do not put backend secrets in Vercel. A push to `main` builds the web by itself.

### 3.8 Connect the pieces

1. Server: set `BASE_WEB_URL` to the Vercel address in `api.env` and `workers.env`, copy them again, then recreate the containers (section 4.2). Without it, CORS blocks the web app.
2. Firebase Console, Authentication, Settings, **Authorized domains**: add the Vercel domain (domain only, no `https://`).
3. R2: each bucket needs a CORS rule so the browser can upload and download. The rule lists the web address and `http://localhost:3000`.

### 3.9 Test

Sign in, open a workspace and project, create an issue, drag a card, post a comment, upload a file, invite someone by email. On the server: `docker compose logs -f api`.

The production database is empty, so data from development is not there. Sign up with a new account.

For the live features, use two windows (a normal and a private one) signed in as two different users in the same project:

| Test | Expected |
|---|---|
| Browser Network tab, filter by WS | A connection to `wss://devflow-ws.duckdns.org/?token=...` with a `CONNECTED` message |
| @mention the other user in a comment | Their bell and unread count update without a reload |
| Drag a card | It jumps in the other window. The mover's pointer arrow shows, and the card has a dashed marker until it lands. |
| Open the same issue in both windows | Avatars appear. Typing, editing and uploading show as a hint in the header. Comments appear at once. |
| Upload or delete a file | The other window's list updates |

## 4. Operating it

### 4.1 Release a new version

Check before you start:

- The checks pass: `pnpm -r run lint`, `check-types` and `format:check`.
- `git status` is clean.
- **If the release changes the database,** apply the migration to production first (section 4.5), and only then release the code. A release that changes the database cannot be rolled back by images alone.

**Safety copy first.** An image has names (tags). `latest` moves to the new image when you pull, so the old release would lose its name. Give it a second name before the pull. This adds a name and copies nothing.

```
[server] cd ~/devflow
[server] docker images | grep devflow        (CREATED should say days ago: this is the release to save)
[server] docker tag venkateshmaliga/devflow-api:latest venkateshmaliga/devflow-api:v1
[server] docker tag venkateshmaliga/devflow-ws:latest venkateshmaliga/devflow-ws:v1
[server] docker tag venkateshmaliga/devflow-workers:latest venkateshmaliga/devflow-workers:v1
```

Never run the three tag lines again after the pull: they would move `v1` onto the new release. For the next release use `v2`, and remove an old name you no longer need with `docker rmi venkateshmaliga/devflow-api:v1` (and the other two).

**Build, push, pull, start:**

```
[laptop] docker compose build api ws workers
[laptop] docker compose push api ws workers
[server] docker compose pull
[server] docker compose up -d                (only containers whose image changed are recreated)
[server] docker compose ps                   (all seven Up)
[server] docker compose logs --tail 5 api ws workers
```

`docker images | grep devflow` now shows `latest` and `v1` with **different** IDs. If they are still the same, the pull found nothing new and the push did not include the latest build.

**Then the web.** Merge to `main` after the server is updated. Vercel builds it by itself. The new web needs the new server, and the old web works with the new server, so this order never shows users a broken moment.

```
[laptop] git push
[laptop] git checkout main
[laptop] git merge <branch>
[laptop] git push
```

**Clean up** once the live site is confirmed good:

```
[server] docker image prune -f
```

It removes images that have no name. The `v1` copy is protected. Never use `docker image prune -a`, which would delete the rollback copy.

**Roll back:**

```
[server] TAG=v1 docker compose up -d
[server] docker compose ps                   (the IMAGE column shows :v1)
```

A plain `docker compose up -d` afterward returns to `latest`, because the variable only applied to that command. A rollback restores images, not the database. The web rolls back separately: in Vercel, open the previous successful deployment and choose Promote to Production.

### 4.2 Change an env value

A running container keeps the env it was created with. `docker compose restart` does **not** reload it. Edit the laptop copy in `prod-env`, copy it again with `scp`, then:

```
[server] chmod 600 apps/*/.env
[server] docker compose up -d --force-recreate api workers      (name the services that read the value)
```

To check which variable **names** a container has (no values):

```
[server] docker compose exec api sh -c 'printenv | cut -d= -f1 | sort'
```

### 4.3 Logs and health

Production logs are JSON: one object per line, with `level`, `time`, `service`, `msg` and the fields of the event. Levels: `info` for normal events, `warn` for client errors (4xx) and recoverable problems, `error` for server errors (5xx) and failures. Every API request writes one `request completed` line with `method`, `url`, `statusCode`, `durationMs` and `userId`. `/health` is not logged.

```
docker compose ps
docker compose logs -f api
docker compose logs --tail 100 workers
docker compose logs --since 10m api ws workers
docker stats --no-stream
free -h
df -h /
```

Read the logs in a friendlier form from the laptop:

```
[laptop] ssh -i devflow.pem ubuntu@<ELASTIC_IP> "cd ~/devflow && docker compose logs --no-log-prefix --tail 50 api" | npx pino-pretty
```

Logs are also sent to Axiom (`devflow-prod`) and unexpected errors to Sentry, so you can search them for 30 days. Every request has an id: the `X-Request-Id` header and the `requestId` field in logs and error responses. What each tool does, what alerts you, and what to do about it are in `docs/MONITORING.md` and `docs/RUNBOOK.md`.

For more detail while troubleshooting, set `LOG_LEVEL=debug` in that app's env file, recreate the container (section 4.2), and remove the line afterward.

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

Prisma keeps a table, `_prisma_migrations`, with one row for every migration that has run. `migrate deploy` compares the folder `packages/db/prisma/migrations` with that table and runs only the ones that are missing, in order. It never starts from scratch.

**In development,** after you edit `schema.prisma`:

```
[laptop] cd packages\db
[laptop] pnpm exec prisma migrate dev --name <what_changed>
```

It creates a new migration folder and applies it to `devflow-dev`. Test it, then commit the schema **and** the new migration folder.

**In production,** from the laptop, with the production **direct** connection string. The quotes are needed because the URL contains `&`:

```
[laptop] cd packages\db
[laptop] set "DIRECT_URL=<direct connection string of devflow-prod>"
[laptop] pnpm exec prisma migrate status
[laptop] pnpm exec prisma migrate deploy
[laptop] pnpm exec prisma migrate status
```

Read the `Datasource` line of the first `status`: the host must contain **`ap-southeast-2`**. If it says `ap-southeast-1`, you are about to change the development database. The last `status` must say the database schema is up to date. Close the cmd window afterward so the variable disappears.

Rules:

- Never edit a migration that has already run. Make a new one.
- Never run `migrate dev` or `db push` against production.
- Never change the production schema by hand in the Neon console.
- Apply the migration to production **before** the release that needs it. To remove or rename a column, use two releases: first code that no longer uses it, then the migration.
- Before a risky migration, create a Neon branch of `devflow-prod` (instant, copy-on-write) as a backup, and delete it afterward.

### 4.6 Save credits

Stopping the instance saves the server hours. The disk and the Elastic IP still cost money. The containers start by themselves after a start. Check Billing, Credits about once a week.

### 4.7 Keep the OS updated

```
[server] sudo apt-get update && sudo apt-get upgrade -y
```

### 4.8 Local development

```
[laptop] docker compose -f docker-compose.dev.yml up -d                  start in the background (no logs are printed)
[laptop] docker compose -f docker-compose.dev.yml logs -f --tail 20 api ws workers
[laptop] pnpm --filter web dev
```

| Situation | Command |
|---|---|
| Server code changed and nothing happened (Windows does not always pass file changes into containers) | `docker compose -f docker-compose.dev.yml restart api ws workers` |
| An `.env` file changed | `docker compose -f docker-compose.dev.yml up -d --force-recreate <service>` |
| A `package.json`, lockfile or Dockerfile changed | `docker compose -f docker-compose.dev.yml up -d --build` |
| Check the JSON logging the server will use | `docker compose up -d --build`, read the logs, then `docker compose down` |

Without `-d`, logs stream into the terminal, and Ctrl+C stops the containers.

### 4.9 Check that production is set up correctly

Three checks, from the laptop. None of them prints a secret:

```
[laptop] ssh -i devflow.pem ubuntu@<ELASTIC_IP> "grep -o 'ap-southeast-[0-9]' ~/devflow/apps/*/.env"
[laptop] ssh -i devflow.pem ubuntu@<ELASTIC_IP> "grep SERVICE_NAME ~/devflow/apps/*/.env"
[laptop] ssh -i devflow.pem ubuntu@<ELASTIC_IP> "cd ~/devflow && docker compose logs --tail 3 api ws workers"
```

- The first must print `ap-southeast-2` for the api, ws and workers files. `ap-southeast-1` means a server still points at the development database.
- The second must show `api`, `ws` and `workers`.
- In the third, each line carries `"service":"api"`, `"ws"` or `"workers"`, and `"level"` is a word.

## 5. Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| CORS error in the browser console | `BASE_WEB_URL` is not the exact web address, or the containers were not recreated | Fix it, then `docker compose up -d --force-recreate api workers` |
| Sign-in popup says "unauthorized domain" | The domain is not in Firebase's authorized list | Add it |
| API calls return 500 and the logs say a table does not exist | The database has no tables | Run `prisma migrate deploy` (section 4.5) |
| API calls return 401 | The Firebase project differs between the web and the server | Compare the project ids |
| A person or data from development is missing in production | The production database is separate and started empty | Sign up with a new account |
| Upload fails with a CORS error | The R2 bucket has no matching CORS rule | Add one |
| Certificate error | DNS does not point at the server yet, or ports 80 and 443 are closed | `docker compose logs caddy` |
| 502 Bad Gateway | The container behind Caddy is not running | `docker compose ps` |
| `pull` says "denied" or "not found" | A Docker Hub repository is private, or the name differs | Make it Public, check the name |
| A container keeps restarting | A variable is missing | `docker compose logs <name>`, the error names it |
| "no configuration file provided" | You are not in `~/devflow` | `cd ~/devflow` |
| SSH says the key is unprotected | Windows permissions on the `.pem` file | Run the two `icacls` lines from section 3.3 |
| Log lines say `"service":"unknown"` | `SERVICE_NAME` is missing from that app's env file | Add it to the laptop copy, `scp` it, recreate the container |
| Logs are colored text, not JSON | `NODE_ENV` is not `production` in that env file | Fix it and recreate the container |
| The websocket does not connect | `NEXT_PUBLIC_WS_URL` is not `wss://...`, or Caddy or `ws` is down | Network tab, WS filter. On the server: `docker compose logs --tail 50 ws caddy` |
| The page works but nothing updates live | The socket is connected, but the room join failed | Look for an `ERROR` frame in the Network tab, WS, Messages. The `ws` logs say why. |

## 6. Costs and the AWS free plan

- The account is on the AWS Free plan with credits and a 6-month window. When the credits or the window end, the account can close, so check Billing, Credits regularly. A monthly budget alert exists.
- Rough monthly cost (my estimate): t3.small about $19, public IPv4 about $3.65, 20 GiB disk a few dollars, about $25 in total. The server is billed by the hour whatever its load.
- A t3.micro (1 GiB) would not fit the stack comfortably, because the system already uses about 1.0 GiB.
- Record the demo video and keep the README screenshots current before the credits end.

## 7. Files that must never be committed

`apps/*/.env`, `packages/db/.env`, `devflow.pem`, the `prod-env` folder, and any Docker Hub or Vercel token.

## 8. What is not done yet

- Confirm that `SERVICE_NAME` and the production `DATABASE_URL` are in the server's env files (section 4.9).
- Monitoring is built (`docs/MONITORING.md`). Still open: test every alert, set the Sentry `production` environment on the alerts, upload source maps for the web, and fix the malformed-body error (500 instead of 400).
- CI/CD and automated tests (designed in section 10).
- Decision on forgot-password: Firebase's own email (the API endpoint and email template are unused), or switch to the API's.
- Deleting a single issue does not queue its attachment files for deletion. Deleting an attachment, a project or a workspace does.
- Leftover cleanup: `console.*` calls in the backend and emojis in log messages.
- README with screenshots and a short demo video.

## 9. Known limitations and security notes

- **SSH is open to the internet** and protected only by the key file. To be tightened with CI/CD.
- Credentials were rotated after they were exposed during development, and the old ones were deleted. Redis Cloud and Resend are no longer used.
- Development and production use the same R2 buckets and the same Firebase project. This is acceptable for a demo.
- Redis has no password and no published ports. It is reachable only inside the Docker network.
- The images run the TypeScript source with `tsx`. A bundled build would be smaller.
- A single server: there is no failover.

**Websocket limits:**

- A member who is removed from a project keeps receiving its events until their connection drops.
- Presence, typing hints, pointers and drag markers live in the memory of one ws server, so they work for a single instance only.
- The issue slideover is not in the issue room. It refreshes its fields with the board, but live comments, files and activity are on the full issue page.
- A missed event (a dropped connection) is repaired by a refetch after the reconnect. Events are not replayed.
- The websocket has no origin check and only light rate limits.
- The Firebase token travels in the websocket URL. It is short-lived, and the ws server never logs URLs.

## 10. CI/CD (planned, not built yet)

**Goal:** a push to `main` checks the code, builds the images, releases them to the server and verifies the result, without typing the release steps by hand. The manual steps in section 4.1 are what the pipeline will automate, so they are the script.

**Trigger:** every push to `main` runs all jobs. A pull request runs only the checks.

| Job | Steps |
|---|---|
| **checks** | Check out the code. Set up Node 22 and pnpm 9.0.0. `pnpm install --frozen-lockfile`. Run lint, `check-types`, `format:check`, the tests, and `pnpm --filter web build`. |
| **images** (after checks) | Log in to Docker Hub. Build the three images, tag each with the commit hash and with `latest`, and push them. GitHub's build machines are x86, like the server. |
| **deploy** (after images) | SSH to the server. Write `TAG=<commit hash>` into `~/devflow/.env` (Compose reads it for the image tag). `docker compose pull`, then `docker compose up -d`. Wait until both `/health` addresses answer. If they do not, put the previous tag back and `up -d` again. |

The web is built by Vercel when `main` changes, so no job deploys it.

**Why the commit hash:** every release then has its own tag, so a rollback means choosing an older hash, and the rollback copy (`v1`) no longer has to be made by hand.

**GitHub secrets needed:** `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` (Read and Write), `SSH_HOST`, `SSH_USER`, and `SSH_PRIVATE_KEY` (a key made only for the pipeline, never the personal one).

**SSH access.** GitHub's machines connect from changing addresses, so a rule that allows only your own IP would block a deploy. Choose one when building:

1. Keep port 22 open with key-only login, and add `fail2ban` to block repeated failures.
2. Use AWS Systems Manager, which needs no open port.
3. Let the pipeline open port 22 for its own address for the length of the deploy.

**Migrations:** manual for now (section 4.5), before the release. Later, an optional job that needs a manual approval and uses the production direct URL as a secret.

**Tests to write first:** the issue permission rules and the parent status rule, the comment schema, `renderEmail` with a nasty title (the output must not contain a clickable link from user text), and the board move helper. A few per package is enough to start.

**Done when:** a push to `main` with a small change reaches production by itself, a deliberately broken push stops at the checks, and a failed health check rolls back.