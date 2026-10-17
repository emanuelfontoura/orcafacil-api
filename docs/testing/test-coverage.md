---
title: "Cobertura de testes"
description: "Resultado da última execução, matriz de cobertura por método e camada, inventário de cenários, lacunas e como medir cobertura."
type: testing
tags:
  - "testes"
  - "cobertura"
  - "lacunas"
modules:
  - "auth"
  - "clients"
  - "user"
sources:
  - "tests/unit/"
related:
  - "testing/strategy.md"
  - "modules/auth.md"
  - "modules/clients.md"
last_reviewed: 2026-10-15
---

# Testes — Cobertura

> **Escopo:** o que está coberto por testes no `orcafacil-api` hoje: resultado da última execução, matriz de cobertura por módulo, método e camada, inventário de cenários de cada arquivo de teste, lacunas e prioridades, e como medir cobertura de código.
> **Documentos relacionados:** [`strategy.md`](./strategy.md) · [`../modules/auth.md`](../modules/auth.md) · [`../modules/clients.md`](../modules/clients.md) · [`../modules/user.md`](../modules/user.md)
> **Fonte da verdade:** `tests/unit/` no repositório `orcafacil-api`. Atualize este documento sempre que testes forem adicionados ou removidos.
> **Última revisão:** 2026-10-15.

---

## 1. Situação atual

Execução de `npm run test:unit:run` em 2026-10-15 (Vitest 4.1.9):

```
Test Files  3 passed (3)
     Tests  26 passed (26)
  Duration  ~4.8s
```

| Indicador | Valor |
|---|---|
| Arquivos de teste | 3 |
| Casos de teste (`it`) | 26 |
| Módulos com testes | 1 de 3 (`auth`) |
| Métodos de service testados | 3 de 14 |
| Testes de integração / E2E | 0 (removidos) |
| Cobertura de linhas | Não medida (sem provider de coverage instalado) |

---

## 2. Matriz de cobertura por método de service

| Módulo | Método | Testado | Arquivo | Casos |
|---|---|---|---|---|
| `auth` | `AuthUserService.verifyEmail` | ✅ | `tests/unit/auth/verifyEmail.unit.test.ts` | 10 |
| `auth` | `AuthUserService.confirmEmail` | ❌ | — | — |
| `auth` | `AuthUserService.resendEmailCode` | ❌ | — | — |
| `auth` | `AuthUserService.login` | ✅ | `tests/unit/auth/login.unit.test.ts` | 10 |
| `auth` | `AuthUserService.refreshToken` | ❌ | — | — |
| `auth` | `AuthUserService.sendCodeRecovery` | ❌ | — | — |
| `auth` | `AuthUserService.confirmCodeRecovery` | ❌ | — | — |
| `auth` | `AuthUserService.createNewPassword` | ✅ | `tests/unit/auth/createNewPassword.unit.test.ts` | 6 |
| `auth` | `AuthUserService.logout` | ❌ | — | — |
| `clients` | `ClientsService.create` | ❌ | — | — |
| `clients` | `ClientsService.edit` | ❌ | — | — |
| `clients` | `ClientsService.delete` | ❌ | — | — |
| `clients` | `ClientsService.getAll` | ❌ | — | — |
| `clients` | `ClientsService.getById` | ❌ | — | — |
| `user` | `UserService` | — | Classe vazia | — |

---

## 3. Cobertura por camada

| Camada | Itens | Testados |
|---|---|---|
| Services | `AuthUserService` (9 métodos), `ClientsService` (5) | 3 métodos (`auth`) |
| Controllers | `AuthUserController`, `ClientsController` | 0 |
| Repositórios | `UserRepository`, `ClientsRepository`, `AuthUserRepository` | 0 (mockados nos testes de service) |
| Middlewares | `authenticate`, `rateLimit`, `validateSchema`, `handleError` | 0 |
| Schemas Zod | `authSchemas`, `ClientsSchema` | 0 |
| Utilitários | `ArgonHash`, `generateCode`, `generateTokens`, `verifyKeyExists`, `isValidCnpjCpf`, `AuthCookies` | 0 (mockados nos testes de service) |

---

## 4. Inventário de cenários

### 4.1 `verifyEmail.unit.test.ts` — `AuthUserService.verifyEmail` (10 casos)

