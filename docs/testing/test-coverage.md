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
  - "src/shared/email/"
related:
  - "testing/strategy.md"
  - "modules/auth.md"
  - "modules/clients.md"
last_reviewed: 2026-11-15
---

# Testes — Cobertura

> **Escopo:** o que está coberto por testes no `orcafacil-api` hoje: resultado da última execução, matriz de cobertura por módulo, método e camada, inventário de cenários de cada arquivo de teste, lacunas e prioridades, e como medir cobertura de código.
> **Documentos relacionados:** [`strategy.md`](./strategy.md) · [`../modules/auth.md`](../modules/auth.md) · [`../modules/clients.md`](../modules/clients.md) · [`../modules/user.md`](../modules/user.md)
> **Fonte da verdade:** `tests/unit/` no repositório `orcafacil-api`. Atualize este documento sempre que testes forem adicionados ou removidos.
> **Última revisão:** 2026-11-15.

---

## 1. Situação atual

Execução de `npm run test:unit:run` em 2026-11-15 (Vitest 4.1.9):

```
Test Files  2 passed (2)
     Tests  11 passed (11)
  Duration  ~0.3s
```

Os 4 arquivos de teste de `clients` estavam vazios desde a passagem para classes instanciáveis e foram removidos em 2026-11-15: o Vitest acusava `No test suite found` neles e derrubava o CI.

| Indicador | Valor |
|---|---|
| Arquivos de teste | 2 |
| Casos de teste (`it`) | 11 |
| Módulos com testes | 1 de 3 (`auth`) |
| Métodos de service testados | 2 de 14 |
| Testes de integração / E2E | 0 (removidos) |
| Cobertura de linhas | Não medida (sem provider de coverage instalado) |

---

## 2. Matriz de cobertura por método de service

| Módulo | Método | Testado | Arquivo | Casos |
|---|---|---|---|---|
| `auth` | `AuthUserService.verifyEmail` | ✅ | `tests/unit/auth/verifyEmail.unit.test.ts` | 6 |
| `auth` | `AuthUserService.confirmEmail` | ❌ | — | — |
| `auth` | `AuthUserService.resendEmailCode` | ❌ | — (arquivo removido) | — |
| `auth` | `AuthUserService.login` | ✅ | `tests/unit/auth/login.unit.test.ts` | 5 |
| `auth` | `AuthUserService.refreshToken` | ❌ | — | — |
| `auth` | `AuthUserService.sendCodeRecovery` | ❌ | — | — |
| `auth` | `AuthUserService.confirmCodeRecovery` | ❌ | — | — |
| `auth` | `AuthUserService.createNewPassword` | ❌ | — (arquivo removido) | — |
| `auth` | `AuthUserService.logout` | ❌ | — | — |
| `clients` | `ClientsService.create` | ❌ | — (arquivo vazio removido) | — |
| `clients` | `ClientsService.edit` | ❌ | — (arquivo vazio removido) | — |
| `clients` | `ClientsService.delete` | ❌ | — (arquivo vazio removido) | — |
| `clients` | `ClientsService.getAll` | ❌ | — | — |
| `clients` | `ClientsService.getById` | ❌ | — (arquivo vazio removido) | — |
| `user` | `UserService` | — | Classe vazia | — |

---

## 3. Cobertura por camada

| Camada | Itens | Testados |
|---|---|---|
| Services | `AuthUserService` (9 métodos), `ClientsService` (5) | 2 métodos (`verifyEmail` e `login`) |
| Controllers | `AuthUserController`, `ClientsController`, `ProductsController` | 0 |
| Repositórios | `UserRepository`, `ClientsRepository`, `ProductsRepository` | 0 (substituídos por objetos falsos nos testes de service) |
| Integrações | `SmtpEmailSender` | 0 (substituído por `{ send: vi.fn() }` nos testes de service) |
| Templates de e-mail | `renderEmail`, `escapeHtml`, `verifyEmailCode`, `recoveryPasswordCode` | Indireto: o teste de `verifyEmail` usa o template real e confere assunto, HTML e texto |
| Middlewares | `authenticate`, `rateLimit`, `validateSchema`, `handleError` | 0 |
| Schemas Zod | `authSchemas`, `ClientsSchema` | 0 |
| Utilitários | `ArgonHash`, `TokenService`, `generateCode`, `isValidCnpjCpf`, `AuthCookies` | 0 (`generateCode` roda de verdade no teste de `verifyEmail`) |

