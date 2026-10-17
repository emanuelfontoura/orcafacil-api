---
title: "Endpoints da API"
description: "Referência de todas as rotas: método, caminho, autenticação, rate limit, body, resposta e erros possíveis."
type: api
tags:
  - "endpoints"
  - "rotas"
  - "rest"
  - "contrato"
modules:
  - "auth"
  - "clients"
  - "user"
sources:
  - "src/index.ts"
  - "src/modules/auth/auth.route.ts"
  - "src/modules/clients/clients.route.ts"
related:
  - "api/authentication.md"
  - "api/validation.md"
  - "api/error-handling.md"
last_reviewed: 2026-10-15
---

# API — Endpoints

> **Escopo:** referência completa dos endpoints HTTP do `orcafacil-api`: método, caminho, autenticação, rate limit, parâmetros, body, resposta e erros possíveis.
> **Documentos relacionados:** [`authentication.md`](./authentication.md) · [`validation.md`](./validation.md) · [`error-handling.md`](./error-handling.md) · [`../modules/auth.md`](../modules/auth.md) · [`../modules/clients.md`](../modules/clients.md) · [`../modules/user.md`](../modules/user.md)
> **Fonte da verdade:** `src/index.ts` e `src/modules/*/*.route.ts` no repositório `orcafacil-api`.
> **Documentação externa (Postman):** https://documenter.getpostman.com/view/53399164/2sBXqDsiVE
> **Última revisão:** 2026-10-15.

---

## 1. Informações gerais

| Item | Valor |
|---|---|
| URL base (dev) | `http://localhost:3000` (porta definida por `PORT`, padrão `3000`) |
| Formato | JSON (`Content-Type: application/json`) |
| Autenticação | Cookie `accessToken` (JWT) — ver [`authentication.md`](./authentication.md) |
| CORS | Origem `http://localhost:3000`, `credentials: true` |
| Versionamento | Não há prefixo de versão (`/v1`) |
| Status de sucesso | Sempre **200** |

### Formato das respostas

```ts
type ApiResponse<T> =
  | { success: true,  data: T }
  | { success: false, error: string, code?: string, details?: { field: string, message: string }[] }
```

Erros detalhados em [`error-handling.md`](./error-handling.md).

### Erros comuns a todas as rotas

| Status | `code` | Quando |
|---|---|---|
| 400 | — (`error: 'Erro de validação'` + `details`) | Body/query fora do schema |
| 401 | `UNAUTHORIZED_USER` | Rotas protegidas sem `accessToken` válido |
| 429 | `RATE_LIMIT_EXCEEDED` | Limite de requisições da rota excedido |
| 500 | variados / sem código | Falha de banco, Redis, e-mail ou erro inesperado |

---

## 2. Mapa de rotas

| Método | Caminho | Protegida | Rate limit (req/60 s) | Descrição |
|---|---|---|---|---|
| `POST` | `/user/auth/email/verify` | não | 2 | Inicia o cadastro e envia código por e-mail |
| `POST` | `/user/auth/email/confirm` | não | 5 | Confirma o código e cria o usuário |
| `POST` | `/user/auth/email/resend-email-code` | não | 1 | Reenvia o código de cadastro |
| `POST` | `/user/auth/login` | não | 5 | Login (seta cookies) |
| `POST` | `/user/auth/refresh-token` | não (usa cookie `refreshToken`) | 10 | Renova os tokens |
| `POST` | `/user/auth/password-recovery/send-code` | não | 1 | Envia código de recuperação |
| `POST` | `/user/auth/password-recovery/confirm-code` | não | 10 | Valida o código de recuperação |
| `POST` | `/user/auth/password-recovery/new-password` | não | 3 | Define a nova senha |
| `POST` | `/user/auth/logout` | não (usa cookie `refreshToken`) | 1 | Encerra a sessão |
| `POST` | `/clients/create` | **sim** | 100 | Cria cliente |
| `PATCH` | `/clients/edit/:id` | **sim** | 100 | Edita cliente |
| `DELETE` | `/clients/delete/:id` | **sim** | 100 | Exclui cliente |
| `GET` | `/clients` | **sim** | 100 | Lista clientes do usuário (com filtros) |
| `GET` | `/clients/:id` | **sim** | 100 | Busca cliente por id |

O prefixo `/user` (módulo `user`) está registrado mas **não possui rotas**. Rotas inexistentes retornam o 404 padrão do Express (HTML, fora do formato `ApiResponse`).

---

## 3. Autenticação e cadastro — `/user/auth`

### 3.1 `POST /user/auth/email/verify`

Inicia o cadastro. Guarda os dados no Redis por 10 minutos e envia um código de 6 dígitos para o e-mail. **Não cria o usuário ainda.**