**Mocks:** `UserRepository` (automock), `ArgonHash` (automock), `verifyKeyExists` (automock), `redis` (factory com `set`), `AuthUserRepository` (automock), `generateCode` (factory, retorna `'123456'`).

| Categoria | Caso | Verifica |
|---|---|---|
| Sucesso | deveria enviar o código de verificação para o email | Retorno com `email` e `name` |
| Colaboração | deve verificar se o userRepository.findByEmail está sendo chamado com o email de forma correta | `findByEmail(email)` |
| Colaboração | deveria hashear a senha e o code antes de salvar no Redis | `argonHash` 1º com a senha, 2º com o código, 2 chamadas |
| Colaboração | deveria verificar se verifyKeyExists está sendo chamado com a key correta | `verify-email-cooldown-{email}` |
| Colaboração | deveria salvar no Redis com a key e o TTL corretos | 1º `set`: `verify-email-{email}`, JSON, `EX 600`; 2º `set`: cooldown, `1`, `EX 60`; 2 chamadas |
| Colaboração | deveria chamar sendEmailVerificationCode com email e código corretos | `{ email, code: '123456' }` |
| Erro de negócio | deveria gerar ConflictError caso o email já esteja cadastrado | 409 `USER_ALREADY_EXISTS`; sem hash e sem `set` |
| Erro de negócio | deveria gerar ConflictError caso o cooldown do email ainda estiver ativo | 409 `LIMIT_ATTEMPTS`; sem `set` |
| Erro de infraestrutura | deveria lançar AppError se o primeiro redis.set (code) falhar | 500 `REDIS_SAVE_ERROR`; 1 `set`; e-mail não enviado |
| Erro de infraestrutura | deveria lançar AppError se o segundo redis.set (email cooldown) falhar | 500 `REDIS_SAVE_ERROR` |

Não cobertos neste método: falha do `sendEmailVerificationCode`, falha do `findByEmail`, falha do `verifyKeyExists`, presença de `cnpjCpf` no retorno/JSON salvo.

### 4.2 `login.unit.test.ts` — `AuthUserService.login` (10 casos)

**Mocks:** `UserRepository`, `ArgonHash`, `crypto` (`randomUUID` → `jti` fixo), `generateTokens`, `redis` — todos por automock.

| Categoria | Caso | Verifica |
|---|---|---|
| Sucesso + colaboração | deveria retornar um objeto com o acessToken e o refreshToken | `returnLoginCredentials(email)`, `argonVerify`, `argonRehash`, `updatePasswordHash(1, hash)`, `randomUUID`, `generateTokens(id, jti)`, `redis.set('refresh-token-{jti}', id, 'EX', 604800)`, retorno = tokens |
| Erro de negócio | deveria retornar UnauthorizedError caso não encontre as credenciais | 401 `INVALID_CREDENTIALS` |
| Erro de negócio | deveria retornar UnauthorizedError caso a verificação da senha dê credenciais incorretas | 401 `INVALID_CREDENTIALS` |
| Ramo condicional | deveria NÃO atualizar o hash caso não precise de rehash | `updatePasswordHash` não chamado |
| Erro de infraestrutura | deveria falhar caso o returnLoginCredentials falhe | Propaga 500 `INTERNAL_SERVER_ERROR` |
| Erro de infraestrutura | deveria falhar caso o argonVerify falhe | Propaga 500 |
| Erro de infraestrutura | deveria falhar caso o argonRehash falhe | Propaga 500 |
| Erro de infraestrutura | deveria falhar caso o updatePasswordHash falhe | Propaga 500 `UPDATE_DATABASE_ERROR` |
| Erro de infraestrutura | deveria falhar caso o generateTokens falhe | Propaga 500 |
| Erro de infraestrutura | deveria falhar caso o redis.set falhe | Convertido em 500 `REDIS_SAVE_ERROR` |

Método com cobertura completa de ramos e dependências.

### 4.3 `createNewPassword.unit.test.ts` — `AuthUserService.createNewPassword` (6 casos)

**Mocks:** `redis` (factory com `get`), `ArgonHash` (automock), `UserRepository` (automock).

