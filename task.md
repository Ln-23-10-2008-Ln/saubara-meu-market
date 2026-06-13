# Saubara Meu Market — Auditoria & Correções Pre-Launch

## STATUS GERAL
- Banco: Turso conectado (libsql://saubara-meu-market-db...) ✅
- Servidor: Porta 3000 rodando ✅
- Frontend: Vite porta 4200 rodando ✅
- Admin login: funciona via smm_session cookie ✅
- Produtos: 44 produtos via /api/products ✅
- Registro: funciona ✅

## BUGS IDENTIFICADOS

### CRÍTICOS (bloqueiam funcionalidade)
1. **B1 — /api/admin/stats retorna `{stats:...}` mas frontend espera `{data:...}`**
   - `fetchAdminStats()` verifica `json.success && json.data` → sempre null
   - Fix: corrigir admin-routes.ts para retornar `{success, data:{...stats}}`

2. **B2 — /api/admin/users retorna `{users:[...]}` mas frontend espera `{data:{users:[...]}}`**
   - `fetchAdminUsers()` verifica `json.data` → sempre null
   - Também: frontend mapeia `u.emailVerified` mas backend envia `email_verified`
   - Fix: corrigir wrapper + mapeamento snake_case

3. **B3 — Admin login via /api/admin/login não cria smm_session cookie**
   - Retorna `{success, token}` HMAC mas não seta cookie → admin dashboard fica sem sessão
   - Fix: /api/admin/login deve também criar sessão de cookie

4. **B4 — /api/admin/metrics 404** (não existe, frontend pode chamar)
   - Fix: criar alias ou remover referências

### MÉDIOS (degradam UX mas não bloqueiam)
5. **B5 — Upload retorna 501** — nenhuma configuração R2/S3 → imagens de produto/loja impossíveis
   - Solução curto prazo: upload base64 local ou Unsplash placeholder

6. **B6 — /api/auth/register retorna `{success:true, error:null}` (error sempre null)**
   - Deveria retornar sem campo error quando sucesso

7. **B7 — admin.tsx usa /api/admin/login para token mas não para cookie session**
   - Admin dashboard pode não reconhecer usuário como autenticado via `requireAdmin`

### MENORES
8. **B8 — CSP header ausente** (P2 pendente)
9. **B9 — Bundle 1.2MB** (code splitting parcial já feito)

## PLANO DE CORREÇÃO
- [x] Diagnóstico completo
- [ ] B1: Fix /api/admin/stats response format
- [ ] B2: Fix /api/admin/users response format + snake_case mapping
- [ ] B3: Fix admin login → também seta smm_session
- [ ] B4: Add /api/admin/metrics (alias de /stats)
- [ ] B6: Fix register response
- [ ] Validação completa: login, register, admin dashboard, seller dashboard, products
- [ ] Build de produção
- [ ] Relatório final

## PERCENTUAL DE CONCLUSÃO
- Backend auth: 95%
- Admin panel: 60% (bugs de response format)
- Frontend auth: 85%
- Produtos: 90% (dados hardcoded, sem CRUD real)
- Upload: 10% (stub 501)
- Build prod: 100%
- **GERAL: ~72%**
