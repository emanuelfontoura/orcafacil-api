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
last_reviewed: 2026-11-14
---

# Testes — Cobertura

> **Escopo:** o que está coberto por testes no `orcafacil-api` hoje: resultado da última execução, matriz de cobertura por módulo, método e camada, inventário de cenários de cada arquivo de teste, lacunas e prioridades, e como medir cobertura de código.
> **Documentos relacionados:** [`strategy.md`](./strategy.md) · [`../modules/auth.md`](../modules/auth.md) · [`../modules/clients.md`](../modules/clients.md) · [`../modules/user.md`](../modules/user.md)
> **Fonte da verdade:** `tests/unit/` no repositório `orcafacil-api`. Atualize este documento sempre que testes forem adicionados ou removidos.
> **Última revisão:** 2026-11-14.

---

## 1. Situação atual

Execução de `npm run test:unit:run` em 2026-10-16 (Vitest 4.1.9):

```
Test Files  8 passed (8)
     Tests  62 passed (62)
  Duration  ~0.6s
```

| Indicador | Valor |
|---|---|
| Arquivos de teste | 8 |
| Casos de teste (`it`) | 62 |
| Módulos com testes | 2 de 3 (`auth`, `clients`) |
| Métodos de service testados | 8 de 14 |
| Testes de integração / E2E | 0 (removidos) |
| Cobertura de linhas | Não medida (sem provider de coverage instalado) |

---

## 2. Matriz de cobertura por método de service

| Módulo | Método | Testado | Arquivo | Casos |
|---|---|---|---|---|
| `auth` | `AuthUserService.verifyEmail` | ✅ | `tests/unit/auth/verifyEmail.unit.test.ts` | 6 |
| `auth` | `AuthUserService.confirmEmail` | ❌ | — | — |
| `auth` | `AuthUserService.resendEmailCode` | ✅ | `tests/unit/auth/resendEmailCode.unit.test.ts` | 11 |
| `auth` | `AuthUserService.login` | ✅ | `tests/unit/auth/login.unit.test.ts` | 10 |
| `auth` | `AuthUserService.refreshToken` | ❌ | — | — |
| `auth` | `AuthUserService.sendCodeRecovery` | ❌ | — | — |
| `auth` | `AuthUserService.confirmCodeRecovery` | ❌ | — | — |
| `auth` | `AuthUserService.createNewPassword` | ✅ | `tests/unit/auth/createNewPassword.unit.test.ts` | 6 |
| `auth` | `AuthUserService.logout` | ❌ | — | — |
| `clients` | `ClientsService.create` | ✅ | `tests/unit/clients/create.unit.test.ts` | 5 |
| `clients` | `ClientsService.edit` | ✅ | `tests/unit/clients/edit.unit.test.ts` | 10 |
| `clients` | `ClientsService.delete` | ✅ | `tests/unit/clients/delete.unit.test.ts` | 6 |
| `clients` | `ClientsService.getAll` | ❌ | — | — |
| `clients` | `ClientsService.getById` | ✅ | `tests/unit/clients/getById.unit.test.ts` | 4 |
| `user` | `UserService` | — | Classe vazia | — |

---

## 3. Cobertura por camada

| Camada | Itens | Testados |
|---|---|---|
| Services | `AuthUserService` (9 métodos), `ClientsService` (5) | 8 métodos (4 de `auth`, 4 de `clients`) |
| Controllers | `AuthUserController`, `ClientsController` | 0 |
| Repositórios | `UserRepository`, `ClientsRepository`, `AuthUserRepository` | 0 (mockados nos testes de service) |
| Middlewares | `authenticate`, `rateLimit`, `validateSchema`, `handleError` | 0 |
| Schemas Zod | `authSchemas`, `ClientsSchema` | 0 |
| Utilitários | `ArgonHash`, `generateCode`, `generateTokens`, `verifyKeyExists`, `isValidCnpjCpf`, `AuthCookies` | 0 (mockados nos testes de service) |

---

## 4. Inventário de cenários

### 4.1 `verifyEmail.unit.test.ts` — `AuthUserService.verifyEmail` (6 casos)

**Modelo:** classe instanciável. O `makeSut()` cria mocks com `vi.fn()` e injeta no construtor de `AuthUserService`: `UserRepository.findByEmail` (padrão `null`), `ArgonHash.hash` (1ª chamada `'hashed-password'`, 2ª `'hashed-code'`), `Redis.exists` (padrão `0`), `Redis.set` (padrão `'OK'`), `AuthUserRepository.sendEmailVerificationCode` (padrão `undefined`). O `TokenService` entra como `{}`, porque o método não usa. O `generateCode` não é mockado: o código é conferido com `/^\d{6}$/`.

Os testes de erro verificam só o erro e até onde o fluxo chegou. O conteúdo do payload e os argumentos de cada colaborador ficam no caso de sucesso.