| Categoria | Caso | Verifica |
|---|---|---|
| Sucesso + colaboração | deveria criar uma nova senha com sucesso | Resolve `undefined`; `get('recovery-password-{uuid}')`; `argonHash(newPassword)`; `updatePasswordHash('user-id', hash)` |
| Erro de infraestrutura | deveria gerar um AppError se o redis causar erro ao dar o get na key | `REDIS_GET_ERROR` |
| Erro de negócio | deveria gerar um UnauthorizedError ao receber um tokenUUID inválido/não encontrar a key no redis | `INVALID_TOKEN` |
| Erro de negócio | deveria gerar um UnauthorizedError caso o authorized seja false | `UNAUTHORIZED_USER`; sem hash e sem update |
| Erro de infraestrutura | deveria retornar um Erro caso o Argon dê erro ao hashear a nova senha | Erro propagado |
| Erro de infraestrutura | deveria retornar um AppErro caso o updatePasswordHash dê erro | `UPDATE_DATABASE_ERROR` |

Método com cobertura completa de ramos e dependências.

---

## 5. Lacunas e prioridades

Ordem sugerida para ampliar a cobertura, mantendo o padrão de [`strategy.md`](./strategy.md):

| Prioridade | Alvo | Cenários principais |
|---|---|---|
| 1 | `AuthUserService.confirmEmail` | Sucesso (cria usuário); chave ausente → 401 `INVALID_OR_EXPIRED_CODE`; código inválido → 401 `INVALID_CODE`; falha `redis.get` → `REDIS_GET_ERROR`; falha `createUser` |
| 1 | `AuthUserService.refreshToken` | Sucesso com rotação (`del` antigo + `set` novo); `jti` ausente → `INVALID_TOKEN`; JWT expirado → `TOKEN_EXPIRED`; JWT inválido → `INVALID_TOKEN`; falha do `set` → `REDIS_SAVE_ERROR`; erro inesperado → `INTERNAL_SERVER_ERROR` (mockar `jsonwebtoken`) |
| 1 | `AuthUserService.confirmCodeRecovery` | Sucesso (novo UUID, `authorized: true`, `del` antigo); chave ausente; `attempts >= 5` → `del` + `LIMIT_ATTEMPTS`; incremento com `KEEPTTL`; código inválido; falhas do Redis |
| 2 | `ClientsService` (5 métodos) | `create`: duplicado → `CLIENT_ALREADY_EXISTS`; `edit`: usuário inexistente → `INVALID_USER`, CPF/CNPJ duplicado; `delete`/`getById`: inexistente → `INVALID_ID_CLIENT`; `getAll`: repassa `userId` e filtros |
| 2 | `AuthUserService.sendCodeRecovery` | E-mail inexistente → `INVALID_CREDENTIALS`; chave/TTL/JSON do Redis; envio do e-mail |
| 2 | `AuthUserService.resendEmailCode` | Cooldown → `LIMIT_ATTEMPTS`; cadastro expirado → `TIME_OUT_REGISTER`; regravação da chave e do cooldown |
| 2 | `AuthUserService.logout` | Sucesso (`del`); JWT inválido/expirado; falha do `del` → `REDIS_DEL_ERROR` |
| 3 | Utilitários puros | `isValidCnpjCpf` (CPF/CNPJ válidos, inválidos, com máscara, tamanhos errados), `generateCode` (6 dígitos), `ArgonHash` (hash/verify com pepper) |
| 3 | Middlewares | `handleError` (ZodError → 400, AppError → status/code, outro → 500), `authenticate` (sem cookie, token inválido, válido → `req.user`), `rateLimit` (limite e TTL) |

---

## 6. Medindo cobertura de código

A cobertura não está configurada. Para medir:

```bash
npm install -D @vitest/coverage-v8
npx vitest run ./tests/unit --coverage
```

Configuração opcional em `vite.config.ts`:

```ts
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'html'],
    },
  },
})
```

O relatório HTML fica em `coverage/` (já ignorado no `.gitignore` e no ESLint).

---

## 7. Como manter este documento

Ao adicionar ou alterar testes:

1. Rodar `npm run test:unit:run` e atualizar a seção 1 (arquivos, casos, data).
2. Marcar o método na matriz da seção 2.
3. Adicionar o inventário do novo arquivo na seção 4 (mocks + tabela de casos por categoria).
4. Remover o item correspondente das lacunas (seção 5).
