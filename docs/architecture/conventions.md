# Arquitetura — Convenções e Padrões

> **Escopo:** convenções de código e padrões identificados no `orcafacil-api`: nomenclatura, estilo, estrutura de cada camada, tipagem, validação, erros, respostas, Redis, rotas, testes, Git e CI. Use este documento como guia para escrever código que pareça ter sido escrito pelo mesmo autor.
> **Documentos relacionados:** [`overview.md`](./overview.md) · [`folder-structure.md`](./folder-structure.md) · [`request-lifecycle.md`](./request-lifecycle.md) · [`../database/schema.md`](../database/schema.md) (convenções de banco)
> **Fonte da verdade:** código do repositório `orcafacil-api`.
> **Última revisão:** 2026-10-15.

---

## 1. Idioma

| O quê | Idioma | Exemplo |
|---|---|---|
| Identificadores (variáveis, funções, classes, arquivos, rotas) | Inglês | `searchClientByCnpjCpf`, `/password-recovery/send-code` |
| Mensagens de erro e de validação retornadas ao cliente | Português | `'Cliente já cadastrado.'`, `'CPF ou CNPJ inválido'` |
| Comentários no código | Português ou inglês (curtos e raros) | `// Save on Redis`, `// 15 min` |
| Descrições de testes (`it`) | Português | `'deveria retornar UnauthorizedError caso…'` |
| Mensagens de commit e nomes de migration | Português | `feat(clients): implementada rota de edit` |

Termo de domínio fixo: **`cnpjCpf`** (campo único que aceita CPF ou CNPJ) e **`tellphone`** (grafia usada no banco e na API — manter).

---

## 2. Nomenclatura

### Arquivos

| Tipo | Padrão | Exemplo |
|---|---|---|
| Arquivos de módulo | `{modulo}.{camada}.ts` (minúsculo, módulo no plural quando for coleção) | `clients.service.ts`, `auth.route.ts` |
| Classes utilitárias / erros | PascalCase | `ArgonHash.ts`, `AuthCookies.ts`, `ConflictError.ts` |
| Funções utilitárias | camelCase | `generateCode.ts`, `verifyKeyExists.ts` |
| Middlewares | camelCase | `authenticate.ts`, `rateLimit.ts` |
| Testes | `{metodo}.unit.test.ts` | `login.unit.test.ts` |

### Símbolos

| Tipo | Padrão | Exemplo |
|---|---|---|
| Classes de camada | `{Modulo}{Camada}` | `ClientsController`, `ClientsService`, `ClientsRepository` |
| Routers | `{Modulo}Routes` (exportado nomeado) | `ClientsRoutes`, `AuthUserRoutes` |
| Objeto de schemas Zod | `{Modulo}Schema` ou `{modulo}Schemas` | `ClientsSchema`, `authSchemas` |
| Chaves de schema | ação em camelCase | `create`, `edit`, `getAllQuery`, `loginSchema` |
| Tipo de DTOs | `interface {Modulo}DTOs` | `ClientsDTOs` |
| Tipo interno | `type {Modulo}Types` | `ClientsTypes`, `UserTypes` |
| Métodos de CRUD | `create`, `edit`, `delete`, `getAll`, `getById` | — |
| Métodos de busca no repository | `findBy{Campo}` / `search{Entidade}By{Campo}` | `findByEmail`, `searchClientById` |
| Enum de erros | `ErrorCode.{SNAKE_UPPER}` | `ErrorCode.CLIENT_ALREADY_EXISTS` |

> No módulo `auth`, os nomes carregam o sufixo `User`: `AuthUserController`, `AuthUserService`, `AuthUserRepository`, `AuthUserRoutes`.

---

## 3. Estilo de código

Padrões predominantes (não há Prettier configurado; siga o estilo do arquivo que estiver editando):

- Indentação de **4 espaços**.
- **Sem ponto e vírgula** na maioria dos arquivos.
- Aspas simples ou duplas (as duas aparecem; mantenha a do arquivo).
- `try{ … }catch{ … }` com *optional catch binding* (sem `(error)`) quando o erro original não é usado.
- `async/await` sempre; nada de `.then()`.
- Imports com o alias `@/` para outras pastas de `src/`; `./` só dentro do mesmo módulo.
- Exports **nomeados** (sem `export default`).
- Variáveis de ambiente lidas direto de `process.env`, com non-null assertion quando obrigatórias (`process.env.JWT_ACCESS_SECRET!`).

