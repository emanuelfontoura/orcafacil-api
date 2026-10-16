# API — Autenticação

> **Escopo:** como a API autentica usuários e protege rotas: modelo de tokens, cookies, middleware `authenticate`, sessões no Redis, rotação de refresh token, logout, recuperação de senha, rate limit e como um cliente (frontend) deve consumir a autenticação.
> **Documentos relacionados:** [`endpoints.md`](./endpoints.md#3-autenticação-e-cadastro--userauth) · [`error-handling.md`](./error-handling.md) · [`../modules/auth.md`](../modules/auth.md) (implementação detalhada do service) · [`../architecture/request-lifecycle.md`](../architecture/request-lifecycle.md#5-fluxos-de-autenticação) (diagramas de sequência)
> **Fonte da verdade:** `src/modules/auth/`, `src/middlewares/authenticate.ts`, `src/shared/utils/generateTokens.ts`, `src/shared/utils/AuthCookies.ts`, `src/shared/utils/ArgonHash.ts`.
> **Última revisão:** 2026-10-15.

---

## 1. Modelo de autenticação

| Aspecto | Escolha |
|---|---|
| Tipo | **JWT stateless** para o access token + **whitelist no Redis** para o refresh token |
| Transporte | **Cookies `httpOnly`** (nunca header `Authorization`, nunca corpo da resposta) |
| Access token | 15 minutos |
| Refresh token | 7 dias, com **rotação** a cada uso |
| Identidade | `sub` do JWT = `users.id` |
| Senhas | Argon2id + pepper (`PEPPER`) |
| Cadastro | Em duas etapas, com confirmação de e-mail por código |
| Autorização | Não há papéis/perfis; todo usuário autenticado tem o mesmo nível de acesso aos próprios dados |

---

## 2. Tokens

Gerados por `generateTokens(userId, jti)` (`src/shared/utils/generateTokens.ts`):

| | Access token | Refresh token |
|---|---|---|
| Payload | `{ sub: userId }` | `{ sub: userId, jti }` |
| Assinatura | `JWT_ACCESS_SECRET` (HS256, padrão do `jsonwebtoken`) | `JWT_REFRESH_SECRET` |
| `expiresIn` | `15m` | `7d` |
| Estado no servidor | Nenhum | `refresh-token-{jti}` = `userId` no Redis (TTL 7 dias) |
| Revogável antes de expirar | Não | Sim (apagando a chave do Redis) |

O `jti` é um `randomUUID()` gerado a cada login e a cada refresh.

---

## 3. Cookies

Definidos por `AuthCookies` (`src/shared/utils/AuthCookies.ts`):

| Cookie | `maxAge` | `httpOnly` | `secure` | `sameSite` | `path` |
|---|---|---|---|---|---|
| `accessToken` | 15 min | sim | só se `NODE_ENV === 'production'` | `strict` | padrão |
| `refreshToken` | 7 dias | sim | só se `NODE_ENV === 'production'` | `strict` | `/` |

- `AuthCookies.setAuthCookies(res, tokens)` — usado em `login` e `refresh-token`.
- `AuthCookies.clearAuthCookies(res)` — usado em `logout`.
- A leitura é feita via `cookie-parser` (`req.cookies.accessToken`, `req.cookies.refreshToken`).
- Como são `httpOnly`, o JavaScript do frontend **não lê** os tokens; o navegador os envia automaticamente.

---

## 4. Protegendo rotas — middleware `authenticate`

Arquivo: `src/middlewares/authenticate.ts`.

```ts
const token = req.cookies.accessToken
if (!token) return next(new UnauthorizedError('Token não informado', ErrorCode.UNAUTHORIZED_USER))

const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload
req.user = payload.sub   // id do usuário, como string
next()
// erro no verify → UnauthorizedError('Token não autorizado', ErrorCode.UNAUTHORIZED_USER)
```

| Situação | Resposta |
|---|---|
| Cookie ausente | 401 `{ error: 'Token não informado', code: 'UNAUTHORIZED_USER' }` |
| Token inválido ou **expirado** | 401 `{ error: 'Token não autorizado', code: 'UNAUTHORIZED_USER' }` |
| Token válido | `req.user` preenchido e a requisição segue |

### Uso nas rotas

```ts
ClientsRoutes.get('/', rateLimit(100, 60, 'clients/getAll'), authenticate, ClientsController.getAll)
```

- Posição na cadeia: **depois** do `rateLimit` e **antes** do `validateSchema`.
- No controller, o id do usuário é obtido com `Number(req.user)`.
- `req.user` é tipado em `src/shared/types/express.d.ts` como `user?: string`.

### Rotas protegidas hoje

| Prefixo | Protegido |
|---|---|
| `/clients/*` | Sim (todas) |
| `/user/auth/*` | Não (todas públicas; `refresh-token` e `logout` validam o cookie `refreshToken` no próprio service) |

---

## 5. Fluxos

### 5.1 Cadastro

```
POST /user/auth/email/verify   → dados + hash da senha + hash do código no Redis (10 min); código por e-mail
POST /user/auth/email/confirm  → código conferido → INSERT em users
(opcional) POST /user/auth/email/resend-email-code → novo código (cooldown de 60 s)
```

O cadastro **não** faz login automático: após confirmar, o cliente deve chamar `/login`.

### 5.2 Login

```
POST /user/auth/login {email, password}
  → busca credenciais → argonVerify → (rehash se necessário)
  → gera jti + tokens → SET refresh-token-{jti}
  → Set-Cookie accessToken + refreshToken
```

E-mail inexistente e senha incorreta retornam a **mesma** resposta (401 `INVALID_CREDENTIALS`, `'Credenciais inválidas'`).

### 5.3 Renovação (refresh com rotação)

```
POST /user/auth/refresh-token  (cookie refreshToken)
  → jwt.verify(JWT_REFRESH_SECRET)
  → EXISTS refresh-token-{jti}?  não → 401 INVALID_TOKEN
  → DEL refresh-token-{jti}
  → novo jti + novos tokens → SET refresh-token-{novoJti}
  → Set-Cookie (novos)
```

Cada refresh token é de **uso único**: depois de usado, o `jti` antigo é apagado e reutilizá-lo retorna 401 `INVALID_TOKEN`.

### 5.4 Logout

```
POST /user/auth/logout  (cookie refreshToken)
  → jwt.verify → DEL refresh-token-{jti} → limpa os cookies
```

O access token já emitido continua válido até expirar (no máximo 15 min), pois não há blacklist de access tokens.

### 5.5 Recuperação de senha

```
POST /password-recovery/send-code    {email}                 → { tokenUUID }  (código por e-mail, 10 min)
POST /password-recovery/confirm-code {tokenUUID, code}       → { tokenUUID: novo, autorizado }  (máx. 5 tentativas)
POST /password-recovery/new-password {tokenUUID, newPassword, confirmNewPassword} → senha atualizada
```

A troca de senha **não** revoga as sessões (refresh tokens) existentes.

---

## 6. Senhas e códigos

`ArgonHash` (`src/shared/utils/ArgonHash.ts`):

| Método | Uso |
|---|---|
| `argonHash(valor)` | Hash Argon2id de `valor + PEPPER` (`memoryCost 65536`, `timeCost 3`, `parallelism 1`). |
| `argonVerify(hash, valor)` | Compara `valor + PEPPER` com o hash. |
| `argonRehash(valor, hash)` | Se o hash foi gerado com parâmetros diferentes dos atuais, retorna um novo hash; senão `null`. Usado no login para atualizar hashes antigos. |

- Senhas: 8 a 128 caracteres; armazenadas apenas como hash em `users.password`.
- Códigos de verificação: 6 dígitos (`generateCode`, `crypto.randomInt`), enviados em texto por e-mail e guardados como hash no Redis.

---

## 7. Proteção contra abuso

| Mecanismo | Onde | Detalhe |
|---|---|---|
| Rate limit por IP + rota | `rateLimit` em todas as rotas | `/email/verify` 2/min · `/email/confirm` 5/min · `/resend-email-code` 1/min · `/login` 5/min · `/refresh-token` 10/min · `/send-code` 1/min · `/confirm-code` 10/min · `/new-password` 3/min · `/logout` 1/min · `/clients/*` 100/min |
| Cooldown de envio de e-mail | `verify-email-cooldown-{email}` | 60 s entre envios de código de cadastro |
| Limite de tentativas | `recovery-password-{uuid}.attempts` | 5 tentativas por código de recuperação |
| Expiração de códigos | TTL do Redis | 10 minutos |
| Mensagem genérica no login | `AuthUserService.login` | Não revela se o e-mail existe |

---

## 8. Como o frontend deve consumir

1. **Enviar cookies em todas as requisições:** `fetch(url, { credentials: 'include' })` ou `axios` com `withCredentials: true`. O CORS da API já permite (`credentials: true`, origem `http://localhost:3000`).
2. **Login:** chamar `POST /user/auth/login`; não há token para guardar — os cookies são gravados pelo navegador.
3. **Access token expirado:** uma rota protegida responde 401 `UNAUTHORIZED_USER`. O cliente deve chamar `POST /user/auth/refresh-token` e repetir a requisição original.
4. **Refresh falhou** (401 `TOKEN_EXPIRED` / `INVALID_TOKEN`): a sessão acabou; redirecionar para o login.
5. **Evitar refresh concorrente:** como o refresh token é de uso único, várias chamadas simultâneas a `/refresh-token` com o mesmo cookie fazem só a primeira funcionar. Centralize o refresh (uma promise compartilhada).
6. **Logout:** chamar `POST /user/auth/logout`.
7. **Recuperação de senha:** guardar o `tokenUUID` retornado em cada etapa e enviar o **mais recente** na etapa seguinte.

---

## 9. Variáveis de ambiente envolvidas

| Variável | Uso |
|---|---|
| `JWT_ACCESS_SECRET` | Assina/valida o access token |
| `JWT_REFRESH_SECRET` | Assina/valida o refresh token |
| `PEPPER` | Concatenado antes do hash Argon2 |
| `USER_EMAIL`, `USER_PASSWORD` | Remetente dos e-mails de código (Gmail) |
| `NODE_ENV` | `production` ativa `secure` nos cookies |
| `REDIS_HOST`, `REDIS_PORT` | Sessões, códigos e rate limit |
