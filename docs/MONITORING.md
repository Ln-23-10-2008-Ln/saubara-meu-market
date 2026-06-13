# MONITORAMENTO V1.0 — Saubara Meu Market

**Início:** 13 de junho de 2026  
**Duração:** 7 dias (até 20/06/2026)  
**Versão:** v1.0

## Checks ativos

| Check | Frequência | Critério OK |
|---|---|---|
| `/api/health` | 60s | HTTP 200 + `status=ok` |
| Servidor processo | Contínuo | tmux `saubara-server` alive |

## Como iniciar monitor

```bash
tmux new-session -ds saubara-monitor \
  "/home/user/saubara-meu-market-app/monitor.sh"
```

## Como ver logs

```bash
tail -f /tmp/monitor-v1.log
```

## Pendências pós-lançamento (semana 1)

| Prioridade | Ação |
|---|---|
| P1 | Verificar domínio Resend (resend.com/domains) |
| P1 | Adicionar R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET ao .env |
| P1 | Aprovar 3 vendedores pendentes (painel /admin) |
| P1 | Seed 44 produtos na tabela `products` do Turso |
| P2 | Corrigir 3 erros TypeScript residuais |
| P2 | Proteger GET /api/orders com autenticação |