**ESLint** (`eslint.config.mjs`): `js.recommended` + `typescript-eslint/recommended`, com:
- `@typescript-eslint/no-unused-vars`: `warn`, ignorando nomes iniciados por `_`;
- `@typescript-eslint/no-explicit-any`: desligado (`any` é permitido);
- `no-console`: desligado.

---

## 4. Padrões por camada

### 4.1 Route

```ts
const ClientsRoutes = Router()

ClientsRoutes.post('/create', rateLimit(100, 60, 'clients/create'), authenticate, validateSchema(ClientsSchema.create), ClientsController.create)
ClientsRoutes.get('/:id', rateLimit(100, 60, 'clients/getById'), authenticate, ClientsController.getById)

export { ClientsRoutes }
```

- Ordem fixa da cadeia: `rateLimit` → `authenticate` (se protegida) → `validateSchema` (se tiver body) → controller.
- **Toda rota tem `rateLimit`.** O terceiro argumento é a chave da rota no formato `'{modulo}/{acao}'` (ou o caminho, em `auth`: `'auth/email/verify'`).
- Rotas longas são quebradas em várias linhas, um middleware por linha.

**Caminhos e métodos**

| Ação | Método | Caminho |
|---|---|---|
| Criar | `POST` | `/{recurso}/create` |
| Editar (parcial) | `PATCH` | `/{recurso}/edit/:id` |
| Excluir | `DELETE` | `/{recurso}/delete/:id` |
| Listar (com filtros por query) | `GET` | `/{recurso}/` |
| Buscar por id | `GET` | `/{recurso}/:id` |
| Ações de autenticação | `POST` | caminho em kebab-case descrevendo a ação (`/password-recovery/send-code`) |

### 4.2 Controller

- Classe com **métodos estáticos**, um por endpoint.
- Assinatura tipada: `(req: Request, res: Response<ApiResponse<DTO>>, next: NextFunction)`.
- Corpo em `try/catch`; erro → `next(error)`.
- Sucesso → `res.status(200).json({ success: true, data })`. Sem conteúdo → `data: null`.
- Params numéricos convertidos com `Number(req.params.id)`; usuário autenticado com `Number(req.user)`.
- Body tipado com o DTO: `const data: ClientsDTOs['CreateRequestDTO'] = req.body`.

### 4.3 Service

- Classe com **métodos estáticos**, sem estado e sem dependência de `req`/`res`.
- Recebe DTOs, retorna DTOs (`Promise<ClientsDTOs['CreateResponseDTO']>`).
- Estilo *guard clause*: verifica e lança o erro na mesma linha.
  ```ts
  const oldClient = await ClientsRepository.searchClientByCnpjCpf(data.cnpjCpf, data.userId)
  if (oldClient) throw new ConflictError('Cliente já cadastrado.', ErrorCode.CLIENT_ALREADY_EXISTS)
  ```
- Chamadas ao Redis em `try/catch` próprio, convertidas em `AppError(…, 500, ErrorCode.REDIS_*_ERROR)`.
- Pode usar repositories de outros módulos (`UserRepository`), utilitários de `shared/utils` e o `redis` de `lib`.

### 4.4 Repository

- Classe com **métodos estáticos**; cada método envolve **uma** operação Prisma (ou integração externa) em `try/catch`.
- Falha → `throw new AppError('<mensagem>', 500, ErrorCode.<CODIGO>)`.
- Tipos de entrada/saída vêm de `{Modulo}Types`.
- Buscas retornam `null` quando não encontram (quem decide se é erro é o service).
- Em `users`, sempre `select` explícito omitindo `password` (exceto `returnLoginCredentials`).
- Chaves únicas compostas são usadas pelo nome gerado pelo Prisma: `where: { userId_cnpjCpf: { userId, cnpjCpf } }`.

### 4.5 Schema (Zod)

```ts
export const ClientsSchema = {
    create: z.object({ … }),
    edit: z.object({ … }).refine(…),
    getAllQuery: z.object({ … })
}
```

- Um objeto exportado por módulo agrupando todos os schemas.
- Strings com `.min()`/`.max()`; e-mail com `z.email().max(255)`; UUID com `z.uuid()`.
- Campos opcionais anuláveis: `.nullable().optional()`.
- CPF/CNPJ: `z.string().refine(isValidCnpjCpf, { message: 'CPF ou CNPJ inválido' })`.
- Senha: `z.string().min(8).max(128)`; confirmação via `.refine` comparando os campos, com `path` apontando para o campo de confirmação.
- Códigos de verificação: `z.string().min(6).max(6).regex(/^\d+$/, …)`.
- Schemas de edição usam todos os campos `.optional()`.
- Schemas de query terminam em `Query` e são aplicados no controller (`Schema.parse(req.query)`).

