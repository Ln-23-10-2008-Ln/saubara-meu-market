FROM oven/bun:1.1-alpine

WORKDIR /app

# Instalar dependências de sistema necessárias para o build
RUN apk add --no-cache python3 make g++

# Copiar arquivos de dependências
COPY package.json bun.lockb* ./
COPY packages/server/package.json ./packages/server/
COPY packages/web/package.json ./packages/web/

# Instalar dependências
RUN bun install --frozen-lockfile

# Copiar código fonte
COPY . .

# Build do frontend (garante que o dist/ em produção é gerado aqui)
RUN bun run build

# Expor porta
EXPOSE 3000

# Iniciar servidor
CMD ["bun", "run", "packages/server/src/server.ts"]
