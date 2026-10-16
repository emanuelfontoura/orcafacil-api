# Infraestrutura — Ambientes, Docker e CI/CD

> **Escopo:** variáveis de ambiente, arquivos `.env`, ambientes (desenvolvimento, CI e produção), Docker (`Dockerfile` e Compose), pipeline de CI no Bitbucket, processo de deploy e como executar o projeto localmente.
> **Documentos relacionados:** [`dependencies.md`](./dependencies.md) · [`redis.md`](./redis.md) · [`security.md`](./security.md) · [`../architecture/overview.md`](../architecture/overview.md#7-ambientes-build-e-ci)
> **Fonte da verdade:** `Dockerfile`, `docker-compose.dev.yml`, `docker-compose.prod.yml`, `bitbucket-pipelines.yml`, `package.json`, `prisma.config.ts` e usos de `process.env` em `src/`.
> **Última revisão:** 2026-10-15.

---

## 1. Visão geral dos ambientes

| Ambiente | API | PostgreSQL | Redis | Arquivo de env | Orquestração |
|---|---|---|---|---|---|
| **Desenvolvimento** | No host, `npm run dev` (ts-node-dev) | `postgres:15` em container | `redis:7` em container | `.env` | `docker-compose.dev.yml` |
| **CI** | Testes unitários + build | `postgres:15` (service do pipeline) | `redis:7` (service do pipeline) | Variáveis `export` no script | `bitbucket-pipelines.yml` |
| **Produção** | Container da imagem (`node dist/index.js`) | `postgres:17` em container | `redis:8-alpine` em container (AOF) | `.env.prod` | `docker-compose.prod.yml` |

```mermaid
flowchart LR
    subgraph DEV[Desenvolvimento]
        H[API no host<br/>npm run dev :3000] --> PGD[(postgres:15<br/>:5432)]
        H --> RDD[(redis:7<br/>:6379)]
    end
    subgraph CI[Bitbucket Pipelines - PRs]
        S[node:24<br/>install → generate → migrate deploy → test → build] --> PGC[(postgres:15)]
        S --> RDC[(redis:7)]
    end
    subgraph PROD[Produção - rede orcafacil]
        A[orcafacil-api<br/>node:20-alpine :3000] --> PGP[(postgres:17<br/>volume postgres-data)]
        A --> RDP[(redis:8-alpine<br/>AOF, volume redis-data)]
    end
```

---

## 2. Variáveis de ambiente

Carregadas pelo `dotenv` (`import 'dotenv/config'`), que lê o arquivo **`.env` da raiz** do diretório de execução.

| Variável | Obrigatória | Usada em | Descrição |
|---|---|---|---|
| `PORT` | não (padrão `3000`) | `src/index.ts` | Porta HTTP da API. |
| `NODE_ENV` | não | `src/lib/prisma.ts`, `AuthCookies.ts` | `production` ativa `secure` nos cookies e desativa o cache global do Prisma Client. CI usa `test`. |
| `DATABASE_URL` | **sim** | `src/lib/prisma.ts`, `prisma.config.ts` | String de conexão PostgreSQL (`postgresql://user:senha@host:5432/banco`). |
| `DATABASE_USER` | dev | `docker-compose.dev.yml` | Usuário do PostgreSQL criado no container. |
| `DATABASE_PASSWORD` | dev | `docker-compose.dev.yml` | Senha do PostgreSQL do container. |
| `DATABASE_NAME` | dev | `docker-compose.dev.yml` | Nome do banco criado no container. |
| `REDIS_HOST` | **sim** | `src/lib/redis.ts` | Host do Redis (`localhost` em dev; nome do serviço `redis` dentro da rede Docker). |
| `REDIS_PORT` | **sim** | `src/lib/redis.ts` | Porta do Redis (`6379`). |
| `JWT_ACCESS_SECRET` | **sim** | `generateTokens.ts`, `authenticate.ts` | Segredo do access token. |
| `JWT_REFRESH_SECRET` | **sim** | `generateTokens.ts`, `auth.service.ts` | Segredo do refresh token (diferente do access). |
| `PEPPER` | **sim** | `ArgonHash.ts` | Pepper do Argon2. **Não pode mudar** depois que existem senhas cadastradas (invalidaria todos os hashes). |
| `USER_EMAIL` | **sim** (envio de e-mail) | `auth.repository.ts` | Conta Gmail remetente. |
| `USER_PASSWORD` | **sim** (envio de e-mail) | `auth.repository.ts` | Senha de app do Gmail. |

Não há validação das variáveis na inicialização: uma variável ausente só se manifesta quando o código que a usa é executado.

### Arquivos `.env`

| Arquivo | Uso | Versionado |
|---|---|---|
| `.env` | Desenvolvimento local; lido pelo `dotenv` e pelo `npm run dev:docker:up` (`--env-file .env`) | Não |
| `.env.prod` | Produção; `env_file` dos serviços do `docker-compose.prod.yml` | Não |
| `.env.dev`, `.env.test` | Citados no README/`.gitignore`; não são lidos automaticamente pelo código | Não |

Todos os `.env*` estão no `.gitignore`. Exemplo de `.env` de desenvolvimento:

```env
PORT=3000
NODE_ENV=development

DATABASE_USER="user"
DATABASE_PASSWORD="password"
DATABASE_NAME="orcafacil"
DATABASE_URL="postgresql://user:password@localhost:5432/orcafacil"

REDIS_HOST=localhost
REDIS_PORT=6379

PEPPER=gere_um_valor_aleatorio
JWT_ACCESS_SECRET=gere_uma_chave_secreta_para_access_token
JWT_REFRESH_SECRET=gere_outra_chave_secreta_para_refresh_token

USER_EMAIL="email@gmail.com"
USER_PASSWORD="senha_de_app_do_gmail"
```

---

## 3. Desenvolvimento local

### Pré-requisitos
Node.js, npm e Docker (ou PostgreSQL e Redis instalados localmente).

### Passo a passo

```bash
npm install                 # dependências
# criar o .env (seção 2)
npm run dev:docker:up       # PostgreSQL :5432 e Redis :6379 em containers
npx prisma generate         # gera o Prisma Client
npx prisma migrate dev      # aplica as migrations
npm run dev                 # API em http://localhost:3000 com reload
```

Para derrubar os containers: `npm run dev:docker:down` (os dados do PostgreSQL persistem no volume `postgres_dev_data`).

### `docker-compose.dev.yml`

| Serviço | Imagem | Container | Porta | Detalhes |
|---|---|---|---|---|
| `postgres` | `postgres:15` | `orcafacil-postgres-dev` | `5432:5432` | `POSTGRES_USER/PASSWORD/DB` a partir de `DATABASE_USER/PASSWORD/NAME`; volume `postgres_dev_data`; healthcheck `pg_isready` a cada 5 s |
| `redis` | `redis:7` | `orcafacil-redis-dev` | `6379:6379` | Sem persistência configurada e sem senha |

A API **não** roda em container no desenvolvimento.

### Outros comandos úteis

| Comando | Uso |
|---|---|
| `npm run lint` | ESLint |
| `npm run test:unit:run` | Testes unitários (mocks; não precisam de banco/Redis) |
| `npm run build` | Compila para `dist/` (faz type-check) |
| `npx prisma studio` | Interface web para inspecionar o banco |

---

## 4. Docker — imagem da API (`Dockerfile`)

Build **multi-stage** sobre `node:20-alpine`:

```dockerfile
# Estágio 1 — builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                 # todas as dependências
COPY . .
RUN npx prisma generate    # gera o Prisma Client
RUN npm run build          # tsc + tsc-alias → dist/

# Estágio 2 — runtime
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev      # apenas dependências de produção
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

- A imagem final contém só `dist/`, `prisma/` (schema e migrations), o Prisma Client gerado e as dependências de produção.
- O container **não executa migrations** ao iniciar; elas devem ser aplicadas com `npx prisma migrate deploy` antes de subir uma versão com mudanças de schema.
- Não há `.dockerignore` no repositório: `COPY . .` envia todo o diretório como contexto de build.

---

## 5. Produção — `docker-compose.prod.yml`

| Serviço | Imagem | Container | Portas | Volumes | Detalhes |
|---|---|---|---|---|---|
| `api` | `ghcr.io/SEU_USUARIO/orcafacil-api:latest` | `orcafacil-api` | `3000:3000` | — | `env_file: .env.prod`; `restart: unless-stopped`; depende do `postgres` saudável e do `redis` iniciado |
| `postgres` | `postgres:17` | `orcafacil-postgres` | não exposto | `postgres-data` | `env_file: .env.prod`; healthcheck `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB` (5 s, 10 tentativas) |
| `redis` | `redis:8-alpine` | `orcafacil-redis` | não exposto | `redis-data` | `redis-server --appendonly yes` (persistência AOF) |

- Todos os serviços estão na rede bridge **`orcafacil`**; apenas a API publica porta.
- Dentro da rede, os hosts são os nomes dos serviços: `DATABASE_URL=postgresql://<user>:<senha>@postgres:5432/<banco>` e `REDIS_HOST=redis`.
- O container `postgres` lê o `.env.prod`; a imagem oficial usa `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` para inicializar o banco.
- A imagem da API é referenciada com o placeholder `SEU_USUARIO` no GitHub Container Registry.

Subir/atualizar:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## 6. CI — Bitbucket Pipelines (`bitbucket-pipelines.yml`)

| Item | Valor |
|---|---|
| Gatilho | **Todo pull request** (`pull-requests: "**"`) |
| Imagem | `node:24` |
| Serviços | `postgres:15` (`test`/`test`/`test`) e `redis:7` |
| Cache | `node` (node_modules) |
| Step | `Validate Pull Request` |

Variáveis definidas no próprio script:

```bash
DATABASE_URL="postgresql://test:test@localhost:5432/test"
REDIS_URL="redis://localhost:6379"      # não utilizada pelo código
REDIS_HOST="localhost"
REDIS_PORT="6379"
NODE_ENV="test"
JWT_ACCESS_SECRET="test-access-secret"
JWT_REFRESH_SECRET="test-refresh-secret"
PEPPER="test-pepper"
```

Etapas, em ordem (qualquer falha reprova o PR):

```bash
npm install
npx prisma generate
npx prisma migrate deploy      # valida que as migrations aplicam num banco limpo
npm run test:unit:run          # testes unitários
npm run build                  # type-check + compilação
```

O lint (`npm run lint`) **não** faz parte do pipeline.

---

## 7. CD — entrega e deploy

Não há pipeline de CD automatizado: o Bitbucket Pipelines só valida PRs, e nenhum passo constrói ou publica a imagem Docker.

Processo de deploy esperado pelos arquivos existentes:

1. PR aprovado e pipeline verde → merge na `main`.
2. Build da imagem: `docker build -t ghcr.io/<usuario>/orcafacil-api:latest .`
3. Publicação: `docker push ghcr.io/<usuario>/orcafacil-api:latest`
4. No servidor: aplicar migrations pendentes (`npx prisma migrate deploy` apontando para o banco de produção).
5. No servidor: `docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d`.

Ao automatizar o CD, um step de `branches: main` no `bitbucket-pipelines.yml` pode executar os passos 2–5.

---

## 8. Portas e endereços

| Recurso | Dev (host) | Produção (rede Docker) |
|---|---|---|
| API | `http://localhost:3000` | `api:3000` (publicada em `3000` no host) |
| PostgreSQL | `localhost:5432` | `postgres:5432` (não publicado) |
| Redis | `localhost:6379` | `redis:6379` (não publicado) |
| Frontend permitido no CORS | `http://localhost:3000` | idem (fixo em `src/index.ts`) |