| Categoria | Caso | Verifica |
|---|---|---|
| Sucesso + colaboração | deve retornar os dados de cadastro do usuário | Retorno `{ email, name, cnpjCpf }`; `findByEmail(email)`; `hash` 1º com a senha, 2º com o código; `exists('verify-email-cooldown-{email}')`; 1º `set`: `verify-email-{email}`, JSON `{ code, name, cnpjCpf, password }` com os hashes, `EX 600`; 2º `set`: cooldown, `1`, `EX 60`; `sendEmailVerificationCode({ email, code })` |
| Erro de negócio | deve retornar 409 ConflictError caso o email já tenha usuário vinculado | 409 `USER_ALREADY_EXISTS`; sem hash, `exists`, `set` e envio |
| Erro de negócio | deve retornar 409 ConflictError caso o email esteja em cooldown no redis | 409 `LIMIT_ATTEMPTS`; 1 hash (senha, ver ISS-29); sem `set` e sem envio |
| Erro de infraestrutura | deve retornar 500 AppError ao dar erro no primeiro Redis.set | 500 `REDIS_SAVE_ERROR` ("Erro ao salvar código de verificação."); 1 `set`; e-mail não enviado |
| Erro de infraestrutura | deve retornar 500 AppError ao dar erro no segundo Redis.set | 500 `REDIS_SAVE_ERROR` ("Erro ao salvar email na fila de cooldown."); 2 `set`; e-mail enviado 1x |
| Erro de infraestrutura | deve retornar 500 AppError caso o envio do email falhe | O mesmo `AppError` do repository sobe sem alteração (`toBe`); 1 `set` (cooldown não gravado) |

Não cobertos neste método: falha do `findByEmail`, do `exists` e do `hash` (o service não trata esses erros; eles sobem crus e viram 500 no `handleError`).

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

### 4.4 `resendEmailCode.unit.test.ts` — `AuthUserService.resendEmailCode` (11 casos)

**Mocks:** `ArgonHash` (automock, `argonHash` → `'new-hashed-code'`), `verifyKeyExists` (automock), `redis` (factory com `get` e `set`), `AuthUserRepository` (automock), `generateCode` (factory, retorna `'654321'`).

| Categoria | Caso | Verifica |
|---|---|---|
| Sucesso | deveria reenviar o código e retornar o email | Retorno `{ email }` |
| Colaboração | deveria verificar o cooldown e buscar o cadastro pendente com as keys corretas | `verifyKeyExists('verify-email-cooldown-{email}')`; `get('verify-email-{email}')` |
| Colaboração | deveria hashear o novo código antes de salvar no Redis | `argonHash('654321')`, 1 chamada |
| Colaboração | deveria regravar o cadastro com o hash do novo código e o cooldown com os TTLs corretos | 1º `set`: dados anteriores + `code` com hash, `EX 600`; 2º `set`: cooldown, `1`, `EX 60`; 2 chamadas |
| Regressão (ISS-03) | não deveria salvar o código em texto puro no Redis | `code` salvo ≠ código gerado |
| Colaboração | deveria enviar o código em texto puro por email | `{ email, code: '654321' }` |
| Erro de negócio | deveria gerar ConflictError caso o cooldown do email ainda estiver ativo | 409 `LIMIT_ATTEMPTS`; sem `get`, `set` e e-mail |
| Erro de negócio | deveria gerar ConflictError caso o cadastro pendente tenha expirado | 409 `TIME_OUT_REGISTER`; sem `set` e e-mail |
| Erro de infraestrutura | deveria lançar AppError se o redis.get falhar | 500 `REDIS_GET_ERROR`; sem `set` |
| Erro de infraestrutura | deveria lançar AppError se o primeiro redis.set (code) falhar | 500 `REDIS_SAVE_ERROR`; 1 `set`; e-mail não enviado |
| Erro de infraestrutura | deveria lançar AppError se o segundo redis.set (email cooldown) falhar | 500 `REDIS_SAVE_ERROR`; e-mail já enviado |

Não cobertos neste método: falha do `verifyKeyExists`, do `argonHash` e do `sendEmailVerificationCode`.

### 4.5 `create.unit.test.ts` — `ClientsService.create` (5 casos)

**Mocks:** `ClientsRepository` (automock).

| Categoria | Caso | Verifica |
|---|---|---|
| Sucesso | deveria criar o cliente e retornar os dados cadastrados | Retorno = cliente criado |
| Colaboração | deveria verificar duplicidade do CPF/CNPJ apenas entre os clientes do usuário | `searchClientByCnpjCpf(cnpjCpf, userId)` |
| Colaboração | deveria criar o cliente vinculado ao userId recebido | `create(data)` com o `userId` recebido do controller |
| Erro de negócio | deveria gerar ConflictError caso o CPF/CNPJ já esteja cadastrado para o usuário | 409 `CLIENT_ALREADY_EXISTS`; `create` não chamado |
| Erro de infraestrutura | deveria propagar o AppError do repositório se a criação falhar | 500 `INTERNAL_SERVER_ERROR` |

Método com cobertura completa de ramos e dependências. A origem do `userId` (`req.user`, ISS-04) fica no controller, que não tem testes unitários.

### 4.6 `edit.unit.test.ts` — `ClientsService.edit` (10 casos)

**Mocks:** `ClientsRepository` (automock).

