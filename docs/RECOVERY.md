# RECOVERY — Saubara Meu Market v1.0-safe

Guia completo de restauração a partir do backup `v1.0-safe`.

---

## Cenário 1: Restaurar código-fonte

```bash
# Extrair código
tar -xzf /home/user/v10-safe/backup/source-v1.0-safe.tar.gz -C /home/user/

# Instalar dependências
cd /home/user/saubara-meu-market-app
bun install

# Restaurar .env
cp /home/user/v10-safe/backup/.env.v1.0-safe packages/server/.env
chmod 600 packages/server/.env
```

## Cenário 2: Restaurar build de produção

```bash
# Extrair dist
tar -xzf /home/user/v10-safe/backup/dist-v1.0-safe.tar.gz \
    -C /home/user/saubara-meu-market-app/

# Confirmar conteúdo
ls /home/user/saubara-meu-market-app/dist/
```

## Cenário 3: Restaurar via git tag

```bash
cd /home/user/saubara-meu-market-app

# Listar tags disponíveis
git tag -l

# Restaurar v1.0-safe
git checkout v1.0-safe

# Ou criar branch a partir da tag
git checkout -b restore/v1.0-safe v1.0-safe
```

## Cenário 4: Restaurar dados do banco

O snapshot está em `/home/user/v10-safe/snapshot/turso-snapshot-v1.0-safe.json`.

```bash
# Ver conteúdo do snapshot
cat /home/user/v10-safe/snapshot/turso-snapshot-v1.0-safe.json | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Meta:', d['_meta'])
for t, rows in d.items():
    if t != '_meta':
        print(f'{t}: {len(rows)} rows')
"
```

Para reinserir dados, use o cliente Turso com o snapshot JSON como fonte.

## Cenário 5: Rebuild completo

```bash
cd /home/user/saubara-meu-market-app

# 1. Instalar deps
bun install

# 2. Rebuild frontend
bun run build

# 3. Rodar servidor
cd packages/server
bun run src/server.ts
```

## Cenário 6: Reiniciar servidor em produção

```bash
# Se usando tmux
tmux new-session -ds saubara-server \
  "cd /home/user/saubara-meu-market-app/packages/server && bun run src/server.ts 2>&1 | tee /tmp/server.log"

# Verificar
curl http://localhost:3000/api/health
```

---

## Variáveis de ambiente obrigatórias

| Variável | Descrição |
|---|---|
| `TURSO_DATABASE_URL` | URL do banco Turso |
| `TURSO_AUTH_TOKEN` | Token de autenticação Turso |
| `NODE_ENV` | Deve ser `production` |
| `PORT` | Porta do servidor (padrão 3000) |
| `SESSION_SECRET` | 256-bit — protege cookies |
| `HMAC_SECRET` | 256-bit — protege rotas admin |
| `PEPPER` | 256-bit — hash de senhas argon2id |
| `RESEND_API_KEY` | Chave Resend para emails |
| `ALLOW_MEMORY_FALLBACK` | `true` para dev sem R2/S3 |

### Variáveis opcionais (ativar R2/S3 persistente)

| Variável | Descrição |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | R2 Access Key |
| `R2_SECRET_ACCESS_KEY` | R2 Secret Key |
| `R2_BUCKET` | Nome do bucket |