---

## 4. Inventário de cenários

Os dois arquivos seguem o mesmo modelo: um `makeSut()` cria objetos falsos com `vi.fn()` e os injeta no construtor de `AuthUserService`, na ordem `UserRepository`, `ArgonHash`, `Redis`, `TokenService`, `EmailSender`. Nada é mockado com `vi.mock`.

### 4.1 `verifyEmail.unit.test.ts` — `AuthUserService.verifyEmail` (6 casos)

**Falsos:** `UserRepository.findByEmail` (padrão `null`), `ArgonHash.hash` (1ª chamada `'hashed-password'`, 2ª `'hashed-code'`), `Redis.exists` (padrão `0`), `Redis.set` (padrão `'OK'`), `EmailSender.send` (padrão: resolve). O `TokenService` entra como `{}`, porque o método não usa. O `generateCode` e o template `verifyEmailCode` não são substituídos: rodam de verdade.

Os testes de erro verificam só o erro e até onde o fluxo chegou. O conteúdo do payload, os argumentos de cada colaborador e o conteúdo do e-mail ficam no caso de sucesso.

| Categoria | Caso | Verifica |
|---|---|---|
| Sucesso + colaboração | deve retornar os dados de cadastro do usuário | Retorno `{ email, name, cnpjCpf }`; `findByEmail(email)`; `hash` 1º com a senha, 2º com um código de 6 dígitos; `exists('verify-email-cooldown-{email}')`; 1º `set`: `verify-email-{email}`, JSON `{ code, name, cnpjCpf, password }` com os hashes, `EX 600`; 2º `set`: cooldown, `1`, `EX 60`; `EmailSender.send` com `to` e o assunto `'Confirme seu e-mail no OrçaFácil'`; o código que foi para o hash aparece no `text` e no `html` do e-mail |
| Erro de negócio | deve retornar 409 ConflictError caso o email já tenha usuário vinculado | 409 `USER_ALREADY_EXISTS`; sem hash, `exists`, `set` e envio |
| Erro de negócio | deve retornar 409 ConflictError caso o email esteja em cooldown no redis | 409 `LIMIT_ATTEMPTS`; 1 hash (senha, ver ISS-29); sem `set` e sem envio |
| Erro de infraestrutura | deve retornar 500 AppError ao dar erro no primeiro Redis.set | 500 `REDIS_SAVE_ERROR` ("Erro ao salvar código de verificação."); 1 `set`; e-mail não enviado |
| Erro de infraestrutura | deve retornar 500 AppError ao dar erro no segundo Redis.set | 500 `REDIS_SAVE_ERROR` ("Erro ao salvar email na fila de cooldown."); 2 `set`; e-mail enviado 1x |
| Erro de infraestrutura | deve retornar 500 AppError caso o envio do email falhe | `EmailSender.send` rejeita com `Error('ETIMEDOUT')`; o service converte em 500 `SEND_EMAIL_CODE_ERROR` ("Erro ao enviar email de verificação"); 1 `set` (cooldown não gravado) |

Não cobertos neste método: falha do `findByEmail`, do `exists` e do `hash` (o service não trata esses erros; eles sobem crus e viram 500 no `handleError`).

### 4.2 `login.unit.test.ts` — `AuthUserService.login` (5 casos)

**Falsos:** `UserRepository.returnLoginCredentials` (padrão: usuário `id: 1` com `password: 'hash-salvo'`), `UserRepository.updatePasswordHash`, `ArgonHash.verify` (padrão `true`), `ArgonHash.rehash` (padrão `null`), `Redis.set` (padrão `'OK'`), `TokenService.generateAccessToken` (`'access'`) e `generateRefreshToken` (`'refresh'`). O `EmailSender` entra como `{ send: vi.fn() }`, porque o método não usa. O `randomUUID` roda de verdade.

