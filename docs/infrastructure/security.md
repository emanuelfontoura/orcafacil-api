---
title: "Segurança"
description: "Medidas de segurança por camada (senhas, tokens, cookies, CORS, rate limit, validação, dados, segredos, infraestrutura) e diretrizes para código novo."
type: infrastructure
tags:
  - "seguranca"
  - "argon2"
  - "jwt"
  - "cors"
  - "rate-limit"
  - "segredos"
modules:
  - "auth"
  - "clients"
sources:
  - "src/middlewares/"
  - "src/shared/utils/"
  - "src/modules/auth/"
  - "src/index.ts"
  - "Dockerfile"
  - "docker-compose.prod.yml"
related:
  - "api/authentication.md"
  - "infrastructure/redis.md"
  - "database/relationships.md"
last_reviewed: 2026-10-16
---

# Infraestrutura — Segurança

> **Escopo:** medidas de segurança adotadas no `orcafacil-api`, organizadas por camada: autenticação e sessões, senhas e segredos, cookies e CORS, proteção contra abuso, validação de entrada, exposição de dados, isolamento entre usuários, tratamento de erros, segredos de ambiente e infraestrutura. Inclui as diretrizes para código novo.
> **Documentos relacionados:** [`../api/authentication.md`](../api/authentication.md) · [`redis.md`](./redis.md) · [`environment.md`](./environment.md) · [`../api/validation.md`](../api/validation.md) · [`../api/error-handling.md`](../api/error-handling.md) · [`../database/relationships.md`](../database/relationships.md#4-isolamento-por-usuário-multi-tenant)
> **Fonte da verdade:** `src/middlewares/`, `src/shared/utils/`, `src/modules/auth/`, `src/index.ts`, arquivos Docker.
> **Última revisão:** 2026-10-16.

---

## 1. Resumo das medidas

| Área | Medida | Implementação |
|---|---|---|
| Senhas | Argon2id + pepper, rehash automático | `ArgonHash` |
| Códigos de verificação | Aleatórios criptográficos, com hash, expiram em 10 min | `generateCode`, Redis |
| Sessão | JWT de curta duração + refresh token rotativo e revogável | `generateTokens`, Redis |
| Transporte dos tokens | Cookies `httpOnly`, `sameSite=strict`, `secure` em produção | `AuthCookies` |
| Rotas protegidas | Middleware `authenticate` | `src/middlewares/authenticate.ts` |
| CORS | Origem única com credenciais | `src/index.ts` |
| Abuso / força bruta | Rate limit por IP e rota, cooldown, limite de tentativas | `rateLimit`, Redis |
| Enumeração de usuários | Mensagem única para e-mail inexistente e senha errada no login | `AuthUserService.login` |
| Entrada | Validação Zod com descarte de campos extras | `validateSchema` |
| SQL injection | Consultas apenas via Prisma (parametrizadas) | Repositórios |
| Exposição de dados | `password` nunca retornado; erros internos genéricos | `UserRepository`, `handleError` |
| Segredos | Variáveis de ambiente fora do Git | `.gitignore` |
| Rede (produção) | Banco e Redis sem portas públicas | `docker-compose.prod.yml` |

---

## 2. Senhas

`src/shared/utils/ArgonHash.ts`:

| Parâmetro | Valor |
|---|---|
| Algoritmo | **Argon2id** |
| `memoryCost` | 65536 KiB (64 MiB) |
| `timeCost` | 3 |
| `parallelism` | 1 |
| Salt | Gerado automaticamente pelo `argon2` a cada hash (embutido no hash) |
| Pepper | `PEPPER` (variável de ambiente), concatenado ao valor antes do hash |

- `argonHash(valor)` → hash de `valor + PEPPER`.
- `argonVerify(hash, valor)` → verificação em tempo constante pela biblioteca.
- `argonRehash(valor, hash)` → no login, se o hash foi gerado com parâmetros antigos, um novo hash é gravado (permite endurecer os parâmetros sem forçar troca de senha).
- Regras de senha: 8 a 128 caracteres; confirmação obrigatória no cadastro e na troca.
- A senha só existe em texto puro na requisição; o hash é gerado **antes** de ir para o Redis (cadastro pendente) e para o PostgreSQL.
- O `PEPPER` fica fora do banco: um vazamento só do banco não basta para atacar os hashes. Ele **não pode ser alterado** com usuários cadastrados.

---

## 3. Códigos de verificação

- 6 dígitos gerados com `crypto.randomInt(0, 1000000)` (CSPRNG), com zeros à esquerda.
- Enviados por e-mail em texto; armazenados no Redis **com hash Argon2**.
- Expiram em **10 minutos** (TTL).
- Cadastro: cooldown de **60 s** entre envios por e-mail.
- Recuperação de senha: máximo de **5 tentativas** por processo (a tentativa é contada antes da verificação); ao atingir o limite o processo é apagado.
- Recuperação de senha em etapas com troca de identificador: o `tokenUUID` que autoriza a nova senha é **diferente** do que foi enviado com o código, e só é emitido após o código correto.

---

## 4. Sessões e tokens

| | Access token | Refresh token |
|---|---|---|
| Duração | 15 min | 7 dias |
| Segredo | `JWT_ACCESS_SECRET` | `JWT_REFRESH_SECRET` (segredos distintos) |
| Estado | Stateless | `jti` registrado no Redis (whitelist) |
| Uso único | — | Sim: cada refresh apaga o `jti` usado e emite outro (rotação) |
| Revogação | Expira sozinho | `logout` apaga o `jti` |

- Segredos separados impedem usar um refresh token como access token e vice-versa.
- Um refresh token roubado e já utilizado pelo dono deixa de funcionar (rotação).
- O `sub` é o único dado no payload; nenhuma informação sensível vai no JWT.

---

## 5. Cookies e CORS

**Cookies** (`AuthCookies`):

| Atributo | Valor | Proteção |
|---|---|---|
| `httpOnly` | `true` | JavaScript da página não lê os tokens (mitiga roubo via XSS). |
| `sameSite` | `strict` | Cookies não são enviados em requisições originadas de outros sites (mitiga CSRF). |
| `secure` | `true` quando `NODE_ENV=production` | Cookies só trafegam por HTTPS em produção. |
| `maxAge` | 15 min / 7 dias | Alinhado à expiração dos JWTs. |

Os tokens **nunca** são retornados no corpo da resposta.

**CORS** (`src/index.ts`):

```ts
app.use(cors({ origin: 'http://localhost:3000', credentials: true }))
```

- Apenas uma origem é aceita, com envio de cookies.
- O valor está fixo no código; para outros ambientes, a origem precisa ser ajustada.

---

## 6. Proteção contra abuso

| Mecanismo | Detalhe |
|---|---|
| Rate limit | Todas as rotas; por IP + rota; janela fixa de 60 s. Autenticação: 1–10 req/min. Clientes: 100 req/min. Excedido → 429. Ver [`redis.md`](./redis.md#5-rate-limit). |
| Cooldown | 60 s entre envios de código de cadastro para o mesmo e-mail. |
| Tentativas | 5 por processo de recuperação de senha. |
| Expiração | Todos os códigos e processos temporários expiram em 10 min. |
| Custo do hash | Argon2id com 64 MiB torna ataques de força bruta offline caros. |

O IP do rate limit é lido primeiro de `X-Forwarded-For`. Em produção, a API deve ficar atrás de um proxy reverso que **sobrescreva** esse header com o IP real do cliente.

---

## 7. Validação de entrada e injeção

- Todo body é validado por Zod antes do controller (`validateSchema`), e o body é **substituído** pelo resultado do parse — campos não previstos não chegam às camadas internas (evita *mass assignment*).
- Query strings são validadas com Zod no controller.
- CPF/CNPJ validado por dígitos verificadores; e-mail, UUID e códigos com formato estrito.
- Todo acesso ao banco passa pelo **Prisma**, que usa consultas parametrizadas — não há SQL montado com concatenação de strings.
- E-mails enviados usam o código gerado pelo servidor; nenhum conteúdo do usuário é interpolado no HTML do e-mail.

---

## 8. Exposição de dados

- **`password` nunca sai do repositório**: `UserRepository` usa `select` explícito; só `returnLoginCredentials` lê o hash, e ele não é retornado pela API.
- Respostas de cadastro/confirmação retornam apenas `id`, `cnpjCpf`, `email`, `name`, `createdAt`.
- `handleError` não envia stack trace, mensagem original do Prisma/Redis nem detalhes internos; erros inesperados viram `'Erro interno do servidor'`.
- Login e recuperação de senha não revelam se a senha estava errada ou se o e-mail não existe (no login, mesma mensagem e código `INVALID_CREDENTIALS`).

---

## 9. Isolamento entre usuários

O sistema é multi-tenant por usuário: cada registro de negócio tem `userId`. O banco não aplica Row Level Security; o isolamento é responsabilidade da aplicação:

- A identidade confiável é **`Number(req.user)`**, extraída do access token pelo `authenticate`.
- A criação de registros preenche `userId` a partir de `req.user`, nunca do body (ex.: `POST /clients/create`).
- Consultas de listagem filtram por `userId` (ex.: `GET /clients`).
- Buscar, editar e excluir por `id` filtram também por `userId` (`findFirst`/`update`/`delete` com `{ id, userId }`); registro de outro usuário responde 404, como se não existisse.
- Unicidade de dados de negócio é por usuário (`@@unique([userId, cnpjCpf])`).

Regras completas em [`../database/relationships.md`](../database/relationships.md#4-isolamento-por-usuário-multi-tenant).

---

## 10. Segredos e configuração

| Segredo | Função | Recomendação |
|---|---|---|
| `JWT_ACCESS_SECRET` | Assinar access tokens | Valor aleatório longo (≥ 32 bytes), diferente por ambiente |
| `JWT_REFRESH_SECRET` | Assinar refresh tokens | Diferente do access secret |
| `PEPPER` | Pepper do Argon2 | Valor aleatório longo; nunca alterar com usuários existentes |
| `DATABASE_URL` / `DATABASE_PASSWORD` | Acesso ao PostgreSQL | Senha forte em produção |
| `USER_PASSWORD` | SMTP do Gmail | Usar **senha de app**, nunca a senha da conta |

- Todos os arquivos `.env*` estão no `.gitignore`; nunca versionar segredos.
- No CI, os valores são fictícios e exclusivos de teste (`test-access-secret`, `test-pepper`).
- Gerar segredos com, por exemplo: `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`.

---

## 11. Infraestrutura

- **Produção:** PostgreSQL e Redis ficam apenas na rede Docker interna `orcafacil`, sem portas publicadas; somente a API expõe a porta 3000.
- **Imagem da API:** multi-stage, base `node:20-alpine`, apenas dependências de produção e código compilado.
- **Redis em produção:** persistência AOF; sem senha configurada, protegido pelo isolamento de rede.
- **HTTPS:** a API não termina TLS; em produção deve ficar atrás de um proxy reverso com HTTPS (necessário também para os cookies `secure`).
- **Desenvolvimento:** PostgreSQL e Redis expostos em `localhost` para conveniência; usar apenas em máquina local.

---

## 12. Diretrizes para código novo

1. Rotas que acessam dados de usuário devem usar `authenticate` e obter o id **somente** de `req.user`.
2. Toda consulta por `id` em entidades de negócio deve filtrar também por `userId`.
3. Toda rota deve ter `rateLimit`, com limite mais baixo para operações sensíveis.
4. Toda entrada deve ter schema Zod; manter `max()` alinhado ao tamanho das colunas.
5. Nunca retornar `password`, hashes, tokens ou segredos em respostas ou logs.
6. Hash de qualquer segredo armazenado (senhas, códigos) com `ArgonHash`.
7. Valores aleatórios de segurança apenas com `crypto` (`randomInt`, `randomUUID`, `randomBytes`), nunca `Math.random`.
8. Dados temporários no Redis sempre com TTL.
9. Erros com mensagens genéricas para o usuário; detalhes internos não devem chegar à resposta.
10. Novos segredos entram como variável de ambiente e são documentados em [`environment.md`](./environment.md).
