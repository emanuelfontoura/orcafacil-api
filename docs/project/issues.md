---
title: "Problemas conhecidos"
description: "Lista de bugs, falhas de segurança, inconsistências e débitos técnicos com módulo, local, impacto e solução."
type: project
tags:
  - "issues"
  - "bugs"
  - "seguranca"
  - "debito-tecnico"
  - "correcoes"
modules:
  - "auth"
  - "clients"
  - "user"
  - "products"
sources:
  - "src/"
  - "prisma/schema.prisma"
  - "Dockerfile"
  - "docker-compose.prod.yml"
  - "bitbucket-pipelines.yml"
  - "package.json"
related:
  - "infrastructure/security.md"
  - "database/schema.md"
  - "modules/auth.md"
  - "modules/clients.md"
last_reviewed: 2026-10-16
---

# Projeto — Problemas Conhecidos (Issues)

> **Escopo:** erros, falhas de segurança, inconsistências e débitos técnicos encontrados no `orcafacil-api`. Cada item informa módulo, arquivo e local, explicação, impacto e solução proposta.
> **Documentos relacionados:** [`overview.md`](./overview.md) · [`../infrastructure/security.md`](../infrastructure/security.md) · [`../database/schema.md`](../database/schema.md) · [`../modules/auth.md`](../modules/auth.md) · [`../modules/clients.md`](../modules/clients.md)
> **Origem:** revisão do código, execução de `tsc --noEmit`, `eslint`, `vitest` e `docker compose config` em 2026-10-15 (branch `main`, commit `cf9f1b6`).
> **Última revisão:** 2026-10-16.

As linhas citadas se referem ao commit acima e podem mudar. Ao corrigir um item, **remova-o deste arquivo** (ou marque como resolvido) e atualize os documentos afetados.

---

## Severidade

| Nível | Critério |
|---|---|
| 🔴 **Crítica** | Quebra build, deploy ou funcionalidade principal, ou permite acesso a dados de outros usuários. |
| 🟠 **Alta** | Falha de segurança explorável, deploy impossível ou fluxo importante quebrado em cenários comuns. |
| 🟡 **Média** | Comportamento incorreto em cenários específicos, respostas erradas, limitações relevantes. |
| 🟢 **Baixa** | Qualidade de código, mensagens, documentação, débito técnico. |

---

## Resumo

