# DEPLOY — Saubara Meu Market v1.0

Guia de publicação para produção.

---

## Pré-requisitos

- [ ] Node.js 18+ ou Bun 1.x
- [ ] Conta Turso ativa com database provisionada
- [ ] Conta Resend com domínio verificado (`saubarameumarket.com.br`)
- [ ] Cloudflare R2 ou AWS S3 (opcional mas recomendado para uploads persistentes)
- [ ] Servidor VPS ou plataforma de hosting (Railway, Fly.io, Render, VPS própria)

---

## Passo a passo

### 1. Clonar / enviar código

```bash
# Via git
git clone <repo> saubara-meu-market-app
cd saubara-meu-market-app
git checkout v1.0-safe

# Ou extrair backup
tar -xzf source-v1.0-safe.tar.gz
```

### 2. Instalar dependências

```bash
bun install
```

### 3. Configurar variáveis de ambiente

```bash
cp packages/server/.env.example packages/server/.env
# Editar com valores reais
nano packages/server/.env
```

**Variáveis obrigatórias:**
```env
TURSO_DATABASE_URL="libsql://seu-banco.turso.io"
TURSO_AUTH_TOKEN="seu-token"
NODE_ENV=production
PORT=3000
SESSION_SECRET="gerar-256-bit-aleatorio"
HMAC_SECRET="gerar-256-bit-aleatorio"
PEPPER="gerar-256-bit-aleatorio"
RESEND_API_KEY="re_..."
```

**Gerar secrets seguros:**
```bash
openssl rand -hex 32  # executar 3x para SESSION_SECRET, HMAC_SECRET, PEPPER
```

### 4. Build do frontend

```bash
bun run build
# Output: dist/ (servido pelo Hono como estático)
```

### 5. Verificar banco

```bash
# Rodar migrations se necessário
cd packages/server
bun run db:push
```

### 6. Iniciar servidor

```bash
# Direto
cd packages/server
NODE_ENV=production bun run src/server.ts

# Com PM2 (recomendado para VPS)
pm2 start "bun run src/server.ts" --name saubara-market --cwd packages/server
pm2 save
pm2 startup

# Com systemd
# Ver template em docs/saubara-market.service
```

### 7. Verificar healthcheck

```bash
curl https://seudominio.com/api/health
# Esperado: {"status":"ok","emailConfigured":true}
```

---

## Checklist pós-deploy

### Imediato (Dia 1)
- [ ] `GET /api/health` retorna 200
- [ ] Login admin funciona: `admin@saubara.com`
- [ ] Cadastro de novo usuário funciona
- [ ] Listagem de produtos carrega
- [ ] Cookies com atributos corretos (Secure, HttpOnly, SameSite)

### Semana 1
- [ ] Verificar domínio Resend (`saubarameumarket.com.br`) — DNS records em resend.com/domains
- [ ] Configurar R2/S3 e adicionar 4 vars ao `.env`
- [ ] Aprovar 3 vendedores pendentes via painel admin
- [ ] Seed de 44 produtos na tabela `products` do Turso
- [ ] Configurar HTTPS + HSTS no hosting/proxy (Nginx, Cloudflare)
- [ ] Configurar backup automático do Turso

### HTTPS com Nginx (exemplo)
```nginx
server {
    listen 443 ssl;
    server_name saubarameumarket.com.br;

    ssl_certificate /etc/letsencrypt/live/saubarameumarket.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/saubarameumarket.com.br/privkey.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

---

## Credenciais admin

| Campo | Valor |
|---|---|
| Email | `admin@saubara.com` |
| Senha | `admin2024` ← **TROCAR após primeiro acesso** |
| Painel | `/admin` |

---

## Contato técnico

Sistema desenvolvido com: Bun + Hono + React (Vite) + Turso (libSQL/SQLite)  
Autenticação: argon2id + PEPPER + cookies HttpOnly  
Versão: v1.0-safe — 13/06/2026