| Categoria | Caso | Verifica |
|---|---|---|
| Sucesso + colaboração | deve retornar os tokens e salvar o refresh token no Redis | Retorno `{ accessToken, refreshToken }`; `returnLoginCredentials(email)`; `verify('hash-salvo', senha)`; `rehash(senha, 'hash-salvo')`; sem `updatePasswordHash`; `generateRefreshToken({ userId: '1', jti })`; `set('refresh-token-…', 1, 'EX', 604800)` |
| Erro de negócio | recusa com 401 quando email não existe | 401 `INVALID_CREDENTIALS` |
| Erro de negócio | recusa com 401 quando a senha está incorreta | 401 `INVALID_CREDENTIALS`; nenhum token gerado |
| Ramo condicional | rehash necessário | `updatePasswordHash(1, 'hash-novo')`; tokens retornados |
| Erro de infraestrutura | deve retornar REDIS_SAVE_ERROR caso redis falhe ao salvar refresh token | 500 `REDIS_SAVE_ERROR`; 1 `set` |

Não cobertos neste método: falha do `returnLoginCredentials`, do `verify`, do `rehash`, do `updatePasswordHash` e da geração dos tokens.

---

## 5. Lacunas e prioridades

Ordem sugerida para ampliar a cobertura, mantendo o padrão de [`strategy.md`](./strategy.md):

| Prioridade | Alvo | Cenários principais |
|---|---|---|
| 1 | `ClientsService.create`, `edit`, `delete`, `getById` | Criar `tests/unit/clients/{create,edit,delete,getById}.unit.test.ts` no modelo `makeSut()`. Os arquivos antigos guardavam os testes de regressão de ISS-04, ISS-05 e ISS-15 (cliente sempre filtrado por `userId`, 404 `INVALID_ID_CLIENT` para cliente de outro usuário, reenvio do próprio CPF/CNPJ sem 409) |
| 1 | `AuthUserService.resendEmailCode` | Regressão de ISS-03 (o código vai para o Redis com hash, nunca em texto puro); cooldown → 409 `LIMIT_ATTEMPTS`; cadastro expirado → 409 `TIME_OUT_REGISTER`; envio com o template `verifyEmailCode`; falha do envio → 500 `SEND_EMAIL_CODE_ERROR`; falhas do `get` e dos dois `set` |
| 1 | `AuthUserService.confirmEmail` | Sucesso (cria usuário); chave ausente → 401 `INVALID_OR_EXPIRED_CODE`; código inválido → 401 `INVALID_CODE`; falha `Redis.get` → `REDIS_GET_ERROR`; falha `createUser` |
| 1 | `AuthUserService.refreshToken` | Sucesso com rotação (`del` antigo + `set` novo); token inválido → `INVALID_TOKEN`; `del` sem remover → `INVALID_TOKEN`; falha do `set` → `REDIS_SAVE_ERROR` |
| 1 | `AuthUserService.confirmCodeRecovery` | Sucesso (novo UUID, `authorized: true`, `del` antigo); chave ausente; `attempts >= 5` → `del` + `LIMIT_ATTEMPTS`; incremento com `KEEPTTL`; código inválido; falhas do Redis |
| 2 | `AuthUserService.createNewPassword` | Sucesso; `tokenUUID` inexistente → `INVALID_TOKEN`; `authorized: false` → `UNAUTHORIZED_USER`; falha do `Redis.get` → `REDIS_GET_ERROR`; falha do `updatePasswordHash` |
| 2 | `AuthUserService.sendCodeRecovery` | E-mail inexistente → `INVALID_CREDENTIALS`; chave/TTL/JSON do Redis; envio com o template `recoveryPasswordCode`; falha do envio → `SEND_EMAIL_CODE_ERROR` |
| 2 | `SmtpEmailSender` | Transporter criado uma vez para vários envios; `from` da configuração; `secure` na 465; `requireTLS` com login fora da 465; sem `auth` quando `user` é vazio (Mailpit); erro do nodemailer sobe sem conversão (mockar `nodemailer` com `vi.mock` + `vi.hoisted`) |
| 2 | Templates de e-mail | `renderEmail` com o mesmo conteúdo no HTML e no texto; `escapeHtml` nos 5 caracteres; código fora do assunto |
| 2 | `ClientsService.getAll` | Repassa `userId` e filtros ao repositório; lista vazia; falha do repositório |
| 2 | `AuthUserService.logout` | Sucesso (`del`); token inválido; falha do `del` |
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