| ID | Sev. | Módulo | Título |
|---|---|---|---|
| [ISS-06](#iss-06--docker-composeprodyml-inválido) | 🟠 | infra | `docker-compose.prod.yml` inválido |
| [ISS-07](#iss-07--envprod-sem-as-variáveis-do-container-postgresql) | 🟠 | infra | `.env.prod` sem as variáveis do container PostgreSQL |
| [ISS-08](#iss-08--rate-limit-confia-no-header-x-forwarded-for) | 🟠 | middlewares | Rate limit confia no header `X-Forwarded-For` |
| [ISS-09](#iss-09--confirmação-de-e-mail-sem-limite-de-tentativas) | 🟠 | auth | Confirmação de e-mail sem limite de tentativas |
| [ISS-10](#iss-10--tokenuuid-de-recuperação-reutilizável-e-sessões-não-revogadas) | 🟠 | auth | `tokenUUID` de recuperação reutilizável e sessões não revogadas |
| [ISS-11](#iss-11--cadastro-pendente-não-é-removido-após-a-confirmação) | 🟠 | auth | Cadastro pendente não é removido após a confirmação |
| [ISS-12](#iss-12--cpfcnpj-de-usuário-duplicado-só-é-detectado-no-insert) | 🟠 | auth | CPF/CNPJ de usuário duplicado só é detectado no INSERT |
| [ISS-13](#iss-13--cpfcnpj-não-é-normalizado-antes-de-salvar) | 🟡 | clients / auth | CPF/CNPJ não é normalizado antes de salvar |
| [ISS-14](#iss-14--e-mail-de-cliente-único-em-toda-a-tabela) | 🟡 | database / clients | E-mail de cliente único em toda a tabela |
| [ISS-16](#iss-16--e-mails-não-são-normalizados-maiúsculasminúsculas) | 🟡 | auth / clients | E-mails não são normalizados (maiúsculas/minúsculas) |
| [ISS-17](#iss-17--parâmetro-id-das-rotas-não-é-validado) | 🟡 | clients | Parâmetro `:id` das rotas não é validado |
| [ISS-18](#iss-18--erros-conhecidos-do-prisma-viram-500) | 🟡 | clients / shared | Erros conhecidos do Prisma viram 500 |
| [ISS-20](#iss-20--limite-do-nome-no-zod-maior-que-a-coluna) | 🟡 | clients | Limite do nome no Zod maior que a coluna |
| [ISS-21](#iss-21--preço-de-produto-limitado-a-99999) | 🟡 | database | Preço de produto limitado a 999.99 |
| [ISS-22](#iss-22--recuperação-de-senha-revela-se-o-e-mail-existe) | 🟡 | auth | Recuperação de senha revela se o e-mail existe |
| [ISS-23](#iss-23--cors-fixo-e-na-mesma-porta-da-api) | 🟡 | infra | CORS fixo e na mesma porta da API |
| [ISS-24](#iss-24--json-malformado-retorna-500-e-erros-inesperados-não-são-logados) | 🟡 | middlewares | JSON malformado retorna 500 e erros inesperados não são logados |
| [ISS-25](#iss-25--rate-limit-não-atômico-e-sem-tratamento-de-falha-do-redis) | 🟡 | middlewares | Rate limit não atômico e sem tratamento de falha do Redis |
| [ISS-26](#iss-26--imagem-de-produção-não-consegue-rodar-migrations) | 🟡 | infra | Imagem de produção não consegue rodar migrations |
| [ISS-28](#iss-28--logout-sem-cookie-falha-e-não-limpa-os-cookies) | 🟡 | auth | Logout sem cookie falha e não limpa os cookies |
| [ISS-29](#iss-29--hash-da-senha-calculado-antes-das-verificações) | 🟡 | auth | Hash da senha calculado antes das verificações |
| [ISS-30](#iss-30--testes-com-erros-de-tipo-e-fixtures-incompletas) | 🟢 | tests | Testes com erros de tipo e fixtures incompletas |
| [ISS-31](#iss-31--aviso-de-lint-no-handleerror) | 🟢 | middlewares | Aviso de lint no `handleError` |
| [ISS-32](#iss-32--mensagens-e-códigos-de-erro-incorretos) | 🟢 | clients / shared / auth | Mensagens e códigos de erro incorretos |
| [ISS-33](#iss-33--envio-de-e-mail-remetente-e-transporter) | 🟢 | auth | Envio de e-mail: remetente e transporter |
| [ISS-34](#iss-34--código-legado-e-não-utilizado) | 🟢 | vários | Código legado e não utilizado |
| [ISS-35](#iss-35--readme-desatualizado) | 🟢 | docs | README desatualizado |
| [ISS-36](#iss-36--pipeline-de-ci-incompleto) | 🟢 | infra | Pipeline de CI incompleto |
| [ISS-37](#iss-37--dockerfile-sem-dockerignore-e-rodando-como-root) | 🟢 | infra | Dockerfile sem `.dockerignore` e rodando como root |
| [ISS-38](#iss-38--sem-cd-e-imagem-com-placeholder) | 🟢 | infra | Sem CD e imagem com placeholder |
| [ISS-39](#iss-39--sem-índice-em-productsuserid) | 🟢 | database | Sem índice em `products.userId` |
| [ISS-40](#iss-40--access-token-continua-válido-após-logout) | 🟢 | auth | Access token continua válido após logout |

---

## 🔴 Críticas

Nenhuma em aberto.

---

## 🟠 Altas

### ISS-06 — `docker-compose.prod.yml` inválido

| | |
|---|---|
| **Módulo** | infraestrutura |
| **Local** | `docker-compose.prod.yml:16` |

**Problema:** `condition: service-healthy` (com hífen). O valor válido é `service_healthy`. Verificado com `docker compose config`:
```
services.api.depends_on.postgres.condition value must be one of 'service_started', 'service_healthy', 'service_completed_successfully'
```

**Impacto:** `docker compose -f docker-compose.prod.yml up` falha na validação; **o ambiente de produção não sobe**.

**Solução:** trocar para `condition: service_healthy`.

---

### ISS-07 — `.env.prod` sem as variáveis do container PostgreSQL

| | |
|---|---|
| **Módulo** | infraestrutura |
| **Local** | `docker-compose.prod.yml` (serviço `postgres`, `env_file: .env.prod` e healthcheck) · `.env.prod` |

**Problema:** o serviço `postgres` lê o `.env.prod`, que contém `DATABASE_USER`, `DATABASE_PASSWORD` e `DATABASE_NAME`, mas não `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` — as variáveis que a imagem oficial do PostgreSQL usa. O healthcheck também usa `$POSTGRES_USER` e `$POSTGRES_DB`.

**Impacto:** sem `POSTGRES_PASSWORD`, o container do PostgreSQL **recusa iniciar**; o healthcheck nunca fica saudável e a API não sobe (depende dele).

**Solução:** adicionar ao `.env.prod`:
```env
POSTGRES_USER=<mesmo de DATABASE_USER>
POSTGRES_PASSWORD=<mesmo de DATABASE_PASSWORD>
POSTGRES_DB=<mesmo de DATABASE_NAME>
DATABASE_URL=postgresql://<user>:<senha>@postgres:5432/<banco>
REDIS_HOST=redis
```
ou mapear no compose (`environment: POSTGRES_USER: ${DATABASE_USER}` etc.).

---

### ISS-08 — Rate limit confia no header `X-Forwarded-For`

| | |
|---|---|
| **Módulo** | middlewares |
| **Local** | `src/middlewares/rateLimit.ts:8` |

**Problema:** o IP é lido primeiro de `req.headers['x-forwarded-for']`, enviado livremente pelo cliente.

**Impacto:** um atacante envia um valor diferente de `X-Forwarded-For` a cada requisição e **ignora completamente o rate limit**, viabilizando força bruta em `/login`, `/email/confirm` (ver ISS-09) e `/password-recovery/confirm-code`, além de spam de e-mails.

**Solução:** configurar `app.set('trust proxy', <nº de proxies ou IP do proxy>)` em `src/index.ts` e usar apenas `req.ip` (o Express resolve o `X-Forwarded-For` de forma segura conforme o `trust proxy`). Sem proxy, usar `req.socket.remoteAddress`.

---

### ISS-09 — Confirmação de e-mail sem limite de tentativas

| | |
|---|---|
| **Módulo** | `auth` |
| **Local** | `src/modules/auth/auth.service.ts:65` (`confirmEmail`) |

**Problema:** diferente da recuperação de senha (máximo de 5 tentativas), a confirmação do cadastro não conta tentativas. A única barreira é o rate limit (5/min por IP), contornável (ISS-08).

**Impacto:** o código de 6 dígitos (1 milhão de combinações) pode ser descoberto por força bruta durante os 10 minutos de validade, permitindo **criar contas com e-mails de terceiros**.

**Solução:** guardar `attempts` no JSON de `verify-email-{email}` e aplicar a mesma lógica de `confirmCodeRecovery` (incrementar com `KEEPTTL`; ao atingir 5, apagar a chave e lançar `LIMIT_ATTEMPTS`).

---

### ISS-10 — `tokenUUID` de recuperação reutilizável e sessões não revogadas

| | |
|---|---|
| **Módulo** | `auth` |
| **Local** | `src/modules/auth/auth.service.ts:294` (`createNewPassword`) |

**Problema:** após atualizar a senha, a chave `recovery-password-{uuid}` (com `authorized: true`) **não é apagada**. Além disso, os refresh tokens existentes continuam válidos.

**Impacto:**
- Quem tiver o `tokenUUID` autorizado pode **trocar a senha de novo** quantas vezes quiser durante o restante dos 10 minutos.
- Se a troca foi motivada por invasão, o invasor **continua logado** por até 7 dias (refresh token).

**Solução:**
1. `await redis.del(`recovery-password-${tokenUUID}`)` logo após `updatePasswordHash`.
2. Revogar sessões do usuário: manter um índice por usuário (ex.: set `user-sessions-{userId}` com os `jti`) e apagar todos os `refresh-token-{jti}` na troca de senha.

---

### ISS-11 — Cadastro pendente não é removido após a confirmação

| | |
|---|---|
| **Módulo** | `auth` |
| **Local** | `src/modules/auth/auth.service.ts:65`–`93` (`confirmEmail`) |

**Problema:** depois de `UserRepository.createUser`, a chave `verify-email-{email}` continua no Redis.

**Impacto:** uma segunda chamada com o mesmo código (duplo clique, retry do frontend) tenta inserir o usuário de novo, viola o `UNIQUE` de `email` e retorna **500 `USER_CREATION_FAILED`** em vez de uma resposta coerente. O código continua utilizável até expirar.

**Solução:** apagar a chave após criar o usuário (`redis.del(`verify-email-${data.email}`)`) e, antes de criar, verificar se o e-mail já existe (retornando 409 `USER_ALREADY_EXISTS`).

---

### ISS-12 — CPF/CNPJ de usuário duplicado só é detectado no INSERT

| | |
|---|---|
| **Módulo** | `auth` |
| **Local** | `src/modules/auth/auth.service.ts:18` (`verifyEmail`) · `:79` (`confirmEmail` → `createUser`) · `prisma/schema.prisma:21` (`@@unique([cnpjCpf])`) |

**Problema:** `verifyEmail` verifica apenas se o **e-mail** já existe. O CPF/CNPJ é único em `users`, mas isso só é descoberto no `INSERT`, e o repositório converte a violação em 500 genérico.

**Impacto:** o usuário passa por todo o fluxo (recebe e digita o código) e no final recebe **500 `USER_CREATION_FAILED`**, sem saber que o documento já está cadastrado.

**Solução:** adicionar `UserRepository.findByCnpjCpf` e verificar em `verifyEmail`, lançando `ConflictError` (novo código, ex.: `CNPJ_CPF_ALREADY_EXISTS`). Opcionalmente, tratar `P2002` do Prisma no repositório (ver ISS-18).

---

## 🟡 Médias

### ISS-13 — CPF/CNPJ não é normalizado antes de salvar

| | |
|---|---|
| **Módulo** | `clients` / `auth` |
| **Local** | `src/shared/utils/IsValidCnpjCpf.ts:4` · `src/modules/clients/clients.schema.ts` · `src/modules/auth/auth.schema.ts:8` |

**Problema:** `isValidCnpjCpf` remove a máscara só para validar; o valor persistido é o original.

**Impacto:**
- CNPJ com máscara (`12.345.678/0001-90`, 18 caracteres) estoura `VARCHAR(14)` → **500**.
- O mesmo documento com e sem máscara (CPF formatado tem 14 caracteres e cabe) **burla a unicidade**, gerando duplicados.
- Filtros por `cnpjCpf` na listagem falham conforme o formato.

**Solução:** normalizar no schema:
```ts
cnpjCpf: z.string()
    .transform(v => v.replace(/\D/g, ''))
    .refine(isValidCnpjCpf, { message: 'CPF ou CNPJ inválido' })
```
e, se houver dados existentes com máscara, uma migration de limpeza.

---

### ISS-14 — E-mail de cliente único em toda a tabela

| | |
|---|---|
| **Módulo** | `database` / `clients` |
| **Local** | `prisma/schema.prisma:30` (`email String? @unique`) |

**Problema:** o e-mail de cliente é único globalmente, embora clientes sejam dados de cada usuário.

**Impacto:** dois usuários não conseguem cadastrar o mesmo cliente (mesmo e-mail); a violação vira **500** (`'Erro ao cadastrar o cliente'`). Também revela indiretamente que o e-mail já existe na base de outro usuário.

**Solução:** trocar por `@@unique([userId, email])` (migration), verificar duplicidade no service e retornar 409.

---

### ISS-16 — E-mails não são normalizados (maiúsculas/minúsculas)

| | |
|---|---|
| **Módulo** | `auth` / `clients` |
| **Local** | `src/modules/auth/auth.schema.ts` · `src/modules/clients/clients.schema.ts` · `prisma/schema.prisma:13` |

**Problema:** `Joao@Exemplo.com` e `joao@exemplo.com` são tratados como e-mails diferentes (o `UNIQUE` do PostgreSQL diferencia maiúsculas).

**Impacto:** contas duplicadas para a mesma pessoa; login falha se o usuário digitar com outra capitalização; chaves do Redis (`verify-email-{email}`) divergentes.

**Solução:** normalizar nos schemas:
```ts
email: z.string().trim().toLowerCase().pipe(z.email().max(255))
```

---

### ISS-17 — Parâmetro `:id` das rotas não é validado

| | |
|---|---|
| **Módulo** | `clients` |
| **Local** | `src/modules/clients/clients.controller.ts:26`, `:39`, `:66` (`Number(id)`) |

**Problema:** `Number('abc')` resulta em `NaN`, que é repassado ao Prisma.

**Impacto:** `GET /clients/abc` (ou `DELETE`/`PATCH`) retorna **500** em vez de 400.

**Solução:** schema de params (`z.object({ id: z.coerce.number().int().positive() })`) validado no controller ou num middleware `validateParams`.

---

### ISS-18 — Erros conhecidos do Prisma viram 500

| | |
|---|---|
| **Módulo** | `clients` / `shared` |
| **Local** | `src/modules/clients/clients.repository.ts` (todos os `catch`) · `src/modules/user/user.repository.ts:196` |

**Problema:** os repositórios convertem qualquer erro do Prisma em `AppError` 500, inclusive erros esperados: `P2002` (violação de unique) e `P2025` (registro não encontrado em `update`/`delete`).

**Impacto:** situações de cliente (duplicidade, id inexistente na edição) aparecem como erro interno, dificultando o tratamento no frontend e mascarando a causa real.

**Solução:** nos repositórios (ou no `handleError`), tratar `Prisma.PrismaClientKnownRequestError`: `P2002` → `ConflictError`, `P2025` → `NotFoundError`. Na edição, verificar a existência antes do `update`.

---

### ISS-20 — Limite do nome no Zod maior que a coluna

| | |
|---|---|
| **Módulo** | `clients` |
| **Local** | `src/modules/clients/clients.schema.ts:6`, `:18`, `:30` (`max(255)`) · coluna `clients.name VARCHAR(100)` |

**Problema/Impacto:** nomes entre 101 e 255 caracteres passam na validação e falham no banco com **500**.

**Solução:** `z.string().min(1).max(100)`.

---

### ISS-21 — Preço de produto limitado a 999.99

| | |
|---|---|
| **Módulo** | `database` |
| **Local** | `prisma/schema.prisma:46` (`price Decimal @db.Decimal(5, 2)`) |

**Problema/Impacto:** `DECIMAL(5,2)` comporta no máximo 999.99; produtos mais caros não podem ser cadastrados quando o módulo `products` for implementado.

**Solução:** migration para `@db.Decimal(12, 2)` (ou outra precisão adequada) antes de implementar o módulo.

---

### ISS-22 — Recuperação de senha revela se o e-mail existe

| | |
|---|---|
| **Módulo** | `auth` |
| **Local** | `src/modules/auth/auth.service.ts:213`–`214` (`sendCodeRecovery`) |

**Problema:** e-mail inexistente → 401 `INVALID_CREDENTIALS`; existente → 200 com `tokenUUID`.

**Impacto:** permite **enumerar** quais e-mails têm conta (base para phishing e ataques direcionados).

**Solução:** responder sempre 200 com um `tokenUUID` (aleatório e sem chave no Redis quando o e-mail não existir) e só enviar o e-mail se o usuário existir.

---

### ISS-23 — CORS fixo e na mesma porta da API

| | |
|---|---|
| **Módulo** | infraestrutura |
| **Local** | `src/index.ts:12` (`PORT || 3000`) e `:20` (`origin: 'http://localhost:3000'`) |

**Problema:** a origem permitida está fixa no código e é a mesma porta padrão da própria API.

**Impacto:** em desenvolvimento, frontend e API não podem rodar ambos na porta 3000; em produção, a origem real do frontend é bloqueada sem alterar código.

**Solução:** variável `CORS_ORIGIN` (aceitando lista separada por vírgula) e porta padrão da API diferente (ex.: `3333`).

---

### ISS-24 — JSON malformado retorna 500 e erros inesperados não são logados

| | |
|---|---|
| **Módulo** | middlewares |
| **Local** | `src/middlewares/handleError.ts:33` |

**Problema:** um body com JSON inválido gera um erro do `express.json()` (`type: 'entity.parse.failed'`, `status: 400`) que cai no fallback 500. Além disso, o fallback não registra o erro em lugar nenhum.

**Impacto:** resposta incorreta ao cliente (500 em vez de 400) e **nenhuma informação para depurar** erros inesperados em produção.

**Solução:**
```ts
if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'JSON inválido' })
}
console.error(error)   // ou um logger (pino/winston)
return res.status(500).json({ success: false, error: 'Erro interno do servidor' })
```

---

### ISS-25 — Rate limit não atômico e sem tratamento de falha do Redis

| | |
|---|---|
| **Módulo** | middlewares |
| **Local** | `src/middlewares/rateLimit.ts:10`–`12` |

**Problema:** `INCR` e `EXPIRE` são comandos separados; se o `EXPIRE` falhar após o `INCR`, a chave fica **sem TTL** e o IP é bloqueado permanentemente naquela rota. Sem `try/catch`, qualquer falha do Redis derruba todas as rotas com 500.

**Impacto:** bloqueios permanentes esporádicos; indisponibilidade total da API se o Redis cair.

**Solução:** usar `redis.multi().incr(key).expire(key, ttl, 'NX').exec()` (atômico) e envolver em `try/catch`, decidindo explicitamente entre *fail-open* (deixa passar) ou *fail-closed* (503).

---

### ISS-26 — Imagem de produção não consegue rodar migrations

| | |
|---|---|
| **Módulo** | infraestrutura |
| **Local** | `Dockerfile` (estágio final, `npm ci --omit=dev`) · `prisma.config.ts` |

**Problema:** o CLI `prisma` está em `devDependencies` e não é instalado na imagem final; o container também não executa migrations ao iniciar.

**Impacto:** não há caminho automatizado para aplicar migrations em produção; uma versão com mudança de schema sobe com o banco desatualizado.

**Solução:** um passo de migração no deploy (job/step do CI com `npx prisma migrate deploy` apontando para o banco de produção) ou um serviço `migrate` no compose usando a imagem do estágio `builder`.

---

### ISS-28 — Logout sem cookie falha e não limpa os cookies

| | |
|---|---|
| **Módulo** | `auth` |
| **Local** | `src/modules/auth/auth.service.ts:309` (`logout`) · `src/modules/auth/auth.controller.ts` (`logout`) |

**Problema:** sem cookie `refreshToken` (ou com ele expirado), `jwt.verify` lança erro → 401, e o controller não chega a chamar `clearAuthCookies`. Além disso, erros que não são de JWT nem `AppError` são engolidos silenciosamente no `catch`.

**Impacto:** o frontend não consegue "deslogar" um usuário com sessão inconsistente (o `accessToken` permanece no navegador).

**Solução:** sempre limpar os cookies no controller (ex.: em `finally`) e tratar refresh token ausente/expirado como logout bem-sucedido; relançar erros desconhecidos.

---

### ISS-29 — Hash da senha calculado antes das verificações

| | |
|---|---|
| **Módulo** | `auth` |
| **Local** | `src/modules/auth/auth.service.ts:24`–`27` (`verifyEmail`) |

**Problema:** o Argon2 (64 MiB de memória por operação) é executado antes de verificar o cooldown.

**Impacto:** requisições que serão rejeitadas pelo cooldown ainda consomem CPU e memória; amplifica ataques de negação de serviço.

**Solução:** mover `ArgonHash.argonHash(data.password)` para depois de `verifyKeyExists`.

---

## 🟢 Baixas

### ISS-30 — Testes com erros de tipo e fixtures incompletas

| | |
|---|---|
| **Módulo** | tests |
| **Local** | `tests/unit/auth/verifyEmail.unit.test.ts:29` (`defaultData`) · `tests/unit/auth/login.unit.test.ts:32` |

**Problema:** as fixtures não têm `cnpjCpf`, campo obrigatório nos tipos. `tsc --noEmit -p tsconfig.json` aponta 11 erros. Os testes passam porque o Vitest não faz type-check, e as asserções de `verifyEmail` não verificam o `cnpjCpf` no retorno nem no JSON salvo no Redis.

**Impacto:** os testes não refletem o fluxo real (o `cnpjCpf` não é testado) e o projeto não compila com o `tsconfig.json` completo.

**Solução:** incluir `cnpjCpf` nas fixtures e nas asserções; opcionalmente adicionar `tsc --noEmit` ao CI.

---

### ISS-31 — Aviso de lint no `handleError`

| | |
|---|---|
| **Módulo** | middlewares |
| **Local** | `src/middlewares/handleError.ts:10` |

**Problema:** `'next' is defined but never used` (o parâmetro é necessário para o Express reconhecer o error handler).

**Solução:** renomear para `_next` (padrão aceito pela regra do ESLint do projeto).

---

### ISS-32 — Mensagens e códigos de erro incorretos

| | |
|---|---|
| **Módulo** | `clients` / `shared` / `auth` |
| **Local** | `clients.repository.ts:43` · `clients.repository.ts:59` · `shared/utils/verifyKeyExists.ts:11` · `auth.controller.ts:83` |

**Problema:**
- `delete` de cliente: mensagem `'Erro ao deletar usuário.'`.
- `searchClientByCnpjCpf`: mensagem `'... busca de cliente pelo email'`.
- `verifyKeyExists` (leitura) usa `REDIS_SAVE_ERROR`.
- `refresh-token` sem cookie lança `UnauthorizedError` **sem `code`**.
- `confirmEmail` lança `REDIS_GET_ERROR` com mensagem de "recuperação de senha".

**Impacto:** mensagens confusas para o usuário e códigos inconsistentes para o frontend.

**Solução:** corrigir as mensagens; usar `REDIS_GET_ERROR` em `verifyKeyExists`; `ErrorCode.INVALID_TOKEN` no controller de refresh.

---

### ISS-33 — Envio de e-mail: remetente e transporter

| | |
|---|---|
| **Módulo** | `auth` |
| **Local** | `src/modules/auth/auth.repository.ts:11`–`19` |

**Problema:** um `transporter` do Nodemailer é criado a cada envio, e `from: "OrçaFácil"` não contém endereço de e-mail.

**Impacto:** custo de conexão a cada envio; remetente pode ser reescrito pelo Gmail ou o e-mail ser marcado como spam.

**Solução:** criar o transporter uma vez (ex.: `src/lib/mailer.ts`) e usar `from: \`"OrçaFácil" <${process.env.USER_EMAIL}>\``.

---

### ISS-34 — Código legado e não utilizado

| | |
|---|---|
| **Módulo** | vários |
| **Local** | `src/shared/errors/ErrorCodes.ts` · `package.json` · `src/modules/user/user.dtos.ts` · `src/index.ts:14` · `bitbucket-pipelines.yml` |

**Problema:**
- `ErrorCode.SELLER_NOT_EXISTS` (módulo removido), `CREATE_DATABASE_ERROR` (valor `'DATABASE_ERROR'` diferente da chave), `DELETE_DATABASE_ERROR`, `INTERNAL_HASH_ERROR` sem uso.
- `nodemon` em `dependencies` sem uso.
- `UserResponseDTO` (snake_case) sem uso.
- Comentário `// teste` em `src/index.ts`; import de `ClientsRoutes` com caminho relativo em vez de `@/`.
- `REDIS_URL` exportada no CI sem uso.

**Solução:** remover ou alinhar esses itens.

---

### ISS-35 — README desatualizado

| | |
|---|---|
| **Módulo** | documentação |
| **Local** | `README.md` |

**Problema:** cita scripts inexistentes (`dev:docker:run`, `test:docker:unit`), instrui criar `.env.dev` (o código lê `.env`), aponta o clone para o GitHub (o remoto é Bitbucket) e pede Node v16 (o projeto usa 20/24).

**Solução:** atualizar com os scripts reais (`dev:docker:up`, `dev:docker:down`, `test:unit:run`), o arquivo `.env`, o remoto correto e a versão do Node.

---

### ISS-36 — Pipeline de CI incompleto

| | |
|---|---|
| **Módulo** | infraestrutura |
| **Local** | `bitbucket-pipelines.yml` |

**Problema:** usa `npm install` (pode alterar o lock) em vez de `npm ci`; não roda `npm run lint`; usa Node 24 enquanto produção usa Node 20; sobe PostgreSQL/Redis que os testes unitários não usam (útil só para validar migrations).

**Solução:** `npm ci`, adicionar `npm run lint`, alinhar a versão do Node com o `Dockerfile`.

---

### ISS-37 — Dockerfile sem `.dockerignore` e rodando como root

| | |
|---|---|
| **Módulo** | infraestrutura |
| **Local** | `Dockerfile` · raiz do repositório |

**Problema:** sem `.dockerignore`, `COPY . .` envia `node_modules`, `.git` e os arquivos `.env` para o contexto de build (o `.env` fica na camada do estágio `builder`). A imagem final roda como `root`.

**Impacto:** builds mais lentos, segredos no cache de build, maior superfície em caso de comprometimento do container.

**Solução:** criar `.dockerignore` (`node_modules`, `.git`, `.env*`, `dist`, `coverage`, `tests`) e adicionar `USER node` no estágio final.

---

### ISS-38 — Sem CD e imagem com placeholder

| | |
|---|---|
| **Módulo** | infraestrutura |
| **Local** | `docker-compose.prod.yml:3` (`ghcr.io/SEU_USUARIO/orcafacil-api:latest`) · `bitbucket-pipelines.yml` |

**Problema:** nenhum pipeline constrói/publica a imagem; o compose referencia um registry com placeholder e a tag `latest`.

**Impacto:** deploy manual e sujeito a erro; sem versionamento das imagens (rollback difícil).

**Solução:** step `branches: main` no Bitbucket Pipelines para build, push (com tag do commit) e deploy; substituir o placeholder pelo registry real.

---

### ISS-39 — Sem índice em `products.userId`

| | |
|---|---|
| **Módulo** | `database` |
| **Local** | `prisma/schema.prisma` (model `Product`) |

**Problema/Impacto:** o PostgreSQL não indexa FKs automaticamente; listagens de produtos por usuário farão *seq scan* conforme a tabela crescer.

**Solução:** adicionar `@@index([userId])` ao model `Product` ao implementar o módulo.

---

### ISS-40 — Access token continua válido após logout

| | |
|---|---|
| **Módulo** | `auth` |
| **Local** | `src/middlewares/authenticate.ts` · `src/modules/auth/auth.service.ts` (`logout`) |

**Problema:** o logout revoga apenas o refresh token; o access token (stateless) segue válido até expirar.

**Impacto:** um access token vazado pode ser usado por até 15 minutos após o logout. Limitação aceitável do modelo JWT, mas deve ser conhecida.

**Solução (se necessário):** blacklist de `jti` de access tokens no Redis com TTL igual ao tempo restante do token, verificada no `authenticate`.

---

## Resolvidos

| ID | Sev. | Módulo | Título | Resolvido em | Correção |
|---|---|---|---|---|---|
| ISS-01 | 🔴 | clients | Build quebrado por campo `sellerId` removido | 2026-10-16 | `sellerId` removido de `ClientsRepository.create` e de `ClientsTypes`; `npm run build` passa. |
| ISS-02 | 🔴 | infra / shared | `cpf-cnpj-validator` em `devDependencies` | 2026-10-16 | Pacote movido para `dependencies` (`package.json` e `package-lock.json`). |
| ISS-03 | 🔴 | auth | Reenvio de código grava o código sem hash | 2026-10-16 | `resendEmailCode` grava o hash Argon2 do novo código (e trata falha do `redis.get` com `REDIS_GET_ERROR`); testes em `tests/unit/auth/resendEmailCode.unit.test.ts`. |
| ISS-04 | 🔴 | clients | Criação de cliente usa `userId` enviado no body | 2026-10-16 | `userId` removido de `ClientsSchema.create`; o controller usa `Number(req.user)`; testes em `tests/unit/clients/create.unit.test.ts`. |
| ISS-05 | 🔴 | clients | Editar, excluir e buscar cliente sem verificar o dono (IDOR) | 2026-10-16 | `userId` removido de `ClientsSchema.edit`; o controller passa `Number(req.user)` a `edit`, `delete` e `getById`; `searchClientById(id, userId)` usa `findFirst({ where: { id, userId } })`; `update`/`delete` filtram por `{ id, userId }`; testes em `tests/unit/clients/{edit,delete,getById}.unit.test.ts`. |
| ISS-15 | 🟡 | clients | Editar cliente com o próprio CPF/CNPJ retorna 409 | 2026-10-16 | `ClientsService.edit` só lança `CLIENT_ALREADY_EXISTS` quando o CPF/CNPJ pertence a **outro** cliente (`oldClient.id !== id`). |
| ISS-19 | 🟡 | clients | "Não encontrado" retorna 409 em vez de 404 | 2026-10-16 | `edit`, `delete` e `getById` lançam `NotFoundError` (404) com `INVALID_ID_CLIENT` e mensagem `'Cliente não encontrado.'`. |
| ISS-27 | 🟡 | clients | `refine` do schema de edição é inócuo | 2026-10-16 | Sem `userId` no schema, o `refine` volta a exigir ao menos um campo; mensagem corrigida para "campo". |

---

## Ordem sugerida de correção

1. **Destravar deploy:** ISS-06, ISS-07.
2. **Fluxos de autenticação quebrados ou inseguros:** ISS-08, ISS-09, ISS-10, ISS-11, ISS-12.
3. **Integridade de dados:** ISS-13, ISS-14, ISS-16, ISS-20, ISS-21 (antes de `products`).
4. **Respostas e robustez:** ISS-17, ISS-18, ISS-22 a ISS-26, ISS-28, ISS-29.
5. **Qualidade e manutenção:** ISS-30 a ISS-40.

Após corrigir itens que mudam comportamento, atualizar também: [`../database/schema.md`](../database/schema.md#5-pontos-de-atenção-estado-atual), [`../database/relationships.md`](../database/relationships.md#4-isolamento-por-usuário-multi-tenant), [`../modules/clients.md`](../modules/clients.md), [`../modules/auth.md`](../modules/auth.md) e [`../testing/test-coverage.md`](../testing/test-coverage.md).