| Categoria | Caso | Verifica |
|---|---|---|
| Sucesso | deveria editar o cliente e retornar os dados atualizados | Retorno = cliente atualizado |
| Colaboração | deveria buscar o cliente pelo id e pelo userId do usuário autenticado | `searchClientById(id, userId)` |
| Colaboração | deveria verificar duplicidade do CPF/CNPJ apenas entre os clientes do usuário | `searchClientByCnpjCpf(cnpjCpf, userId)` |
| Ramo condicional | não deveria verificar duplicidade quando o CPF/CNPJ não for enviado | `searchClientByCnpjCpf` não chamado |
| Regressão (ISS-15) | deveria permitir reenviar o próprio CPF/CNPJ do cliente | Registro encontrado com o mesmo `id` não gera conflito |
| Colaboração | deveria editar o cliente filtrando pelo id e pelo userId | `edit(id, userId, data)` |
| Erro de negócio (ISS-05) | deveria gerar NotFoundError caso o cliente não exista ou pertença a outro usuário | 404 `INVALID_ID_CLIENT`; `edit` não chamado |
| Erro de negócio | deveria gerar ConflictError caso o CPF/CNPJ pertença a outro cliente do usuário | 409 `CLIENT_ALREADY_EXISTS`; `edit` não chamado |
| Erro de infraestrutura | deveria propagar o AppError do repositório se a busca do cliente falhar | 500 `INTERNAL_SERVER_ERROR`; `edit` não chamado |
| Erro de infraestrutura | deveria propagar o AppError do repositório se a edição falhar | 500 `INTERNAL_SERVER_ERROR` |

Método com cobertura completa de ramos e dependências.

### 4.7 `delete.unit.test.ts` — `ClientsService.delete` (6 casos)

**Mocks:** `ClientsRepository` (automock).

| Categoria | Caso | Verifica |
|---|---|---|
| Sucesso | deveria excluir o cliente e retornar os dados excluídos | Retorno = cliente excluído |
| Colaboração | deveria buscar o cliente pelo id e pelo userId do usuário autenticado | `searchClientById(id, userId)` |
| Colaboração | deveria excluir o cliente filtrando pelo id e pelo userId | `delete(id, userId)` |
| Erro de negócio (ISS-05) | deveria gerar NotFoundError caso o cliente não exista ou pertença a outro usuário | 404 `INVALID_ID_CLIENT`; `delete` não chamado |
| Erro de infraestrutura | deveria propagar o AppError do repositório se a busca do cliente falhar | 500 `INTERNAL_SERVER_ERROR`; `delete` não chamado |
| Erro de infraestrutura | deveria propagar o AppError do repositório se a exclusão falhar | 500 `INTERNAL_SERVER_ERROR` |

Método com cobertura completa de ramos e dependências.

### 4.8 `getById.unit.test.ts` — `ClientsService.getById` (4 casos)

**Mocks:** `ClientsRepository` (automock).

| Categoria | Caso | Verifica |
|---|---|---|
| Sucesso | deveria retornar o cliente encontrado | Retorno = cliente |
| Colaboração | deveria buscar o cliente pelo id e pelo userId do usuário autenticado | `searchClientById(id, userId)` |
| Erro de negócio (ISS-05) | deveria gerar NotFoundError caso o cliente não exista ou pertença a outro usuário | 404 `INVALID_ID_CLIENT` |
| Erro de infraestrutura | deveria propagar o AppError do repositório se a busca falhar | 500 `INTERNAL_SERVER_ERROR` |

Método com cobertura completa de ramos e dependências.

---

## 5. Lacunas e prioridades

Ordem sugerida para ampliar a cobertura, mantendo o padrão de [`strategy.md`](./strategy.md):

| Prioridade | Alvo | Cenários principais |
|---|---|---|
| 1 | `AuthUserService.confirmEmail` | Sucesso (cria usuário); chave ausente → 401 `INVALID_OR_EXPIRED_CODE`; código inválido → 401 `INVALID_CODE`; falha `redis.get` → `REDIS_GET_ERROR`; falha `createUser` |
| 1 | `AuthUserService.refreshToken` | Sucesso com rotação (`del` antigo + `set` novo); `jti` ausente → `INVALID_TOKEN`; JWT expirado → `TOKEN_EXPIRED`; JWT inválido → `INVALID_TOKEN`; falha do `set` → `REDIS_SAVE_ERROR`; erro inesperado → `INTERNAL_SERVER_ERROR` (mockar `jsonwebtoken`) |
| 1 | `AuthUserService.confirmCodeRecovery` | Sucesso (novo UUID, `authorized: true`, `del` antigo); chave ausente; `attempts >= 5` → `del` + `LIMIT_ATTEMPTS`; incremento com `KEEPTTL`; código inválido; falhas do Redis |
| 2 | `ClientsService.getAll` | Repassa `userId` e filtros ao repositório; lista vazia; falha do repositório |
| 2 | `AuthUserService.sendCodeRecovery` | E-mail inexistente → `INVALID_CREDENTIALS`; chave/TTL/JSON do Redis; envio do e-mail |
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
