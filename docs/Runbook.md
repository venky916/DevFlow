# DevFlow runbook

What to do when something alerts. Read the alert's section, follow the steps in order, and stop when it is fixed. Deployment details are in `DEPLOY.md`. What each monitoring tool does, and how the pieces connect, is in `docs/MONITORING.md`.

**The server:** one AWS EC2 machine in Sydney. Connect from the folder that holds `devflow.pem`:

```
ssh -i devflow.pem ubuntu@16.176.46.35
cd ~/devflow
```

**The services** (Docker Compose): `api`, `ws`, `workers`, `redis-cache`, `redis-pubsub`, `redis-queue`, `caddy`. The web app runs on Vercel, and the database is Neon.

## Where to look

| What | Where | Used for |
| --- | --- | --- |
| Better Stack | Incidents, then Monitors and Heartbeats | Is it up? Are the workers alive? |
| Sentry | Projects `devflow-api`, `devflow-ws`, `devflow-workers`, `devflow-web` | What broke, with the stack trace |
| Axiom | Datasets `devflow-prod` (app logs) and `devflow-host` (server numbers) | What happened, in order |
| AWS console | EC2 and Billing | The machine, and the credits |
| Vercel | Deployments | The web app |
| Neon | Project `devflow-prod` | The database |

## Alerts