**Body**
```json
{
  "name": "João da Silva",
  "cnpjCpf": "12345678909",
  "email": "joao@exemplo.com",
  "password": "senhaSegura123",
  "confirmPassword": "senhaSegura123"
}
```

**200**
```json
{ "success": true, "data": { "email": "joao@exemplo.com", "name": "João da Silva", "cnpjCpf": "12345678909" } }
```

**Erros:** 409 `USER_ALREADY_EXISTS` (e-mail já cadastrado) · 409 `LIMIT_ATTEMPTS` (cooldown de 60 s ativo) · 500 `REDIS_SAVE_ERROR` · 500 `SEND_EMAIL_CODE_ERROR`.

---

### 3.2 `POST /user/auth/email/confirm`

Valida o código e cria o usuário na tabela `users`.

**Body**
```json
{ "email": "joao@exemplo.com", "code": "123456" }
```

**200**
```json
{
  "success": true,
  "data": { "id": 1, "cnpjCpf": "12345678909", "email": "joao@exemplo.com", "name": "João da Silva", "createdAt": "2026-10-15T12:00:00.000Z" }
}
```

**Erros:** 401 `INVALID_OR_EXPIRED_CODE` (cadastro pendente não encontrado/expirado) · 401 `INVALID_CODE` · 500 `REDIS_GET_ERROR` · 500 `USER_CREATION_FAILED`.

---

### 3.3 `POST /user/auth/email/resend-email-code`

Gera e envia um novo código para um cadastro pendente, renovando o prazo de 10 minutos.

**Body**
```json
{ "email": "joao@exemplo.com" }
```

**200**
```json
{ "success": true, "data": { "email": "joao@exemplo.com" } }
```

**Erros:** 409 `LIMIT_ATTEMPTS` (cooldown ativo) · 409 `TIME_OUT_REGISTER` (cadastro pendente expirou — refazer `/email/verify`) · 500 `REDIS_SAVE_ERROR` · 500 `SEND_EMAIL_CODE_ERROR`.

---

### 3.4 `POST /user/auth/login`

Autentica o usuário. Os tokens são enviados **somente em cookies** (`Set-Cookie`).

**Body**
```json
{ "email": "joao@exemplo.com", "password": "senhaSegura123" }
```

**200**
```json
{ "success": true, "data": null }
```
Cookies: `accessToken` (15 min) e `refreshToken` (7 dias), `httpOnly`, `sameSite=strict`.

**Erros:** 401 `INVALID_CREDENTIALS` (e-mail inexistente ou senha incorreta) · 500 `QUERY_DATABASE_ERROR` · 500 `UPDATE_DATABASE_ERROR` · 500 `REDIS_SAVE_ERROR`.

---

### 3.5 `POST /user/auth/refresh-token`

Troca o refresh token atual por um novo par de tokens. O refresh token antigo deixa de valer.

**Body:** nenhum. **Cookie obrigatório:** `refreshToken`.

**200**
```json
{ "success": true, "data": null }
```
Cookies `accessToken` e `refreshToken` regravados.

**Erros:** 401 sem código (cookie ausente) · 401 `TOKEN_EXPIRED` · 401 `INVALID_TOKEN` (assinatura inválida, revogado ou já utilizado) · 500 `INTERNAL_SERVER_ERROR` / `REDIS_SAVE_ERROR`.

---

### 3.6 `POST /user/auth/password-recovery/send-code`

Envia um código de recuperação para o e-mail e retorna um `tokenUUID` que identifica o processo.

**Body**
```json
{ "email": "joao@exemplo.com" }
```

**200**
```json
{ "success": true, "data": { "tokenUUID": "3181d0e7-b884-4f0f-b233-324e9ae9e180" } }
```

**Erros:** 401 `INVALID_CREDENTIALS` (e-mail não cadastrado) · 500 `REDIS_SAVE_ERROR` · 500 `SEND_EMAIL_CODE_ERROR`.

---

### 3.7 `POST /user/auth/password-recovery/confirm-code`

Valida o código. Em caso de sucesso, retorna um **novo** `tokenUUID`, já autorizado para a troca de senha. Máximo de 5 tentativas por `tokenUUID`.

**Body**
```json
{ "tokenUUID": "3181d0e7-b884-4f0f-b233-324e9ae9e180", "code": "123456" }
```

**200**
```json
{ "success": true, "data": { "tokenUUID": "9b2c1f4e-0a7d-4c3e-8f61-2d5a7e9b1c03" } }
```

**Erros:** 401 `INVALID_OR_EXPIRED_CODE` · 401 `LIMIT_ATTEMPTS` (5 tentativas; o processo é descartado) · 401 `INVALID_CODE` · 500 `REDIS_GET_ERROR` / `REDIS_SAVE_ERROR`.

