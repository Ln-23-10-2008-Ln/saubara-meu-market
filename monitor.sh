#!/usr/bin/env bash
# monitor.sh — Saubara Meu Market v1.0
# Monitora health a cada 60s e registra log

BASE="http://localhost:3000"
LOG="/tmp/monitor-v1.log"
ALERT_COUNT=0

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG"; }

log "=== MONITOR v1.0 INICIADO ==="

while true; do
  CODE=$(curl -s -o /tmp/hc.json -w "%{http_code}" --max-time 5 "$BASE/api/health" 2>/dev/null)
  STATUS=$(cat /tmp/hc.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'))" 2>/dev/null)

  if [[ "$CODE" == "200" && "$STATUS" == "ok" ]]; then
    ALERT_COUNT=0
    log "✅ OK — /api/health 200"
  else
    ((ALERT_COUNT++))
    log "❌ FALHA [$CODE] — consecutiva: $ALERT_COUNT"
    if (( ALERT_COUNT >= 3 )); then
      log "🚨 ALERTA: servidor down por 3+ ciclos consecutivos"
    fi
  fi

  sleep 60
done
