---
title: "Redis"
description: "Cliente ioredis, catálogo de chaves e TTLs, comandos usados, rate limit, tratamento de falhas, persistência e regras para novas chaves."
type: infrastructure
tags:
  - "redis"
  - "cache"
  - "rate-limit"
  - "sessao"
  - "ttl"
modules:
  - "auth"
sources:
  - "src/lib/redis.ts"
  - "src/middlewares/rateLimit.ts"
  - "src/modules/auth/auth.service.ts"
  - "src/shared/utils/verifyKeyExists.ts"
related:
  - "modules/auth.md"
  - "api/authentication.md"
  - "infrastructure/security.md"
last_reviewed: 2026-10-15
---

# Infraestrutura — Redis

> **Escopo:** papel do Redis no `orcafacil-api`: configuração do cliente, catálogo completo de chaves, TTLs, comandos usados, rate limit, tratamento de falhas, persistência por ambiente, testes e regras para criar novas chaves.
> **Documentos relacionados:** [`environment.md`](./environment.md) · [`security.md`](./security.md) · [`../modules/auth.md`](../modules/auth.md#5-redis-usado-pelo-módulo) · [`../api/authentication.md`](../api/authentication.md) · [`../database/schema.md`](../database/schema.md#dados-que-não-ficam-no-postgresql)
> **Fonte da verdade:** `src/lib/redis.ts`, `src/middlewares/rateLimit.ts`, `src/modules/auth/auth.service.ts`, `src/shared/utils/verifyKeyExists.ts`.
> **Última revisão:** 2026-10-15.

---

## 1. Papel do Redis

O Redis guarda **dados temporários, de curta duração e sempre com TTL**. Nada no Redis é fonte da verdade de negócio — isso fica no PostgreSQL.

| Uso | Por que no Redis |
|---|---|
| **Rate limit** | Contadores atômicos (`INCR`) com expiração automática. |
| **Cadastro pendente** | Os dados do usuário só vão para o PostgreSQL após confirmar o e-mail; até lá expiram sozinhos. |
| **Cooldown de envio de e-mail** | Flag com expiração de 60 s. |
| **Sessões (refresh tokens)** | Whitelist de `jti` válidos, permitindo revogar e rotacionar tokens. |
| **Recuperação de senha** | Estado do processo (código, tentativas, autorização) com expiração. |

Não é usado como cache de consultas ao banco.

---

## 2. Cliente

Arquivo: `src/lib/redis.ts`.

```ts
import Redis from "ioredis"
import "dotenv/config"

export const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
})
```

- Biblioteca: **`ioredis`** (5.x).
- Instância única, importada como `import { redis } from '@/lib/redis'`.
- Configuração apenas por `REDIS_HOST` e `REDIS_PORT`; sem senha, TLS, database index ou prefixo de chave.
- Demais opções no padrão do `ioredis`: reconexão automática e fila offline (comandos enviados enquanto desconectado aguardam a reconexão).
- A conexão é aberta na importação do módulo (início da aplicação).

---

## 3. Catálogo de chaves

Formato: **`{finalidade}-{identificador}`**, em kebab-case.

| Chave | Tipo / valor | TTL | Escrita | Leitura | Remoção |
|---|---|---|---|---|---|
| `rate-limit-{rota}-{ip}` | inteiro (contador) | `maxTimeLimit` da rota (60 s em todas) | `rateLimit` (`INCR` + `EXPIRE`) | `rateLimit` | Expiração |
| `verify-email-{email}` | JSON `{ code, name, cnpjCpf, password }` (`code` e `password` com hash Argon2) | 600 s | `verifyEmail`, `resendEmailCode` | `confirmEmail`, `resendEmailCode` | Expiração |
| `verify-email-cooldown-{email}` | `1` | 60 s | `verifyEmail`, `resendEmailCode` | `verifyKeyExists` | Expiração |
| `refresh-token-{jti}` | `userId` | 604800 s (7 dias) | `login`, `refreshToken` | `refreshToken` (`EXISTS`) | `refreshToken` (rotação), `logout`, expiração |
| `recovery-password-{uuid}` | JSON `{ id, code, authorized, attempts }` (`code` com hash) | 600 s | `sendCodeRecovery`, `confirmCodeRecovery` | `confirmCodeRecovery`, `createNewPassword` | `confirmCodeRecovery` (troca de UUID ou 5 tentativas), expiração |

Exemplos reais de chave:

```
rate-limit-auth/login-189.40.12.7
rate-limit-clients/getAll-::1
verify-email-joao@exemplo.com
verify-email-cooldown-joao@exemplo.com
refresh-token-3181d0e7-b884-4f0f-b233-324e9ae9e180
recovery-password-9b2c1f4e-0a7d-4c3e-8f61-2d5a7e9b1c03
```

### TTLs usados

| Valor | Significado | Onde |
|---|---|---|
| 60 | 1 minuto | Janela do rate limit, cooldown de e-mail |
| 600 | 10 minutos | Códigos de verificação e recuperação |
| 604800 | 7 dias | Refresh tokens (igual à expiração do JWT e do cookie) |

---

## 4. Comandos utilizados

| Comando (`ioredis`) | Uso |
|---|---|
| `redis.set(key, value, "EX", segundos)` | Gravar com TTL (padrão do projeto para qualquer escrita). |
| `redis.set(key, value, "KEEPTTL")` | Atualizar o valor sem renovar o TTL (contador de tentativas da recuperação de senha). |
| `redis.get(key)` | Ler (retorna `string \| null`). |
| `redis.exists(key)` | Verificar existência (cooldown, whitelist de refresh). |
| `redis.del(key)` | Remover (rotação/logout/fim da recuperação). |
| `redis.incr(key)` | Incremento atômico (rate limit). |
| `redis.expire(key, segundos)` | Definir TTL do contador na primeira requisição da janela. |

Objetos são serializados com `JSON.stringify` e lidos com `JSON.parse`.

---

## 5. Rate limit

Arquivo: `src/middlewares/rateLimit.ts`. Algoritmo de **janela fixa**.

```ts
export const rateLimit = (maxReqLimit: number, maxTimeLimit: number, route: string) => {
    return async (req, res, next) => {
        const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || req.ip
        const key = `rate-limit-${route}-${ip}`
        const requests = await redis.incr(key)
        if(requests === 1) await redis.expire(key, maxTimeLimit)
        if(requests > maxReqLimit) return next(new AppError('Limite de requisições excedido', 429, ErrorCode.RATE_LIMIT_EXCEEDED))
        next()
    }
}
```

- **Chave:** rota lógica (3º argumento) + IP. Cada rota tem contador próprio.
- **IP:** primeiro valor de `X-Forwarded-For`; se ausente, `req.socket.remoteAddress`; depois `req.ip`.
- **Janela:** começa na primeira requisição e dura `maxTimeLimit` segundos; ao expirar, o contador zera.
- **Excedeu:** 429 `RATE_LIMIT_EXCEEDED`. As requisições bloqueadas continuam incrementando o contador até a janela expirar.

Limites configurados:

| Rota | Limite / 60 s |
|---|---|
| `auth/email/verify` | 2 |
| `auth/email/confirm` | 5 |
| `auth/email/resend-email-code` | 1 |
| `auth/login` | 5 |
| `auth/refresh-token` | 10 |
| `auth/password-recovery/send-code` | 1 |
| `auth/password-recovery/confirm-code` | 10 |
| `auth/password-recovery/new-password` | 3 |
| `auth/logout` | 1 |
| `clients/create`, `clients/edit`, `clients/delete`, `clients/getAll`, `clients/getById` | 100 cada |

---

## 6. Tratamento de falhas

| Local | Tratamento |
|---|---|
| `AuthUserService` | Cada operação no Redis fica em `try/catch` e vira `AppError` 500 com `REDIS_SAVE_ERROR`, `REDIS_GET_ERROR` ou `REDIS_DEL_ERROR`. |
| `verifyKeyExists(key)` | `try/catch` → `AppError` 500 `REDIS_SAVE_ERROR`. |
| `rateLimit` | Sem `try/catch`: uma falha do Redis rejeita a promise e o Express 5 a encaminha ao `handleError` (500 genérico). |

Como **todas as rotas passam pelo `rateLimit`**, a API depende do Redis disponível para atender qualquer requisição.

---

## 7. Persistência por ambiente

| Ambiente | Imagem | Persistência | Porta exposta |
|---|---|---|---|
| Desenvolvimento | `redis:7` | Padrão da imagem; sem volume nomeado | `6379` no host |
| CI | `redis:7` (service) | Descartado ao fim do pipeline | — |
| Produção | `redis:8-alpine` | **AOF** (`--appendonly yes`) no volume `redis-data` | Não exposta (só na rede `orcafacil`) |

Com AOF em produção, reiniciar o container preserva sessões e processos em andamento. Perder os dados do Redis só invalida sessões (os usuários precisam logar de novo), cadastros pendentes e recuperações em andamento — nenhum dado de negócio.

---

## 8. Testes

Nos testes unitários o Redis é **sempre mockado**:

```ts
vi.mock('@/lib/redis')                       // automock
// ou, explicitando os métodos usados:
vi.mock('@/lib/redis', () => ({ redis: { set: vi.fn() } }))

vi.mocked(redis.set).mockResolvedValue('OK')
expect(redis.set).toHaveBeenCalledWith(`refresh-token-${jti}`, id, 'EX', 604800)
```

O CI sobe um `redis:7` como service, mas os testes atuais não se conectam a ele.

---

## 9. Inspecionando em desenvolvimento

```bash
docker exec -it orcafacil-redis-dev redis-cli

KEYS refresh-token-*            # sessões ativas (use SCAN em bases grandes)
GET verify-email-joao@exemplo.com
TTL rate-limit-auth/login-::1
DEL rate-limit-auth/login-::1   # liberar o rate limit durante testes manuais
```

---

## 10. Regras para novas chaves

1. Seguir o formato `{finalidade}-{identificador}` em kebab-case.
2. **Sempre** definir TTL (`"EX", segundos`); nunca gravar chave sem expiração.
3. Não guardar dados de negócio permanentes — esses vão para o PostgreSQL.
4. Segredos (códigos, senhas) apenas com hash (`ArgonHash.argonHash`).
5. Envolver cada operação em `try/catch` no service e relançar `AppError(…, 500, ErrorCode.REDIS_*_ERROR)`.
6. Usar `"KEEPTTL"` ao atualizar um valor que não deve ganhar tempo extra.
7. Documentar a chave na seção 3 deste arquivo.
