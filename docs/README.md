---
title: "RAG orcafacil-api: regras e índice"
description: "Ponto de entrada do RAG: regras obrigatórias para IAs, critérios de rate limit, guia de leitura, manutenção e checklist de entrega."
type: index
tags:
  - "regras"
  - "indice"
  - "rate-limit"
  - "checklist"
  - "manutencao"
modules:
  - "auth"
  - "clients"
  - "user"
sources:
  - "CLAUDE.md"
  - "AGENTS.md"
  - ".claude/rules/"
related:
  - "project/overview.md"
  - "architecture/conventions.md"
  - "testing/strategy.md"
last_reviewed: 2026-10-17
---

# RAG — orcafacil-api

> **Leia este arquivo primeiro.** Ele explica como usar esta documentação e define as **regras obrigatórias** para qualquer IA (ou pessoa) que for escrever código no `orcafacil-api`.
> **Repositório do projeto:** `orcafacil-api` (Bitbucket: `bitbucket.org/orcafacil-api/orcafacil-api`).
> **Última revisão:** 2026-10-17.

---

## 1. O que é este RAG

Documentação do backend do **OrçaFácil**, um sistema de gestão de orçamentos e clientes (API REST em Node.js, TypeScript, Express 5, Prisma, PostgreSQL e Redis). Ela foi escrita para que uma IA entenda o projeto e trabalhe nele **seguindo os padrões já existentes**.

- O RAG fica em `docs/` no próprio repositório e é **versionado junto com o código**: mudanças de código e de documentação vão no mesmo PR.
- Ele é indicado às ferramentas de IA pelo `CLAUDE.md` (Claude Code) e pelo `AGENTS.md` (outras ferramentas), na raiz do repositório. Os dois são curtos e apontam para este README.
- No Claude Code, as regras da seção 2 também existem resumidas em `.claude/rules/`, uma por camada (`routes.md`, `layers.md`, `database.md`, `tests.md`, `rag-docs.md`). Cada rule tem um frontmatter `paths:` e só entra no contexto quando a IA lê ou edita um arquivo que casa com esses globs. **Este README continua sendo a fonte da verdade**; as rules são resumos com links para cá.
- Se este RAG divergir do código, **o código prevalece**, e o RAG deve ser corrigido.
- Cada documento começa com **metadados em YAML** (frontmatter, ver a seção 5.1), seguidos de um cabeçalho de **Escopo**, **Documentos relacionados** e **Fonte da verdade**.
- Visão geral do produto: [`project/overview.md`](./project/overview.md).

---

## 2. Regras obrigatórias

As regras abaixo valem para **todo código novo ou alterado**. Ao revisar uma tarefa, confira cada uma.

### 2.1 Rotas

- **Toda rota nova deve ter `rateLimit`.** A IA deve analisar a rota e o objetivo dela e definir a quantidade de requisições e a janela de tempo (ver os critérios na seção 3).
- **Rotas com informações sensíveis devem usar `authenticate`.** Isso inclui qualquer rota que leia, crie, altere ou exclua dados de um usuário (clientes, produtos, orçamentos, perfil, etc.).
- **Toda rota que recebe body deve ter um schema Zod** validando **cada campo** conforme a necessidade (tipo, obrigatoriedade, tamanho mínimo e máximo alinhado à coluna do banco, formato).

Ordem da cadeia de middlewares:

```ts
Router.metodo('/caminho', rateLimit(max, janelaSeg, 'modulo/acao'), authenticate, validateSchema(Schema.acao), Controller.metodo)
```