### 4.6 DTOs e Types

Tipos agrupados em **um único tipo por arquivo**, acessados por indexação:

```ts
// clients.dtos.ts — formatos da API
export interface ClientsDTOs {
    CreateRequestDTO: z.infer<typeof ClientsSchema.create>,
    CreateResponseDTO: { … },
    EditRequestDTO: z.infer<typeof ClientsSchema.edit>,
    EditResponseDTO: ClientsDTOs['CreateResponseDTO'],
}

// clients.types.ts — formatos internos (service ↔ repository)
export type ClientsTypes = {
    CreateType: { … },
    CreateResponseType: { … },
    EditType: z.infer<typeof ClientsSchema.edit>,
}

// uso
const data: ClientsDTOs['CreateRequestDTO'] = req.body
```

- DTOs: sufixos `RequestDTO`, `ResponseDTO`, `QueryDTO`.
- Types: sufixos `Type`, `ResponseType`.
- Tipos de request derivam do schema Zod com `z.infer<typeof Schema.x>`.
- Tipos repetidos referenciam outro membro (`ClientsDTOs['CreateResponseDTO']`) em vez de duplicar.

---

## 5. Erros

### Hierarquia (`src/shared/errors/`)

| Classe | Status | Uso |
|---|---|---|
| `AppError(message, statusCode = 400, code?)` | qualquer | Base. Usada direto para 500 (infraestrutura) e 429 (rate limit). |
| `ConflictError(message?, code?)` | 409 | Recurso já existe, conflito de estado, registro inválido para a operação, cooldown. |
| `UnauthorizedError(message?, code?)` | 401 | Credenciais, tokens e códigos inválidos ou expirados. |
| `NotFoundError(message?, code?)` | 404 | Recurso não encontrado. |

### Regras

- **Sempre** lançar uma subclasse de `AppError` com um `ErrorCode` — nunca `throw new Error()` ou string.
- Mensagem em português, curta, para o usuário final.
- Novos códigos entram em `ErrorCodes.ts`, na seção comentada do domínio (`// AUTH`, `// DATABASE`, `// USER`, `// CLIENTS`, `// SYSTEM`, `// REDIS`). O valor da string costuma ser igual ao nome da chave.
- Controllers não tratam erros: apenas `next(error)`. Quem formata a resposta é o `handleError`.

---

## 6. Respostas HTTP

