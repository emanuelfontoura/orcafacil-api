# Arquitetura — Estrutura de Pastas

> **Escopo:** organização de pastas e arquivos do `orcafacil-api`, o papel de cada diretório e onde colocar código novo.
> **Documentos relacionados:** [`overview.md`](./overview.md) · [`request-lifecycle.md`](./request-lifecycle.md) · [`conventions.md`](./conventions.md)
> **Fonte da verdade:** árvore de arquivos do repositório `orcafacil-api`.
> **Última revisão:** 2026-10-15.

---

## 1. Árvore completa

```
orcafacil-api/
├── docs/                               # RAG: documentação do projeto para IAs e pessoas (ver docs/README.md)
│
├── prisma/
│   ├── migrations/                     # Histórico de migrations SQL geradas pelo Prisma
│   │   ├── 20260327032012_start/
│   │   │   └── migration.sql
│   │   ├── ...                         # Uma pasta por migration: {timestamp}_{descricao}
│   │   └── migration_lock.toml
│   └── schema.prisma                   # Models do banco (fonte da verdade do schema)
│
├── src/
│   ├── index.ts                        # Entry point: cria o app Express, middlewares globais, rotas e handleError
│   │
│   ├── lib/                            # Clientes de infraestrutura (instâncias únicas)
│   │   ├── prisma.ts                   # PrismaClient com adapter pg (singleton)
│   │   └── redis.ts                    # Cliente ioredis
│   │
│   ├── middlewares/                    # Middlewares Express reutilizáveis
│   │   ├── authenticate.ts             # Valida o cookie accessToken (JWT) e preenche req.user
│   │   ├── handleError.ts              # Handler global de erros → ApiResponse de erro
│   │   ├── rateLimit.ts                # Rate limit por IP + rota usando Redis
│   │   └── validate.ts                 # validateSchema(zodSchema) para o req.body
│   │
│   ├── modules/                        # Módulos de domínio (um por recurso)
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.dtos.ts
│   │   │   ├── auth.repository.ts      # Envio de e-mail (Nodemailer)
│   │   │   ├── auth.route.ts
│   │   │   ├── auth.schema.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.types.ts
│   │   ├── clients/
│   │   │   ├── clients.controller.ts
│   │   │   ├── clients.dtos.ts
│   │   │   ├── clients.repository.ts
│   │   │   ├── clients.route.ts
│   │   │   ├── clients.schema.ts
│   │   │   ├── clients.service.ts
│   │   │   └── clients.types.ts
│   │   └── user/
│   │       ├── user.controller.ts      # (vazio)
│   │       ├── user.dtos.ts
│   │       ├── user.repository.ts      # Acesso à tabela users (usado por auth e clients)
│   │       ├── user.route.ts           # (router sem rotas)
│   │       ├── user.service.ts         # (vazio)
│   │       └── user.types.ts
│   │
│   └── shared/                         # Código compartilhado entre módulos
│       ├── errors/
│       │   ├── AppError.ts             # Erro base (message, statusCode, code)
│       │   ├── ConflictError.ts        # 409
│       │   ├── NotFoundError.ts        # 404
│       │   ├── UnauthorizedError.ts    # 401
│       │   └── ErrorCodes.ts           # enum ErrorCode (códigos de erro da API)
│       ├── types/
│       │   ├── apiResponse.ts          # Tipo ApiResponse<T> (formato padrão de resposta)
│       │   └── express.d.ts            # Augmentation: req.user
│       └── utils/
│           ├── ArgonHash.ts            # Hash/verify/rehash Argon2id com pepper
│           ├── AuthCookies.ts          # Seta/limpa cookies accessToken e refreshToken
│           ├── generateCode.ts         # Código numérico aleatório de 6 dígitos
│           ├── generateTokens.ts       # Gera access + refresh JWT
│           ├── IsValidCnpjCpf.ts       # Validação de CPF/CNPJ
│           └── verifyKeyExists.ts      # Verifica se uma chave existe no Redis
│
├── tests/
│   └── unit/                           # Testes unitários (Vitest), espelhando os módulos
│       └── auth/
│           ├── createNewPassword.unit.test.ts
│           ├── login.unit.test.ts
│           └── verifyEmail.unit.test.ts
│
├── .gitattributes
├── AGENTS.md                           # Instruções para ferramentas de IA (aponta para docs/README.md)
├── CLAUDE.md                           # Instruções carregadas pelo Claude Code (importa docs/README.md)
├── .gitignore
├── bitbucket-pipelines.yml             # CI dos pull requests
├── docker-compose.dev.yml              # PostgreSQL + Redis para desenvolvimento
├── docker-compose.prod.yml             # API + PostgreSQL + Redis para produção
├── Dockerfile                          # Build multi-stage da API
├── eslint.config.mjs                   # Configuração do ESLint (flat config)
├── package.json
├── prisma.config.ts                    # Configuração do Prisma (caminho do schema, migrations e DATABASE_URL)
├── README.md
├── tsconfig.json                       # Config TS base (alias @/*, inclui src, tests e prisma.config.ts)
├── tsconfig.build.json                 # Config TS de build (apenas src → dist)
└── vite.config.ts                      # Configuração do Vitest (alias @)
```