Referências: [`architecture/conventions.md`](./architecture/conventions.md#41-route) · [`api/validation.md`](./api/validation.md) · [`api/authentication.md`](./api/authentication.md#4-protegendo-rotas--middleware-authenticate) · [`infrastructure/redis.md`](./infrastructure/redis.md#5-rate-limit)

### 2.2 Controllers

- Os controllers fazem **apenas**:
  1. receber os dados da requisição (body já validado pelo `validateSchema`, `params`, `query`, `req.user`), **tipados** com o DTO do módulo;
  2. chamar o service passando esses dados;
  3. responder em caso de sucesso (`res.status(200).json({ success: true, data })`);
  4. em caso de erro, cair no `catch` e repassar com `next(error)`, para que o `handleError` capture.
- Controllers **não** têm regra de negócio, **não** acessam o banco e **não** usam o Redis.

```ts
static async create(req: Request, res: Response<ApiResponse<ModuloDTOs['CreateResponseDTO']>>, next: NextFunction){
    const data: ModuloDTOs['CreateRequestDTO'] = req.body
    try{
        const result = await ModuloService.create({ ...data, userId: Number(req.user) })
        return res.status(200).json({ success: true, data: result })
    }catch(error){
        next(error)
    }
}
```

Referências: [`architecture/conventions.md`](./architecture/conventions.md#42-controller) · [`api/error-handling.md`](./api/error-handling.md)

### 2.3 Services

- São responsáveis pelas **regras de negócio**, pela **lógica** e pelas **validações e verificações** (existência, duplicidade, permissão, estado).
- O **uso do Redis é feito aqui**: chaves sempre com TTL e cada operação em `try/catch` convertida em `AppError(…, 500, ErrorCode.REDIS_*_ERROR)`.
- Lançam erros de domínio (`ConflictError`, `UnauthorizedError`, `NotFoundError`, `AppError`) **sempre com um `ErrorCode`**.
- Não conhecem `req`/`res` do Express.

Referências: [`architecture/conventions.md`](./architecture/conventions.md#43-service) · [`infrastructure/redis.md`](./infrastructure/redis.md#10-regras-para-novas-chaves)

### 2.4 Repositories

- São responsáveis pelo **acesso ao banco de dados através do ORM (Prisma)**.
- Cada método envolve uma operação Prisma em `try/catch` e converte falhas em `AppError(…, 500, ErrorCode.<CODIGO>)`.
- Retornam `null` quando não encontram registros; quem decide se isso é erro é o service.
- Não contêm regra de negócio.

> Exceção existente: `AuthUserRepository` faz o envio de e-mail (Nodemailer) e não acessa o banco.

Referências: [`architecture/conventions.md`](./architecture/conventions.md#44-repository) · [`database/schema.md`](./database/schema.md)

### 2.5 Regras gerais

- **Atualizar o RAG junto com o código.** Toda mudança de comportamento, rota, tabela, variável de ambiente ou padrão deve ser refletida nos documentos afetados, na mesma entrega (ver a seção 5).
- **Todo service novo deve ter testes unitários**, seguindo o padrão já usado: Vitest, todas as dependências mockadas e **um arquivo por método** em `tests/unit/{modulo}/{metodo}.unit.test.ts`. Guia completo: [`testing/strategy.md`](./testing/strategy.md).

---

## 3. Critérios para definir o `rateLimit`

Assinatura: `rateLimit(maxReqLimit, maxTimeLimit, route)`, com o limite **por IP + rota** e a janela em **segundos**. O terceiro argumento identifica a rota no formato `'{modulo}/{acao}'`.

Classifique a rota e parta da faixa abaixo:

| Tipo de rota | Exemplos | Faixa sugerida | Valores atuais no projeto |
|---|---|---|---|
| Dispara e-mail, SMS ou custo externo | enviar código, reenviar código | **1–2 / 60 s** | `email/verify` 2, `resend-email-code` 1, `password-recovery/send-code` 1 |
| Verifica segredo (senha, código) | login, confirmar código | **5–10 / 60 s** | `login` 5, `email/confirm` 5, `password-recovery/confirm-code` 10 |
| Altera credenciais ou sessão | nova senha, logout | **1–3 / 60 s** | `new-password` 3, `logout` 1 |
| Renovação de sessão | refresh token | **~10 / 60 s** | `refresh-token` 10 |
| Escrita autenticada (CRUD) | criar, editar, excluir | **~60–100 / 60 s** | `clients/*` 100 |
| Leitura autenticada | listar, buscar por id | **~100–200 / 60 s** | `clients/getAll`, `clients/getById` 100 |
| Operação pesada | relatórios, exportações, geração de PDF | **~5–20 / 60 s** | — |

Ao decidir, considere:

- **Custo:** a rota executa Argon2, envia e-mail ou faz consultas pesadas? Se sim, o limite deve ser mais baixo.
- **Risco de força bruta:** a rota testa um segredo? Use um limite baixo.
- **Uso legítimo:** quantas vezes por minuto uma pessoa usando o frontend chamaria a rota (listagens com filtros e paginação são chamadas com frequência)?
- **Consistência:** rotas do mesmo módulo e tipo devem ter limites iguais.

Registre a escolha na documentação da rota ([`api/endpoints.md`](./api/endpoints.md) e no documento do módulo).

---

## 4. Como usar este RAG

### Por onde começar, conforme a tarefa

| Tarefa | Leia, nesta ordem |
|---|---|
| Entender o projeto | [`project/overview.md`](./project/overview.md) → [`architecture/overview.md`](./architecture/overview.md) |
| Criar um módulo ou endpoint | Este README → [`architecture/conventions.md`](./architecture/conventions.md) → [`architecture/folder-structure.md`](./architecture/folder-structure.md) → [`modules/clients.md`](./modules/clients.md) (módulo de referência) |
| Alterar o banco | [`database/schema.md`](./database/schema.md) → [`database/relationships.md`](./database/relationships.md) |
| Mexer em autenticação | [`api/authentication.md`](./api/authentication.md) → [`modules/auth.md`](./modules/auth.md) → [`infrastructure/redis.md`](./infrastructure/redis.md) |
| Validação e erros | [`api/validation.md`](./api/validation.md) → [`api/error-handling.md`](./api/error-handling.md) |
| Escrever testes | [`testing/strategy.md`](./testing/strategy.md) → [`testing/test-coverage.md`](./testing/test-coverage.md) |
| Ambiente, Docker, CI | [`infrastructure/environment.md`](./infrastructure/environment.md) → [`infrastructure/dependencies.md`](./infrastructure/dependencies.md) |
| Segurança | [`infrastructure/security.md`](./infrastructure/security.md) |
| Corrigir problemas conhecidos | [`project/issues.md`](./project/issues.md) |
| Regras de negócio, nomes de conceitos, novos módulos de domínio | [`domain/glossary.md`](./domain/glossary.md) → [`domain/business-rules.md`](./domain/business-rules.md) (siga a regra definida mesmo quando o código atual divergir) |
| Planejar o próximo trabalho | [`domain/roadmap.md`](./domain/roadmap.md) → [`project/issues.md`](./project/issues.md) |
| Implementar um módulo planejado | Especificação do módulo em `domain/` (ex.: [`domain/products.md`](./domain/products.md)) → [`domain/business-rules.md`](./domain/business-rules.md) → [`modules/clients.md`](./modules/clients.md) (padrão de implementação) |

### Estrutura

```
docs/
├── README.md                       ← este arquivo (regras e índice)
├── project/
│   ├── overview.md                 objetivo, domínio, escopo
│   └── issues.md                   problemas conhecidos e soluções
├── domain/
│   ├── glossary.md                 termos do domínio e nomes usados no código
│   ├── business-rules.md           regras de negócio oficiais e decisões de produto
│   ├── roadmap.md                  fases de evolução do produto e progresso
│   ├── products.md                 especificação do módulo de produtos
│   ├── services.md                 especificação do módulo de serviços
│   ├── budgets.md                  especificação do módulo de orçamentos
│   └── dispatch.md                 especificação do envio do orçamento
├── architecture/
│   ├── overview.md                 arquitetura em camadas, stack, componentes
│   ├── folder-structure.md         organização de pastas
│   ├── request-lifecycle.md        ciclo de vida das requisições
│   └── conventions.md              convenções e padrões de código
├── modules/
│   ├── auth.md                     autenticação, cadastro, sessão, recuperação de senha
│   ├── clients.md                  CRUD de clientes (módulo de referência)
│   └── user.md                     repositório de usuários
├── api/
│   ├── endpoints.md                referência dos endpoints
│   ├── authentication.md           tokens, cookies, rotas protegidas
│   ├── validation.md               validação com Zod
│   └── error-handling.md           erros, ErrorCode, respostas
├── database/
│   ├── schema.md                   tabelas, colunas, convenções
│   └── relationships.md            relacionamentos e isolamento por usuário
├── infrastructure/
│   ├── dependencies.md             runtime, pacotes, scripts
│   ├── environment.md              variáveis, ambientes, Docker, CI/CD
│   ├── redis.md                    uso do Redis e rate limit
│   └── security.md                 medidas e diretrizes de segurança
└── testing/
    ├── strategy.md                 estratégia e padrão dos testes
    └── test-coverage.md            cobertura atual e lacunas
```

---

## 5. Mantendo o RAG atualizado

Ao alterar o código, atualize os documentos correspondentes:

| Mudança no código | Documentos a atualizar |
|---|---|
| Nova rota ou alteração de rota | `api/endpoints.md`, `modules/{modulo}.md`, `api/validation.md` (schemas) |
| Novo módulo | `modules/{modulo}.md` (novo), `architecture/folder-structure.md`, `architecture/overview.md` (tabela de módulos), `api/endpoints.md`, `project/overview.md` |
| Model, coluna ou migration | `database/schema.md` (inclusive o histórico de migrations), `database/relationships.md` |
| Novo `ErrorCode` ou classe de erro | `api/error-handling.md`, `modules/{modulo}.md` |
| Nova chave no Redis | `infrastructure/redis.md` (catálogo de chaves) |
| Nova variável de ambiente | `infrastructure/environment.md` |
| Nova dependência | `infrastructure/dependencies.md` |
| Mudança de autenticação ou segurança | `api/authentication.md`, `infrastructure/security.md`, `modules/auth.md` |
| Novos testes | `testing/test-coverage.md` |
| Novo padrão de código | `architecture/conventions.md` |
| Problema corrigido ou encontrado | `project/issues.md` (e remova a linha do problema em `.claude/rules/database.md`, se houver) |
| Regra obrigatória (seção 2 ou 3) criada ou alterada | Este README e a rule correspondente em `.claude/rules/` |
| Novo módulo ou camada com padrão próprio | Uma rule nova em `.claude/rules/` com `paths:` restrito aos arquivos dela, se o padrão não couber nas existentes |

Ao editar um documento, atualize a data de **Última revisão** no cabeçalho e o campo `last_reviewed` do frontmatter.

### 5.1 Metadados (frontmatter)

Todo documento do RAG começa com um bloco YAML entre `---`. Ele permite filtrar e localizar documentos por tipo, módulo, tag ou arquivo de código, e é aproveitado na indexação se o RAG for carregado em uma base vetorial.

```yaml
---
title: "Módulo auth"
description: "Cadastro com verificação de e-mail, login, refresh token, logout e recuperação de senha."
type: module
tags:
  - "auth"
  - "jwt"
modules:
  - "auth"
sources:
  - "src/modules/auth/"
  - "tests/unit/auth/"
related:
  - "modules/user.md"
  - "api/authentication.md"
last_reviewed: 2026-10-15
---
```

| Campo | Obrigatório | Conteúdo |
|---|---|---|
| `title` | sim | Nome do documento (string entre aspas). |
| `description` | sim | Uma frase resumindo o conteúdo. É o que um buscador lê para decidir se o documento é relevante. |
| `type` | sim | Um de: `index`, `project`, `domain`, `architecture`, `module`, `api`, `database`, `infrastructure`, `testing`. Corresponde à pasta do documento (`index` é este README). |
| `tags` | sim | Palavras-chave em minúsculas, sem acento, separadas por hífen (`rate-limit`, `cnpj-cpf`). |
| `modules` | sim | Módulos de `src/modules/` tratados no documento (`auth`, `clients`, `user`; `products`, `services` e `budgets` quando citados como planejados). Lista vazia `[]` para documentos gerais. |
| `sources` | sim | Caminhos **relativos à raiz do repositório** dos arquivos ou pastas de código que o documento descreve (a fonte da verdade). Pastas terminam com `/`. |
| `related` | sim | Caminhos **relativos a `docs/`** dos documentos relacionados. |
| `last_reviewed` | sim | Data da última revisão no formato `AAAA-MM-DD`. |

Regras:

- Ao **criar** um documento, inclua o frontmatter completo.
- Ao **alterar** um arquivo de código listado em `sources` de algum documento, revise esse documento.
- Ao **mover ou renomear** arquivos de código ou documentos, atualize `sources` e `related` de todos os documentos que os citam.
- Mantenha `related` coerente com a linha **Documentos relacionados** do cabeçalho.

---

## 6. Checklist de entrega

Antes de considerar uma tarefa concluída:

- [ ] Rotas novas têm `rateLimit` com limite justificado (seção 3).
- [ ] Rotas com dados sensíveis usam `authenticate`, e o id do usuário vem de `req.user`.
- [ ] Todo body tem schema Zod validando cada campo.
- [ ] O controller só recebe, tipa, chama o service e responde (ou faz `next(error)`).
- [ ] Regras de negócio, verificações e uso do Redis estão no service.
- [ ] O acesso ao banco está no repository, via Prisma.
- [ ] Os erros usam as classes de `src/shared/errors` com um `ErrorCode`.
- [ ] Há testes unitários para cada método de service novo, no padrão de [`testing/strategy.md`](./testing/strategy.md).
- [ ] `npm run test:unit:run`, `npm run build` e `npm run lint` passam.
- [ ] O RAG foi atualizado (seção 5), incluindo o frontmatter dos documentos alterados ou criados (seção 5.1).
