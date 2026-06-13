# BACKUP — Saubara Meu Market v1.0-safe

**Data:** 13 de junho de 2026  
**Tag git:** `v1.0-safe`  
**Commit:** ver `git log --oneline -1`

---

## Arquivos de backup

| Arquivo | Localização | Conteúdo |
|---|---|---|
| `source-v1.0-safe.tar.gz` | `/home/user/v10-safe/backup/` | Código-fonte completo (sem node_modules/dist) |
| `dist-v1.0-safe.tar.gz` | `/home/user/v10-safe/backup/` | Build de produção compilado |
| `.env.v1.0-safe` | `/home/user/v10-safe/backup/` | Variáveis de ambiente (chmod 600) |
| `turso-snapshot-v1.0-safe.json` | `/home/user/v10-safe/snapshot/` | Dump JSON de todas as tabelas Turso |

## Estado do banco no snapshot

| Tabela | Rows |
|---|---|
| users | 14 |
| sessions | 44 |
| orders | 10 |
| stores | 0 |
| products | 0 |

## Como restaurar

Ver `RECOVERY.md` no mesmo diretório.