- Formato único `ApiResponse<T>` (ver [`request-lifecycle.md`](./request-lifecycle.md#3-formato-das-respostas)).
- Sucesso: sempre **200** (inclusive em criação e exclusão).
- Erros: status vem da classe de erro; validação é **400**.
- Tokens nunca vão no corpo — só em cookies via `AuthCookies`.
- Campos sensíveis (`password`, hashes) nunca aparecem em respostas.

---

## 7. Redis

- Acesso pelo cliente único `redis` (`@/lib/redis`).
- **Chaves em kebab-case** no formato `{finalidade}-{identificador}`:

| Chave | Uso |
|---|---|
| `rate-limit-{rota}-{ip}` | Contador do rate limit |
| `verify-email-{email}` | Cadastro pendente |
| `verify-email-cooldown-{email}` | Cooldown de reenvio |
| `refresh-token-{jti}` | Whitelist de refresh tokens |
| `recovery-password-{uuid}` | Fluxo de recuperação de senha |

- **Todo dado tem TTL**, definido em segundos com `"EX"`: 60 (cooldown), 600 (códigos — 10 min), 604800 (refresh — 7 dias). Para atualizar sem renovar o TTL: `"KEEPTTL"`.
- Objetos são gravados com `JSON.stringify` e lidos com `JSON.parse`.
- Códigos e senhas são guardados **já com hash** (Argon2), nunca em texto puro.
- Para checar existência: `verifyKeyExists(key)` (`shared/utils`).

---

## 8. Segurança (padrões adotados)

- Hash de senhas e códigos com `ArgonHash` (Argon2id, `memoryCost 65536`, `timeCost 3`, `parallelism 1`, + `PEPPER`). Use `argonHash`, `argonVerify(hash, valor)` e `argonRehash`.
- Códigos de verificação: `generateCode()` → 6 dígitos com `crypto.randomInt`.
- Identificadores temporários (`jti`, `tokenUUID`): `randomUUID()` do módulo `crypto`.
- Autenticação por cookies `httpOnly` + `sameSite: 'strict'`; `secure` em produção.
- Login e recuperação respondem com a mesma mensagem genérica para e-mail inexistente e senha errada (`'Credenciais inválidas'`).
- Rate limit em todas as rotas, mais restritivo nas de autenticação (1 a 10 req/min).

---

## 9. Banco de dados

Resumo das convenções detalhadas em [`../database/schema.md`](../database/schema.md#2-convenções-de-modelagem):

- Model em PascalCase singular, tabela em snake_case plural (`@@map`).
- Colunas em camelCase; `id` autoincremento; `createdAt`/`updatedAt` em toda tabela.
- `@db.VarChar(n)` explícito em strings; `Decimal` para dinheiro.
- Toda entidade de negócio tem `userId` com relação para `User`.
- Migrations via `npx prisma migrate dev --name <descricao_em_portugues_snake_case>`.

---

## 10. Testes

- **Framework:** Vitest (`describe`, `it`, `expect`, `vi`, `beforeEach` importados explicitamente de `vitest`).
- **Escopo:** testes **unitários de services**. Repositórios, Redis, utilitários e `crypto` são mockados com `vi.mock('<caminho com @/>')`.
- **Local e nome:** `tests/unit/{modulo}/{metodo}.unit.test.ts`.
- **Estrutura:**
  ```ts
  vi.mock('@/modules/user/user.repository')
  vi.mock('@/lib/redis')

  describe('Unit test - AuthUserService - login', () => {
      const body = { … }

      beforeEach(() => {
          vi.clearAllMocks()
          vi.mocked(UserRepository.returnLoginCredentials).mockResolvedValue({ … }) // caminho feliz
      })

      it('deveria retornar um objeto com o acessToken e o refreshToken', async () => { … })
      it('deveria falhar caso o redis.set falhe', async () => {
          vi.mocked(redis.set).mockRejectedValue(new AppError('Erro', 500, ErrorCode.INTERNAL_SERVER_ERROR))
          await expect(AuthUserService.login(body)).rejects.toMatchObject({ statusCode: 500, code: ErrorCode.REDIS_SAVE_ERROR })
      })
  })
  ```
- `describe`: `'Unit test - {Classe} - {metodo}'`. `it`: frase em português começando com `'deveria …'`.
- `beforeEach` limpa os mocks e configura o **caminho feliz**; cada `it` sobrescreve apenas o mock necessário para o cenário.
- Cobrir: sucesso, cada erro de regra de negócio e a falha de cada dependência.
- Asserções de erro com `rejects.toMatchObject({ statusCode, code })`; de colaboração com `toHaveBeenCalledWith` / `not.toHaveBeenCalled`.
- Comando: `npm run test:unit:run`.

---

## 11. Git, branches e CI

- **Remoto:** Bitbucket, com integração via pull request para `main`.
- **Branches de trabalho:** `feature/{recurso}` ou `features/{recurso}` (ex.: `feature/clients`, `features/products`).
- **Commits:** estilo *Conventional Commits*, em português e no particípio:
  - `feat(clients): implementada rotas de delete, getAll (com opção de filtros) e getById`
  - `refactor: ajuste no CI`
  - `fix: corrige capitalização do arquivo ArgonHash`
  - Tipos usados: `feat`, `fix`, `refactor`; escopo opcional com o nome do módulo ou área (`clients`, `ci`, `test`).
- **CI (Bitbucket Pipelines):** roda em todo PR — `npm install` → `npx prisma generate` → `npx prisma migrate deploy` → `npm run test:unit:run` → `npm run build`. O PR só deve ser integrado com o pipeline verde.

---

## 12. Checklist para um novo módulo

1. Model em `prisma/schema.prisma` (com `userId` → `User`) + migration.
2. Pasta `src/modules/{recurso}/` com `route`, `controller`, `service`, `repository`, `schema`, `dtos`, `types`.
3. Rotas com `rateLimit` → `authenticate` → `validateSchema` → controller, seguindo os caminhos `/create`, `/edit/:id`, `/delete/:id`, `/`, `/:id`.
4. Novos `ErrorCode` na seção do domínio.
5. Registrar o router em `src/index.ts` (`app.use('/{recurso}', {Recurso}Routes)`) **antes** do `handleError`.
6. Testes unitários do service em `tests/unit/{recurso}/`.
7. Atualizar esta documentação (RAG): `database/` e `architecture/`.
