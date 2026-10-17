---
title: "Dependências"
description: "Runtime, serviços, pacotes npm de produção e desenvolvimento com versões, scripts npm e regras para adicionar dependências."
type: infrastructure
tags:
  - "dependencias"
  - "npm"
  - "versoes"
  - "scripts"
modules: []
sources:
  - "package.json"
  - "package-lock.json"
  - "tsconfig.json"
  - "prisma.config.ts"
  - "vite.config.ts"
related:
  - "infrastructure/environment.md"
  - "architecture/overview.md"
last_reviewed: 2026-10-15
---

# Infraestrutura — Dependências

> **Escopo:** dependências do `orcafacil-api`: runtime, serviços externos, pacotes npm de produção e de desenvolvimento (com versão declarada e versão instalada), onde cada um é usado, scripts npm e regras para adicionar dependências.
> **Documentos relacionados:** [`environment.md`](./environment.md) · [`redis.md`](./redis.md) · [`security.md`](./security.md) · [`../architecture/overview.md`](../architecture/overview.md#2-stack)
> **Fonte da verdade:** `package.json` e `package-lock.json` (lockfile v3) no repositório `orcafacil-api`.
> **Última revisão:** 2026-10-15.

---

## 1. Runtime e serviços

| Componente | Versão | Onde é definido |
|---|---|---|
| Node.js | 20 (`node:20-alpine`) em produção; 24 (`node:24`) no CI | `Dockerfile`, `bitbucket-pipelines.yml` |
| npm | O que acompanha a imagem Node | `npm ci` no Docker, `npm install` no CI |
| PostgreSQL | 15 em dev e CI; 17 em produção | `docker-compose.dev.yml`, `bitbucket-pipelines.yml`, `docker-compose.prod.yml` |
| Redis | 7 em dev e CI; 8 (`redis:8-alpine`) em produção | idem |
| SMTP | Gmail (via Nodemailer, `service: "gmail"`) | `src/modules/auth/auth.repository.ts` |
| Módulo JS | CommonJS (`"type": "commonjs"`, `module: CommonJS`) | `package.json`, `tsconfig.json` |

---

## 2. Dependências de produção (`dependencies`)

| Pacote | Declarado | Instalado | Finalidade | Onde é usado |
|---|---|---|---|---|
| `express` | ^5.2.1 | 5.2.1 | Framework HTTP (Express 5: encaminha promises rejeitadas ao error handler) | `src/index.ts`, routers, middlewares |
| `cors` | ^2.8.6 | 2.8.6 | CORS com `credentials: true` | `src/index.ts` |
| `cookie-parser` | ^1.4.7 | 1.4.7 | Popula `req.cookies` (tokens de autenticação) | `src/index.ts` |
| `dotenv` | ^17.3.1 | 17.4.2 | Carrega o `.env` (`import 'dotenv/config'`) | `src/index.ts`, `src/lib/redis.ts`, `src/middlewares/authenticate.ts`, `prisma.config.ts` |
| `@prisma/client` | ^7.5.0 | 7.8.0 | Client gerado do ORM | `src/lib/prisma.ts`, repositórios |
| `@prisma/adapter-pg` | ^7.5.0 | 7.8.0 | Driver adapter do Prisma usando `pg` | `src/lib/prisma.ts` |
| `ioredis` | ^5.10.1 | 5.11.1 | Cliente Redis | `src/lib/redis.ts` |
| `zod` | ^4.3.6 | 4.4.3 | Validação de schemas | `*.schema.ts`, `validate.ts`, `handleError.ts` |
| `jsonwebtoken` | ^9.0.3 | 9.0.3 | Emissão e verificação de JWT | `generateTokens.ts`, `authenticate.ts`, `auth.service.ts` |
| `argon2` | ^0.44.0 | 0.44.0 | Hash Argon2id (módulo nativo) | `src/shared/utils/ArgonHash.ts` |
| `nodemailer` | ^8.0.3 | 8.0.11 | Envio de e-mails | `src/modules/auth/auth.repository.ts` |
| `tsconfig-paths` | ^4.2.0 | 4.2.0 | Resolve o alias `@/` em desenvolvimento (`-r tsconfig-paths/register`) | script `dev` |
| `tsc-alias` | ^1.8.16 | 1.9.0 | Reescreve o alias `@/` no build | script `build` |
| `nodemon` | ^3.1.14 | 3.1.14 | Watcher (não usado pelos scripts atuais; o `dev` usa `ts-node-dev`) | — |

> `cpf-cnpj-validator` é importado em código de produção (`src/shared/utils/IsValidCnpjCpf.ts`), mas está declarado em `devDependencies`. A imagem de produção instala com `npm ci --omit=dev`; ao mexer em dependências, considere esse ponto.

---

## 3. Dependências de desenvolvimento (`devDependencies`)

| Pacote | Declarado | Instalado | Finalidade |
|---|---|---|---|
| `typescript` | ^5.9.3 | 5.9.3 | Compilador TS |
| `ts-node-dev` | ^2.0.0 | 2.0.0 | Executa o TS com reload em desenvolvimento (`--respawn --transpile-only`) |
| `prisma` | ^7.5.0 | 7.8.0 | CLI do Prisma (`generate`, `migrate`) |
| `vitest` | ^4.1.5 | 4.1.9 | Test runner |
| `vite-tsconfig-paths` | ^6.1.1 | 6.1.1 | Alias `@/` nos testes |
| `supertest` / `@types/supertest` | ^7.2.2 / ^7.2.0 | 7.2.2 / 7.2.0 | Testes HTTP (instalado; sem testes de integração no momento) |
| `eslint` | ^10.5.0 | 10.6.0 | Linter |
| `@eslint/js` | ^10.0.1 | 10.0.1 | Regras recomendadas do ESLint |
| `typescript-eslint` | ^8.62.1 | 8.62.1 | Regras e parser TS para o ESLint |
| `globals` | ^17.7.0 | 17.7.0 | Globais do Node para o ESLint |
| `dotenv-cli` | ^11.0.0 | 11.0.0 | Executar comandos com um `.env` específico |
| `cpf-cnpj-validator` | ^2.1.2 | 2.1.2 | Validação de CPF/CNPJ (ver nota acima) |
| `@types/node` | ^25.5.0 | 25.9.4 | Tipos do Node |
| `@types/express` | ^5.0.6 | 5.0.6 | Tipos do Express |
| `@types/cookie-parser` | ^1.4.10 | 1.4.10 | Tipos |
| `@types/cors` | ^2.8.19 | 2.8.19 | Tipos |
| `@types/jsonwebtoken` | ^9.0.10 | 9.0.10 | Tipos |
| `@types/nodemailer` | ^7.0.11 | 7.0.12 | Tipos |

---

## 4. Scripts npm

| Script | Comando | Uso |
|---|---|---|
| `dev` | `ts-node-dev --respawn --transpile-only -r tsconfig-paths/register src/index.ts` | Sobe a API em desenvolvimento com reload. `--transpile-only` não faz type-check. |
| `build` | `tsc -p tsconfig.build.json && tsc-alias -p tsconfig.build.json` | Compila `src/` para `dist/` e resolve os aliases. Faz type-check. |
| `lint` | `eslint .` | Lint de `src/` e `tests/`. |
| `test:unit:run` | `vitest run ./tests/unit` | Executa os testes unitários uma vez. |
| `dev:docker:up` | `docker compose --env-file .env -f docker-compose.dev.yml up -d` | Sobe PostgreSQL e Redis de desenvolvimento. |
| `dev:docker:down` | `docker compose -f docker-compose.dev.yml down` | Derruba os containers de desenvolvimento. |

Comandos do Prisma usados diretamente (sem script):

| Comando | Uso |
|---|---|
| `npx prisma generate` | Gera o Prisma Client (necessário após instalar ou alterar o schema). |
| `npx prisma migrate dev --name <descricao>` | Cria e aplica uma migration em desenvolvimento. |
| `npx prisma migrate deploy` | Aplica migrations pendentes (CI/produção). |

---

## 5. Arquivos de configuração das ferramentas

| Arquivo | Ferramenta | Pontos principais |
|---|---|---|
| `tsconfig.json` | TypeScript | `target ES2020`, `module CommonJS`, `strict`, `esModuleInterop`, `skipLibCheck`, alias `@/* → ./src/*`, inclui `src`, `tests`, `prisma.config.ts` |
| `tsconfig.build.json` | TypeScript (build) | Estende o base; `rootDir ./src`; inclui só `src` |
| `prisma.config.ts` | Prisma 7 | Schema `prisma/schema.prisma`, migrations `prisma/migrations`, `datasource.url = DATABASE_URL` |
| `vite.config.ts` | Vitest | Plugin `vite-tsconfig-paths` + alias `@` → `./src` |
| `eslint.config.mjs` | ESLint (flat config) | Ver [`../architecture/conventions.md`](../architecture/conventions.md#3-estilo-de-código) |

---

## 6. Regras para dependências

- Instalar com `npm install <pacote>` (produção) ou `npm install -D <pacote>` (desenvolvimento) e **versionar o `package-lock.json`**.
- Pacote importado por código em `src/` deve estar em `dependencies` — a imagem de produção não instala `devDependencies`.
- Pacotes com tipos separados: adicionar `@types/<pacote>` em `devDependencies`.
- Ao atualizar Prisma, manter `prisma`, `@prisma/client` e `@prisma/adapter-pg` **na mesma versão** e rodar `npx prisma generate`.
- `argon2` é um módulo nativo: a imagem Docker compila/baixa o binário para Alpine durante o `npm ci`.
- Preferir o que o projeto já usa (ex.: Zod para validação, `ioredis` para Redis, `crypto` nativo para aleatoriedade) antes de adicionar uma biblioteca nova.
