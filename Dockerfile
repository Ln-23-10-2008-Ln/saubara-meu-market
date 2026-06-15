FROM oven/bun:1.1-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json bun.lockb* ./
COPY packages/server/package.json ./packages/server/
COPY packages/web/package.json ./packages/web/

# Instalar dependências
RUN bun install --frozen-lockfile

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3000

# Iniciar servidor
CMD ["bun", "run", "packages/server/src/server.ts"]