---

### 3.8 `POST /user/auth/password-recovery/new-password`

Define a nova senha usando o `tokenUUID` retornado por `confirm-code`.

**Body**
```json
{
  "tokenUUID": "9b2c1f4e-0a7d-4c3e-8f61-2d5a7e9b1c03",
  "newPassword": "novaSenha123",
  "confirmNewPassword": "novaSenha123"
}
```

**200**
```json
{ "success": true, "data": null }
```

**Erros:** 401 `INVALID_TOKEN` (`tokenUUID` inexistente/expirado) · 401 `UNAUTHORIZED_USER` (código ainda não confirmado) · 500 `REDIS_GET_ERROR` · 500 `UPDATE_DATABASE_ERROR`.

---

### 3.9 `POST /user/auth/logout`

Revoga o refresh token e limpa os cookies.

**Body:** nenhum. **Cookie:** `refreshToken`.

**200**
```json
{ "success": true, "data": null }
```

**Erros:** 401 `INVALID_TOKEN` · 401 `TOKEN_EXPIRED` · 500 `REDIS_DEL_ERROR`.

---

## 4. Clientes — `/clients`

Todas as rotas exigem o cookie `accessToken`. Objeto cliente retornado:

```json
{
  "id": 1,
  "name": "Empresa Exemplo LTDA",
  "cnpjCpf": "12345678000195",
  "email": "contato@exemplo.com",
  "tellphone": "11999999999",
  "userId": 1,
  "createdAt": "2026-10-15T12:00:00.000Z",
  "updatedAt": "2026-10-15T12:00:00.000Z"
}
```

### 4.1 `POST /clients/create`

**Body**
```json
{
  "name": "Empresa Exemplo LTDA",
  "cnpjCpf": "12345678000195",
  "email": "contato@exemplo.com",
  "tellphone": "11999999999",
  "userId": 1
}
```
`email` e `tellphone` são opcionais (podem ser omitidos ou `null`).

**200** → `{ "success": true, "data": <cliente> }`

**Erros:** 409 `CLIENT_ALREADY_EXISTS` (CPF/CNPJ já cadastrado para o usuário) · 500 `INTERNAL_SERVER_ERROR`.

---

### 4.2 `PATCH /clients/edit/:id`

**Params:** `id` — id do cliente.

**Body** (todos os campos opcionais, exceto `userId`)
```json
{ "name": "Empresa Exemplo S.A.", "tellphone": "11888888888", "userId": 1 }
```

**200** → `{ "success": true, "data": <cliente atualizado> }`

**Erros:** 409 `INVALID_USER` (`userId` inexistente) · 409 `CLIENT_ALREADY_EXISTS` (novo CPF/CNPJ já usado) · 500 `QUERY_DATABASE_ERROR` / `INTERNAL_SERVER_ERROR`.

---

### 4.3 `DELETE /clients/delete/:id`

**Params:** `id` — id do cliente. **Body:** nenhum.

**200** → `{ "success": true, "data": <cliente excluído> }`

**Erros:** 409 `INVALID_ID_CLIENT` (cliente não encontrado) · 500 `INTERNAL_SERVER_ERROR`.

---

### 4.4 `GET /clients`

Lista os clientes do usuário autenticado. Filtros opcionais por query string (igualdade exata, combinados com AND):

| Query | Tipo |
|---|---|
| `name` | string |
| `cnpjCpf` | CPF/CNPJ válido |
| `tellphone` | string |
| `email` | e-mail |

Exemplo: `GET /clients?name=Empresa%20Exemplo%20LTDA`

**200** → `{ "success": true, "data": [<cliente>, ...] }` (lista vazia se não houver resultados; sem paginação).

**Erros:** 400 (query inválida) · 500 `INTERNAL_SERVER_ERROR`.

---

### 4.5 `GET /clients/:id`

**Params:** `id` — id do cliente.

**200** → `{ "success": true, "data": <cliente> }`

**Erros:** 409 `INVALID_ID_CLIENT` (cliente não encontrado) · 500 `INTERNAL_SERVER_ERROR`.

---

## 5. Exemplos de chamada

```bash
# Login (salva os cookies em cookies.txt)
curl -i -c cookies.txt -X POST http://localhost:3000/user/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao@exemplo.com","password":"senhaSegura123"}'

# Rota protegida usando os cookies
curl -b cookies.txt http://localhost:3000/clients
```

```ts
// Frontend (fetch) — sempre enviar credentials para trafegar os cookies
await fetch('http://localhost:3000/clients', { credentials: 'include' })
```