| Alert | From | Means | Go to |
| --- | --- | --- | --- |
| `devflow-api` down | Better Stack | `/health` does not answer, or the answer is not `"status":"ok"` | [Something is down](#something-is-down) |
| `devflow-ws` down | Better Stack | The websocket server does not answer | [Something is down](#something-is-down) |
| `devflow-web` down | Better Stack | The Vercel site does not answer | [The web app is down](#the-web-app-is-down) |
| Workers heartbeat missed | Better Stack | The workers stopped pinging | [The workers are silent](#the-workers-are-silent) |
| New issue (production) | Sentry | An error that has not been seen before | [An error in Sentry](#an-error-in-sentry) |
| Error spike | Axiom | More than 5 `error` lines in 5 minutes | [An error spike](#an-error-spike) |
| Crash | Axiom | A process reported an uncaught exception | [A crash](#a-crash) |
| Low memory or disk | Axiom | Less than 150 MiB of memory free, or the disk over 85% full | [Low memory or disk](#low-memory-or-disk) |
| Budget or credits | AWS email | Spending or credits need a look | [AWS credits](#aws-credits) |

## Something is down

1. Is it real? From your laptop:
   ```
   curl.exe -i https://devflow-api.duckdns.org/health
   curl.exe -i https://devflow-ws.duckdns.org/health
   ```
   Both must answer `200` with `"status":"ok"`.
2. If neither answers, the whole machine may be down. Check that the instance is running in the AWS console (EC2, Instances), and that the credits are not used up.
3. If the machine is up, look at the containers:
   ```
   docker compose ps
   ```
   Every service should say `Up`. A service that says `Restarting` or `Exited` is the problem.
4. Read why it stopped:
   ```
   docker compose logs --tail 100 api
   ```
   (use `ws`, `workers` or `caddy` for the others). The last lines before the stop usually say why.
5. Start it again:
   ```
   docker compose up -d
   ```
6. If the problem started right after a release, roll back to the safety copy:
   ```
   TAG=v2 docker compose up -d
   ```
   Use the tag you made before that release (`DEPLOY.md`, "Rollback").
7. If only `caddy` fails with a certificate error, check that both DuckDNS names still point at `16.176.46.35`.

## The web app is down

1. Open the Vercel dashboard, then Deployments. Is the latest deployment red?
2. If so, open its build log. Fix the error, or redeploy the last good deployment (the three-dot menu, "Redeploy").
3. If the deployment is green, check that `https://dev-flow-blush.vercel.app` opens in a private window.

## The workers are silent

The heartbeat is sent only while every worker is running **and** the queue's Redis answers.

1. ```
   docker compose ps workers
   docker compose logs --tail 100 workers
   ```
   Look for `Heartbeat is failing`, which comes with the reason: a worker is not running, the Redis ping timed out, or the heartbeat service answered with an error.
2. Check Redis:
   ```
   docker compose exec redis-queue redis-cli ping
   ```
   It must answer `PONG`. If not, `docker compose up -d redis-queue`.
3. Restart the workers:
   ```
   docker compose up -d --force-recreate workers
   ```
4. If the logs say the heartbeat service answered `404` or similar, the heartbeat URL in `apps/workers/.env` is wrong or was regenerated. Copy the current URL from Better Stack.
5. A deploy restarts the workers for a minute or so. That is normal and should not alert.

## An error in Sentry

1. Open the issue. Read the title, the stack trace and the tags (`service`, `requestId`).
2. Follow that request through the logs (see [Follow one request](#follow-one-request)).
3. Decide: fix it, ignore it (Sentry's "Ignore" button, for a known harmless error), or note it in the ledger.
4. One failed job reaches Sentry once, after its last attempt, not once per attempt.

## An error spike

1. Open Axiom, dataset `devflow-prod`, and run:
   ```
   ['devflow-prod'] | where level == "error" or level == "fatal" | order by _time desc | take 50
   ```
2. Look for one message repeated many times. That is usually one cause (a down dependency, a bad deploy).
3. Check the `service` field to see which app it is.
4. A burst right after a deploy: roll back (see [Something is down](#something-is-down), step 6).
5. Lots of `Email failed to send`: check the Gmail app password and Gmail's daily limit.

## A crash

1. Find it:
   ```
   ['devflow-prod'] | where msg == "Uncaught exception" or msg == "Unhandled promise rejection" | order by _time desc
   ```
2. The `err.stack` field says where. Docker restarts the container by itself, so check that it came back with `docker compose ps`.
3. Open the matching issue in Sentry. A crash is reported there too, with the same stack.

## Low memory or disk

1. See the numbers:
   ```
   free -m
   df -h /
   docker stats --no-stream
   ```
2. Memory: find the container that grew (in Axiom, dataset `devflow-host`, the `mem_mb` field per container). Restart it: `docker compose up -d --force-recreate <name>`. Swap (2 GB) is the safety net, and heavy swapping makes everything slow.
3. Disk: old Docker images are the usual cause. Remove the unused ones (never `prune -a`, which would delete the rollback copies):
   ```
   docker image prune -f
   ```
4. Still full? `docker system df` shows what uses the space. Container logs are already capped at 10 MB, three files each.

## AWS credits

1. In the AWS console, open Billing, then Credits, and note the balance.
2. If credits are close to the end, stop the instance when you are not demoing, and pause the Better Stack monitors first so the shutdown does not alert.
3. Record the demo video **before** the credits end.

## Follow one request

Every request gets an id. It is in the response header `X-Request-Id`, in the `requestId` field of an error response, and in the `requestId` tag of a Sentry issue.

```
['devflow-prod'] | where requestId == "PASTE_ID" | order by _time asc
```

This shows the API's lines and the workers' lines for that request together.

## Useful commands on the server

```
docker compose ps                         # what is running
docker compose logs --tail 100 -f api     # follow a service's logs (Ctrl+C to stop)
docker compose restart api                # restart (does not re-read the env file)
docker compose up -d --force-recreate api # recreate (re-reads the env file)
docker stats --no-stream                  # memory and CPU per container
TAG=v2 docker compose up -d               # roll back to the safety copy tagged v2
```

## How the alerts are set up

**Better Stack** (email only): three monitors (`devflow-api` and `devflow-ws` check for `"status":"ok"`, `devflow-web` checks that the page answers), and a heartbeat `devflow-workers`. Checks run every 3 minutes, with a confirmation period of 3 minutes.

**Sentry:** each project's alert rule is limited to the `production` environment, so a test on a laptop does not email.

**Axiom** (three monitors, the most the free plan allows, all by email):

| Monitor | Type | Query | Condition | Runs |
| --- | --- | --- | --- | --- |
| Error spike | Threshold | `['devflow-prod'] \| where level == "error" or level == "fatal" \| summarize error_count = count()` | `error_count` at or above 5 | every 5 minutes, over the last 10 minutes |
| Crash | Match | `['devflow-prod'] \| where msg == "Uncaught exception" or msg == "Unhandled promise rejection"` | each matching event | no schedule (it watches events as they arrive), with a delay of 1 second |
| Low memory or disk | Threshold | `['devflow-host'] \| where kind == "host" \| where mem_available_mb < 150 or disk_used_pct > 85 \| summarize problem_count = count()` | `problem_count` at or above 1 | every 5 minutes, over the last 10 minutes |

The host numbers come from `scripts/host-metrics.sh`, which cron runs every 2 minutes on the server. If it stops, the low-memory monitor sees no data and stays quiet, so check the dashboard now and then.

## Dashboard (Axiom, dataset `devflow-prod`)

| Element | Query |
| --- | --- |
| Requests over time | `['devflow-prod'] \| where msg == "request completed" \| summarize count() by bin_auto(_time)` |
| API error rate (%) | `['devflow-prod'] \| where service == "api" and msg == "request completed" \| extend is_error = case(statusCode >= 500, 100.0, 0.0) \| summarize error_rate = avg(is_error) by bin_auto(_time)` |
| Latency, typical and slow | `['devflow-prod'] \| where msg == "request completed" \| summarize percentiles_array(durationMs, 50, 95) by bin_auto(_time)` |
| Recent errors (table) | `['devflow-prod'] \| where level == "error" or level == "fatal" \| order by _time desc \| take 20` |
| Which requests fail (table) | `['devflow-prod'] \| where msg == "request completed" and statusCode >= 400 \| summarize n = count() by statusCode, url \| order by n desc \| take 20` |
| Worker failures (table) | `['devflow-prod'] \| where service == "workers" and msg contains "failed" \| order by _time desc \| take 20` |
| Lines per service and level | `['devflow-prod'] \| summarize n = count() by service, level` |
| Memory available (MiB) | `['devflow-host'] \| where kind == "host" \| summarize min(mem_available_mb) by bin_auto(_time)` |
| Memory per container (MiB) | `['devflow-host'] \| where kind == "container" \| summarize max(mem_mb) by bin_auto(_time), container` |
| Disk used (%) | `['devflow-host'] \| where kind == "host" \| summarize max(disk_used_pct) by bin_auto(_time)` |

A time series element accepts only `take`, `limit` or `top` after its last `summarize`, and the last `summarize` must bin by `_time`. So do the arithmetic **before** the `summarize` (as the error rate does: each request becomes 100 or 0, and the average is the percentage).

After an incident, add a line to the ledger about what happened and what you changed.