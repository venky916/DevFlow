#!/usr/bin/env bash
# Sends the server's health numbers to Axiom (dataset: devflow-host). Cron runs it every 2 minutes.
# Needs: bash, curl, awk, free, df and docker. AXIOM_TOKEN and AXIOM_DATASET come from
# host-metrics.env, which sits next to this script. Errors go to host-metrics.err (last 100 lines).
set -u
export PATH="$PATH:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${HOST_METRICS_ENV:-$DIR/host-metrics.env}"
ERR_FILE="$DIR/host-metrics.err"

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  . "$ENV_FILE"
fi
: "${AXIOM_URL:=https://api.axiom.co}"

now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ -z "${AXIOM_TOKEN:-}" ] || [ -z "${AXIOM_DATASET:-}" ]; then
  echo "$now AXIOM_TOKEN or AXIOM_DATASET is missing in $ENV_FILE" >> "$ERR_FILE"
  exit 1
fi

body="$(mktemp)"
trap 'rm -f "$body"' EXIT

# --- the machine: memory and swap (MiB), disk used (%), load, uptime (seconds)
read -r mem_total mem_available < <(free -m | awk '/^Mem:/ {print $2, $7}')
swap_used="$(free -m | awk '/^Swap:/ {print $3}')"
disk_used_pct="$(df -P / | awk 'NR==2 {gsub("%", "", $5); print $5}')"
read -r load1 _ < /proc/loadavg
uptime_s="$(awk '{print int($1)}' /proc/uptime)"

printf '{"_time":"%s","service":"host","kind":"host","mem_total_mb":%s,"mem_available_mb":%s,"swap_used_mb":%s,"disk_used_pct":%s,"load1":%s,"uptime_s":%s}\n' \
  "$now" "${mem_total:-0}" "${mem_available:-0}" "${swap_used:-0}" "${disk_used_pct:-0}" "${load1:-0}" "${uptime_s:-0}" >> "$body"

# --- one line per container: memory (MiB) and CPU (%). "devflow-api-1" becomes "api".
docker stats --no-stream --format '{{.Name}} {{.MemUsage}} {{.CPUPerc}}' 2>> "$ERR_FILE" | awk -v t="$now" '
  function mib(v,   n, u) {
    n = v + 0; u = v; sub(/^[0-9.]+/, "", u)
    if (u == "GiB") return n * 1024
    if (u == "MiB") return n
    if (u == "KiB" || u == "kB") return n / 1024
    return n / 1048576
  }
  {
    name = $1; sub(/^devflow-/, "", name); sub(/-[0-9]+$/, "", name)
    cpu = $NF; sub(/%/, "", cpu)
    printf "{\"_time\":\"%s\",\"service\":\"host\",\"kind\":\"container\",\"container\":\"%s\",\"mem_mb\":%.1f,\"cpu_pct\":%.2f}\n", t, name, mib($2), cpu
  }' >> "$body"

# --- send. The token goes in through stdin, so it never shows in the process list.
if ! printf 'header = "Authorization: Bearer %s"\n' "$AXIOM_TOKEN" | curl -fsS -m 15 -K - \
  -X POST "$AXIOM_URL/v1/datasets/$AXIOM_DATASET/ingest" \
  -H "Content-Type: application/x-ndjson" --data-binary @"$body" -o /dev/null 2>> "$ERR_FILE"; then
  echo "$now could not send to Axiom" >> "$ERR_FILE"
fi

# keep the error file small
if [ -f "$ERR_FILE" ]; then
  tail -n 100 "$ERR_FILE" > "$ERR_FILE.tmp" && mv "$ERR_FILE.tmp" "$ERR_FILE"
fi