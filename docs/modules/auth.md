---
title: "Módulo auth"
description: "Cadastro com verificação de e-mail, login, refresh token, logout e recuperação de senha: endpoints, regras, Redis, tokens e testes."
type: module
tags:
  - "auth"
  - "autenticacao"
  - "jwt"
  - "cookies"
  - "redis"
  - "senha"
  - "email"
modules:
  - "auth"
sources:
  - "src/modules/auth/"
  - "src/shared/email/"
  - "tests/unit/auth/"
related:
  - "modules/user.md"
  - "api/authentication.md"
  - "infrastructure/redis.md"
last_reviewed: 2026-11-15
---

# Módulo `auth`

> **Escopo:** responsabilidades, arquivos, endpoints, regras de negócio, uso do Redis, tokens/cookies e testes do módulo de autenticação.
> **Documentos relacionados:** [`user.md`](./user.md) (repositório da tabela `users`) · [`clients.md`](./clients.md) · [`../architecture/request-lifecycle.md`](../architecture/request-lifecycle.md#5-fluxos-de-autenticação) (diagramas dos fluxos) · [`../architecture/conventions.md`](../architecture/conventions.md) · [`../database/schema.md`](../database/schema.md#31-users-model-user)
> **Fonte da verdade:** `src/modules/auth/` e `src/shared/email/` no repositório `orcafacil-api`.
> **Última revisão:** 2026-11-15.

---

## 1. Responsabilidade

O módulo `auth` cuida de **toda a identidade e sessão do usuário**:

1. **Cadastro com verificação de e-mail** — o usuário só é criado em `users` depois de confirmar um código de 6 dígitos enviado por e-mail.
2. **Login** — valida credenciais e emite access token + refresh token em cookies `httpOnly`.
3. **Renovação de sessão** — troca o refresh token por um novo par de tokens (rotação).
4. **Logout** — invalida o refresh token e limpa os cookies.
5. **Recuperação de senha** — fluxo em três etapas com código por e-mail e `tokenUUID`.

Ele **não** protege rotas — isso é feito pelo middleware `authenticate` (`src/middlewares/authenticate.ts`), que valida o access token emitido por este módulo e preenche `req.user`.

Todas as rotas do módulo são **públicas** (sem `authenticate`) e ficam sob o prefixo **`/user/auth`**.

---

## 2. Arquivos

| Arquivo | Conteúdo |
|---|---|
| `auth.route.ts` | `AuthUserRoutes`: 9 rotas `POST`, cada uma com `rateLimit` e (quando há body) `validateSchema`. |
| `auth.controller.ts` | `AuthUserController`: extrai dados de `req.body`/`req.cookies`, chama o service, seta/limpa cookies, responde `ApiResponse`. |
| `auth.service.ts` | `AuthUserService`: todas as regras de negócio (Redis, hash, tokens, criação de usuário, troca de senha, envio dos e-mails de código). |
| `auth.schema.ts` | `authSchemas`: schemas Zod de cada rota. |
| `auth.dtos.ts` | `AuthDTOs`: formatos de request/response. |
| `auth.types.ts` | `AuthTypes`: `EmailCode { email, code }`. **Sem uso** desde que o envio passou para o `EmailSender` (ver ISS-34). |

O módulo não tem repository próprio: o banco é acessado pelo `UserRepository`, e o e-mail sai pelo `EmailSender` (seção 4.10).

### Dependências

| Dependência | Uso |
|---|---|
| `UserRepository` (`@/modules/user/user.repository`) | Buscar usuário por e-mail, criar usuário, ler credenciais, atualizar hash da senha. |
| `redis` (`@/lib/redis`) | Cadastros pendentes, cooldown, whitelist de refresh tokens, recuperação de senha. |
| `ArgonHash` | Hash/verificação de senhas e códigos (Argon2id + `PEPPER`). |
| `generateCode` | Código numérico de 6 dígitos (`crypto.randomInt`). |
| `generateTokens` | Gera access e refresh JWT. |
| `verifyKeyExists` | Verifica existência de chave no Redis (cooldown). |
| `AuthCookies` | Seta e limpa os cookies de autenticação. |
| `randomUUID` (`crypto`) | `jti` dos refresh tokens e `tokenUUID` da recuperação de senha. |
| `EmailSender` (`@/shared/email/EmailSender`) | Envio dos e-mails de código. O service recebe a interface pelo construtor; o `container.ts` injeta o `SmtpEmailSender`. |
| `verifyEmailCode`, `recoveryPasswordCode` (`@/shared/email/templates/`) | Montam assunto, HTML e texto dos e-mails de código. |

---

## 3. Endpoints

Prefixo: `/user/auth`. Todos respondem **200** com `ApiResponse` em caso de sucesso.

| Método e rota | Rate limit (req/60 s) | Body (schema) | `data` na resposta | Cookies |
|---|---|---|---|---|
| `POST /email/verify` | 2 | `verifyEmailSchema` | `{ email, name, cnpjCpf }` | — |
| `POST /email/confirm` | 5 | `confirmEmailSchema` | `{ id, cnpjCpf, email, name, createdAt }` | — |
| `POST /email/resend-email-code` | 1 | `resendCodeEmailSchema` | `{ email }` | — |
| `POST /login` | 5 | `loginSchema` | `null` | **Seta** `accessToken` e `refreshToken` |
| `POST /refresh-token` | 10 | — | `null` | Lê `refreshToken`; **seta** novos tokens |
| `POST /password-recovery/send-code` | 1 | `sendCodeRecoverySchema` | `{ tokenUUID }` | — |
| `POST /password-recovery/confirm-code` | 10 | `confirmCodeRecoverySchema` | `{ tokenUUID }` (novo) | — |
| `POST /password-recovery/new-password` | 3 | `createNewPasswordSchema` | `null` | — |
| `POST /logout` | 1 | — | `null` | Lê `refreshToken`; **limpa** os dois cookies |

### Schemas de entrada (`auth.schema.ts`)

| Schema | Campos |
|---|---|
| `verifyEmailSchema` | `name` (1–100), `cnpjCpf` (`isValidCnpjCpf`), `email` (e-mail, ≤255), `password` (8–128), `confirmPassword` (8–128) — `.refine`: senhas iguais (erro em `confirmPassword`) |
| `confirmEmailSchema` | `email`, `code` (exatamente 6 dígitos numéricos) |
| `resendCodeEmailSchema` | `email` |
| `loginSchema` | `email`, `password` (8–128) |
| `sendCodeRecoverySchema` | `email` |
| `confirmCodeRecoverySchema` | `tokenUUID` (UUID), `code` (6 dígitos) |
| `createNewPasswordSchema` | `tokenUUID` (UUID), `newPassword` (8–128), `confirmNewPassword` (8–128) — `.refine`: senhas iguais (erro em `confirmNewPassword`) |

---

## 4. Funcionamento detalhado (`AuthUserService`)

### 4.1 `verifyEmail(data)` — início do cadastro

1. `UserRepository.findByEmail(email)` → se existir: `ConflictError` 409 `USER_ALREADY_EXISTS`.
2. Gera o hash da senha com `ArgonHash.argonHash(password)`.
3. `verifyKeyExists('verify-email-cooldown-{email}')` → se existir: `ConflictError` 409 `LIMIT_ATTEMPTS`.
4. Gera o código (`generateCode`) e o hash dele.
5. Grava no Redis `verify-email-{email}` = `{ code: <hash>, name, cnpjCpf, password: <hash> }` com TTL **600 s**.
6. Envia o código em texto puro por e-mail, com o template `verifyEmailCode` (seção 4.10).
7. Grava `verify-email-cooldown-{email}` = `1` com TTL **60 s**.
8. Retorna `{ email, name, cnpjCpf }`.

> Nenhum registro é criado no PostgreSQL nesta etapa.

### 4.2 `confirmEmail({ email, code })` — conclusão do cadastro

1. Lê `verify-email-{email}` no Redis → ausente: `UnauthorizedError` 401 `EXPIRED_CODE`.
2. `ArgonHash.argonVerify(hashDoCodigo, code)` → falso: `UnauthorizedError` 401 `INVALID_CODE`.
3. `UserRepository.createUser({ email, cnpjCpf, name, password: <hash> })` → insere em `users`.
4. Retorna `{ id, cnpjCpf, email, name, createdAt }`.

### 4.3 `resendEmailCode({ email })` — reenvio do código

1. Cooldown `verify-email-cooldown-{email}` ativo → `ConflictError` 409 `LIMIT_ATTEMPTS`.
2. Lê `verify-email-{email}` (falha do Redis → 500 `REDIS_GET_ERROR`) → ausente: `ConflictError` 409 `TIME_OUT_REGISTER` (o cadastro pendente expirou; é preciso chamar `/email/verify` de novo).
3. Gera um novo código, calcula o hash Argon2 (`ArgonHash.argonHash`) e regrava `verify-email-{email}` com os mesmos dados e o **hash** do novo código, renovando o TTL para 600 s. O código só existe em texto puro no e-mail enviado.
4. Envia o novo código por e-mail (template `verifyEmailCode`) e regrava o cooldown (60 s).
5. Retorna `{ email }`.

### 4.4 `login({ email, password })`

1. `UserRepository.returnLoginCredentials(email)` (único método que lê o hash da senha) → ausente: `UnauthorizedError` 401 `INVALID_CREDENTIALS`.
2. `ArgonHash.argonVerify(hash, password)` → falso: 401 `INVALID_CREDENTIALS` (mesma mensagem `'Credenciais inválidas'` nos dois casos).
3. `ArgonHash.argonRehash(password, hash)` → se os parâmetros do Argon2 mudaram, retorna um novo hash e o service chama `UserRepository.updatePasswordHash`.
4. Gera `jti = randomUUID()` e `generateTokens(userId, jti)`.
5. Grava `refresh-token-{jti}` = `userId` com TTL **604800 s** (7 dias).
6. Retorna `{ accessToken, refreshToken }`; o controller grava os cookies com `AuthCookies.setAuthCookies` e responde `data: null`.

### 4.5 `refreshToken(refreshToken)` — rotação de sessão

1. O controller lê `req.cookies.refreshToken` → ausente: `UnauthorizedError` 401.
2. `jwt.verify(refreshToken, JWT_REFRESH_SECRET)` → extrai `jti` e `sub`.
3. `redis.exists('refresh-token-{jti}')` → ausente: 401 `INVALID_TOKEN` (token revogado ou já usado).
4. Apaga a chave antiga, gera novo `jti` e novos tokens, grava `refresh-token-{novoJti}` (7 dias).
5. Retorna os novos tokens; o controller regrava os cookies.

Mapeamento de erros: `TokenExpiredError` → 401 `TOKEN_EXPIRED`; `JsonWebTokenError` → 401 `INVALID_TOKEN`; `AppError` é repassado; qualquer outro → 500 `INTERNAL_SERVER_ERROR`.

### 4.6 `sendCodeRecovery(email)` — recuperação, etapa 1

1. `UserRepository.findByEmail(email)` → ausente: `UnauthorizedError` 401 `INVALID_CREDENTIALS`.
2. Gera `tokenUUID`, código e hash do código.
3. Grava `recovery-password-{tokenUUID}` = `{ id, code: <hash>, authorized: false, attempts: 0 }` com TTL 600 s.
4. Envia o código por e-mail com o template `recoveryPasswordCode`.
5. Retorna `{ tokenUUID }` — o frontend guarda esse valor para as próximas etapas.

### 4.7 `confirmCodeRecovery({ tokenUUID, code })` — recuperação, etapa 2

1. Lê `recovery-password-{tokenUUID}` → ausente: 401 `EXPIRED_CODE`.
2. `attempts >= 5` → apaga a chave e lança 401 `LIMIT_ATTEMPTS`.
3. Incrementa `attempts` e regrava com `KEEPTTL` (a tentativa é contada **antes** da verificação).
4. `argonVerify` do código → falso: 401 `INVALID_CODE`.
5. Gera um **novo** `tokenUUID`, grava `recovery-password-{novo}` com `authorized: true` (TTL 600 s) e apaga a chave antiga.
6. Retorna `{ tokenUUID: novo }`.

### 4.8 `createNewPassword({ tokenUUID, newPassword })` — recuperação, etapa 3

1. Lê `recovery-password-{tokenUUID}` → ausente: 401 `INVALID_TOKEN`.
2. `authorized !== true` → 401 `UNAUTHORIZED_USER`.
3. `UserRepository.updatePasswordHash(id, argonHash(newPassword))`.
4. Sem retorno; o controller responde `data: null`.

### 4.9 `logout(refreshToken)`

1. `jwt.verify` do refresh token → extrai `jti`.
2. `redis.del('refresh-token-{jti}')` (falha → 500 `REDIS_DEL_ERROR`).
3. O controller limpa os cookies com `AuthCookies.clearAuthCookies` e responde `data: null`.

Erros de JWT: `JsonWebTokenError` → 401 `INVALID_TOKEN`; `TokenExpiredError` → 401 `TOKEN_EXPIRED`.

### 4.10 Envio de e-mail

Os três envios (`verifyEmail`, `resendEmailCode` e `sendCodeRecovery`) passam pelo método privado `sendEmail(message)`:

```ts
await this.sendEmail({to: data.email, ...verifyEmailCode({code, expiresInMinutes: CODE_TTL_MINUTES})})
```

1. O template (`verifyEmailCode` ou `recoveryPasswordCode`, em `src/shared/email/templates/`) devolve `{ subject, html, text }`; o service acrescenta o `to`.
2. `sendEmail` chama `EmailSender.send`. Qualquer erro do provedor (timeout, autenticação, conexão recusada) vira `AppError` 500 `SEND_EMAIL_CODE_ERROR` com a mensagem `'Erro ao enviar email de verificação'`, nos três fluxos.
3. `CODE_TTL_MINUTES` (10) é o prazo mostrado no e-mail. Ele precisa acompanhar o TTL das chaves `verify-email-{email}` e `recovery-password-{uuid}` (600 s), que continua escrito à parte.

Regras dos templates:

- O código vai só no corpo, nunca no assunto (o assunto aparece na tela bloqueada).
- O nome do cadastro não entra no e-mail: antes da confirmação, ele é texto de quem cadastrou, que pode não ser o dono da caixa.
- Todo texto passa por `escapeHtml` em `renderEmail` (`templates/Layout.ts`), que monta o HTML e o texto puro a partir do mesmo conteúdo.

Trocar o provedor (outro SMTP, Mailpit no desenvolvimento) é só mudar as variáveis `SMTP_*` e `EMAIL_FROM` ([`../infrastructure/environment.md`](../infrastructure/environment.md#2-variáveis-de-ambiente)). Um provedor que não fale SMTP (API HTTP) pede uma nova classe que implemente `EmailSender`, instanciada no `container.ts`.

---

## 5. Redis usado pelo módulo

| Chave | Valor | TTL | Criada em | Removida em |
|---|---|---|---|---|
| `verify-email-{email}` | `{ code (hash), name, cnpjCpf, password (hash) }` | 600 s | `verifyEmail`, `resendEmailCode` | Expiração |
| `verify-email-cooldown-{email}` | `1` | 60 s | `verifyEmail`, `resendEmailCode` | Expiração |
| `refresh-token-{jti}` | `userId` | 604800 s | `login`, `refreshToken` | `refreshToken` (rotação), `logout`, expiração |
| `recovery-password-{uuid}` | `{ id, code (hash), authorized, attempts }` | 600 s | `sendCodeRecovery`, `confirmCodeRecovery` | `confirmCodeRecovery` (troca de UUID ou 5 tentativas), expiração |
| `rate-limit-auth/...-{ip}` | contador | 60 s | middleware `rateLimit` | Expiração |

---

## 6. Tokens e cookies

| | Access token | Refresh token |
|---|---|---|
| Payload | `{ sub: userId }` | `{ sub: userId, jti }` |
| Segredo | `JWT_ACCESS_SECRET` | `JWT_REFRESH_SECRET` |
| Expiração do JWT | 15 min | 7 dias |
| Cookie | `accessToken`, `maxAge` 15 min | `refreshToken`, `maxAge` 7 dias, `path: '/'` |
| Opções do cookie | `httpOnly`, `sameSite: 'strict'`, `secure` em produção | idem |
| Validado por | middleware `authenticate` | `AuthUserService.refreshToken` / `logout` + whitelist no Redis |

Os tokens nunca vão no corpo da resposta.

---

## 7. Códigos de erro do módulo

| Código | Status | Quando |
|---|---|---|
| `USER_ALREADY_EXISTS` | 409 | E-mail já cadastrado (`verifyEmail`). |
| `LIMIT_ATTEMPTS` | 409 / 401 | Cooldown de envio ativo (409) ou 5 tentativas na recuperação (401). |
| `TIME_OUT_REGISTER` | 409 | Cadastro pendente expirou ao reenviar o código. |
| `INVALID_OR_EXPIRED_CODE` (`ErrorCode.EXPIRED_CODE`) | 401 | Chave de verificação/recuperação inexistente no Redis. |
| `INVALID_CODE` | 401 | Código informado não confere. |
| `INVALID_CREDENTIALS` | 401 | E-mail inexistente ou senha incorreta. |
| `INVALID_TOKEN` | 401 | Refresh token inválido/revogado ou `tokenUUID` inexistente. |
| `TOKEN_EXPIRED` | 401 | Refresh token expirado. |
| `UNAUTHORIZED_USER` | 401 | `tokenUUID` sem `authorized: true`. |
| `SEND_EMAIL_CODE_ERROR` | 500 | Falha no envio pelo `EmailSender` (convertida em `sendEmail`). |
| `REDIS_SAVE_ERROR` / `REDIS_GET_ERROR` / `REDIS_DEL_ERROR` | 500 | Falha no Redis. |
| `USER_CREATION_FAILED`, `QUERY_DATABASE_ERROR`, `UPDATE_DATABASE_ERROR` | 500 | Falhas do `UserRepository`. |

---

## 8. Testes

Local: `tests/unit/auth/` (Vitest, dependências mockadas).

| Arquivo | Método | Cobertura |
|---|---|---|
| `verifyEmail.unit.test.ts` | `verifyEmail` | Retorno; `findByEmail`, cooldown (`Redis.exists`), hash de senha e código; chaves, JSON e TTLs do Redis; e-mail enviado pelo `EmailSender.send` com destinatário, assunto e o mesmo código do hash no HTML e no texto; erros de negócio (e-mail existente, cooldown); falhas dos dois `Redis.set`; falha do envio convertida em 500 `SEND_EMAIL_CODE_ERROR`. |
| `login.unit.test.ts` | `login` | Retorno dos tokens e gravação do refresh token no Redis; e-mail inexistente; senha incorreta; rehash; falha do `Redis.set`. |

Métodos ainda sem testes: `confirmEmail`, `resendEmailCode`, `refreshToken`, `sendCodeRecovery`, `confirmCodeRecovery`, `createNewPassword`, `logout`. O `SmtpEmailSender` e os templates de e-mail também não têm testes ([`../testing/test-coverage.md`](../testing/test-coverage.md#5-lacunas-e-prioridades)).