Arquivos não versionados: `.env`, `.env.dev`, `.env.test`, `.env.prod`, `dist/`, `node_modules/`, `coverage/`, `src/generated/prisma`.

---

## 2. Papel de cada diretório

### `prisma/`
Tudo o que define o banco relacional. `schema.prisma` é a fonte da verdade dos models; `migrations/` guarda o SQL gerado por `prisma migrate dev`, uma pasta por migration (`{AAAAMMDDHHMMSS}_{descricao_em_snake_case}`). Migrations aplicadas nunca são editadas. Detalhes em [`../database/schema.md`](../database/schema.md).

### `src/index.ts`
Único entry point. Faz, nesta ordem: carrega o `.env` (`dotenv/config`), cria o app Express, registra os middlewares globais (`cors`, `express.json`, `cookieParser`), monta os routers de cada módulo em seus prefixos, registra o `handleError` **por último** e inicia o servidor em `PORT`. Ao criar um módulo novo, o router dele deve ser registrado aqui.

### `src/lib/`
Instâncias de clientes de infraestrutura, criadas **uma única vez** e importadas onde forem necessárias:
- `prisma` — `import { prisma } from '@/lib/prisma'`
- `redis` — `import { redis } from '@/lib/redis'`

Novos clientes externos (ex.: storage, fila) entram aqui.

### `src/middlewares/`
Middlewares Express genéricos, que não pertencem a um módulo. Os que recebem configuração são **factories** que retornam o middleware (`rateLimit(max, janela, rota)`, `validateSchema(schema)`).

### `src/modules/`
Um diretório por **recurso/domínio**. Cada módulo é autocontido e segue a mesma composição de arquivos:

| Arquivo | Camada / papel |
|---|---|
| `{modulo}.route.ts` | Router Express do módulo; exporta `{Modulo}Routes`. |
| `{modulo}.controller.ts` | Classe `{Modulo}Controller` com métodos estáticos, um por endpoint. |
| `{modulo}.service.ts` | Classe `{Modulo}Service` com as regras de negócio. |
| `{modulo}.repository.ts` | Classe `{Modulo}Repository` com o acesso a dados/integrações. |
| `{modulo}.schema.ts` | Objeto com os schemas Zod do módulo. |
| `{modulo}.dtos.ts` | Interface com os DTOs de request/response da API. |
| `{modulo}.types.ts` | Tipo com os formatos internos (service ↔ repository). |

Um módulo pode usar o **repository de outro módulo** (ex.: `auth` e `clients` usam `UserRepository`), mas não o controller ou o service de outro.

### `src/shared/`
Código reutilizado por vários módulos:
- `errors/` — hierarquia de erros (`AppError` e subclasses) e o enum `ErrorCode`.
- `types/` — tipos globais (`ApiResponse<T>`) e augmentations do Express (`req.user`).
- `utils/` — funções e classes utilitárias sem estado de domínio.

### `tests/`
Testes automatizados. Hoje existe apenas `tests/unit/`, organizado **por módulo** e **um arquivo por método do service** (`{metodo}.unit.test.ts`). Não há testes de integração nem E2E.

---

## 3. Aliases de importação

O alias `@/` aponta para `src/`:

| Onde é configurado | Para quê |
|---|---|
| `tsconfig.json` → `paths: { "@/*": ["./src/*"] }` | Type-check e editor |
| `ts-node-dev -r tsconfig-paths/register` (`npm run dev`) | Resolução em desenvolvimento |
| `tsc-alias` (`npm run build`) | Reescreve os imports no `dist/` |
| `vite.config.ts` (`vite-tsconfig-paths` + `alias`) | Resolução nos testes |

Use `@/...` para importar de outra pasta de `src/`. Imports relativos (`./`) aparecem apenas entre arquivos do mesmo módulo.

---

## 4. Onde colocar código novo

| Preciso criar… | Local |
|---|---|
| Um novo recurso da API (ex.: produtos, orçamentos) | `src/modules/{recurso}/` com os 7 arquivos padrão + registrar o router em `src/index.ts` |
| Um endpoint num recurso existente | Rota em `{modulo}.route.ts`, método no controller, no service e (se acessar dados) no repository; schema Zod em `{modulo}.schema.ts`; tipos em `.dtos.ts`/`.types.ts` |
| Uma regra de validação de entrada | `{modulo}.schema.ts` (Zod) |
| Uma validação reutilizável (ex.: CPF/CNPJ) | `src/shared/utils/` |
| Um novo tipo de erro HTTP | `src/shared/errors/{Nome}Error.ts` estendendo `AppError` |
| Um novo código de erro | `src/shared/errors/ErrorCodes.ts`, na seção do domínio |
| Um middleware genérico | `src/middlewares/` |
| Um cliente de serviço externo | `src/lib/` |
| Uma tabela ou coluna | `prisma/schema.prisma` + `npx prisma migrate dev --name <descricao>` |
| Um teste unitário de service | `tests/unit/{modulo}/{metodo}.unit.test.ts` |
