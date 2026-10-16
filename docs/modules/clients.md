# Módulo `clients`

> **Escopo:** responsabilidades, arquivos, endpoints, regras de negócio, acesso a dados e erros do módulo de clientes.
> **Documentos relacionados:** [`auth.md`](./auth.md) (emissão do token usado nas rotas) · [`user.md`](./user.md) · [`../database/schema.md`](../database/schema.md#32-clients-model-client) · [`../database/relationships.md`](../database/relationships.md#21-users-1--n-clients) · [`../architecture/request-lifecycle.md`](../architecture/request-lifecycle.md#4-exemplo-completo--post-clientscreate) · [`../architecture/conventions.md`](../architecture/conventions.md)
> **Fonte da verdade:** `src/modules/clients/` no repositório `orcafacil-api`.
> **Última revisão:** 2026-10-15.

---

## 1. Responsabilidade

O módulo `clients` gerencia o **cadastro de clientes de cada usuário**, ou seja, as pessoas ou empresas para quem o usuário emite orçamentos e vendas. Oferece o CRUD completo:

- criar cliente;
- editar cliente (parcialmente);
- excluir cliente;
- listar os clientes do usuário, com filtros opcionais;
- buscar um cliente pelo id.

Cada cliente pertence a um usuário (`clients.userId` → `users.id`) e é identificado pelo **CPF/CNPJ**, que é **único por usuário**.

É o módulo de referência do projeto: novos módulos de CRUD (ex.: `products`) devem seguir a mesma estrutura.

---

## 2. Arquivos

| Arquivo | Conteúdo |
|---|---|
| `clients.route.ts` | `ClientsRoutes`: 5 rotas, todas com `rateLimit(100, 60, …)` + `authenticate`. |
| `clients.controller.ts` | `ClientsController`: `create`, `edit`, `delete`, `getAll`, `getById`. |
| `clients.service.ts` | `ClientsService`: regras de unicidade e existência; orquestra o repositório. |
| `clients.repository.ts` | `ClientsRepository`: operações Prisma na tabela `clients`. |
| `clients.schema.ts` | `ClientsSchema`: `create`, `edit`, `getAllQuery`. |
| `clients.dtos.ts` | `ClientsDTOs`: request/response da API. |
| `clients.types.ts` | `ClientsTypes`: formatos internos entre service e repository. |

### Dependências

| Dependência | Uso |
|---|---|
| `prisma` (`@/lib/prisma`) | Acesso à tabela `clients`. |
| `UserRepository` (`@/modules/user/user.repository`) | Verificar se o usuário existe na edição (`findById`). |
| `isValidCnpjCpf` (`@/shared/utils/IsValidCnpjCpf`) | Validação de CPF/CNPJ nos schemas. |
| `authenticate` | Todas as rotas exigem o cookie `accessToken`. |
| `ConflictError`, `AppError`, `ErrorCode` | Erros do módulo. |

---

## 3. Endpoints

Prefixo: `/clients`. Todas as rotas são **protegidas** (`authenticate`) e têm rate limit de **100 requisições / 60 s** por IP.

| Método e rota | Chave do rate limit | Validação | Entrada | `data` na resposta |
|---|---|---|---|---|
| `POST /create` | `clients/create` | `ClientsSchema.create` (body) | body | cliente criado |
| `PATCH /edit/:id` | `clients/edit` | `ClientsSchema.edit` (body) | `:id` + body | cliente atualizado |
| `DELETE /delete/:id` | `clients/delete` | — | `:id` | cliente excluído |
| `GET /` | `clients/getAll` | `ClientsSchema.getAllQuery` (query, no controller) | query string | lista de clientes |
| `GET /:id` | `clients/getById` | — | `:id` | cliente |

Todas respondem **200** com `{ success: true, data }`.

### Objeto cliente retornado

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

`email` e `tellphone` podem ser `null`.

### Schemas de entrada (`clients.schema.ts`)

| Schema | Campos |
|---|---|
| `create` | `name` (1–255, obrigatório), `cnpjCpf` (obrigatório, `isValidCnpjCpf`), `tellphone` (string, opcional/nulo), `email` (e-mail ≤255, opcional/nulo), `userId` (número ≥ 1, obrigatório) |
| `edit` | `name`, `cnpjCpf`, `tellphone`, `email` — todos opcionais; `userId` (número ≥ 1, obrigatório). `.refine` exige ao menos um campo. |
| `getAllQuery` | `name`, `cnpjCpf` (`isValidCnpjCpf`), `tellphone`, `email` — todos opcionais |

Exemplo de body do `POST /create`:

```json
{
  "name": "Empresa Exemplo LTDA",
  "cnpjCpf": "12345678000195",
  "email": "contato@exemplo.com",
  "tellphone": "11999999999",
  "userId": 1
}
```

---

## 4. Funcionamento detalhado

### 4.1 Criar — `POST /clients/create`

**Controller:** lê o body validado e chama `ClientsService.create(data)`.

**Service:**
1. `ClientsRepository.searchClientByCnpjCpf(cnpjCpf, userId)` → se existir: `ConflictError` 409 `CLIENT_ALREADY_EXISTS` (`'Cliente já cadastrado.'`).
2. `ClientsRepository.create(data)` → insere `name`, `cnpjCpf`, `email`, `tellphone`, `userId`.
3. Retorna o cliente criado.

### 4.2 Editar — `PATCH /clients/edit/:id`

**Controller:** lê o body validado e `Number(req.params.id)`; chama `ClientsService.edit(id, data)`.

**Service:**
1. `UserRepository.findById(data.userId)` → se não existir: `ConflictError` 409 `INVALID_USER` (`'Usuário inválido.'`).
2. Se `cnpjCpf` foi enviado: `searchClientByCnpjCpf(cnpjCpf, userId)` → se existir: 409 `CLIENT_ALREADY_EXISTS`.
3. `ClientsRepository.edit(id, data)` → `prisma.client.update({ where: { id }, data })` com o objeto validado.
4. Retorna o cliente atualizado.

### 4.3 Excluir — `DELETE /clients/delete/:id`

**Controller:** `Number(req.params.id)` → `ClientsService.delete(id)`.

**Service:**
1. `ClientsRepository.searchClientById(id)` → se não existir: `ConflictError` 409 `INVALID_ID_CLIENT` (`'Cliente inválido.'`).
2. `ClientsRepository.delete(id)` → exclusão física (`prisma.client.delete`). Não há soft delete.
3. Retorna o cliente excluído.

### 4.4 Listar — `GET /clients`

**Controller:**
1. `userId = Number(req.user)` (id do usuário autenticado, preenchido pelo `authenticate`).
2. `filters = ClientsSchema.getAllQuery.parse(req.query)` (erro de validação → 400 pelo `handleError`).
3. `ClientsService.getAll(userId, filters)`.

**Service → Repository:** `prisma.client.findMany({ where: { userId, ...filters } })`.

- Retorna apenas os clientes do usuário autenticado.
- Filtros são por **igualdade exata** e combinados com **AND**. Sem filtros, retorna todos os clientes do usuário.
- Sem paginação nem ordenação explícita.

Exemplo: `GET /clients?name=Empresa%20Exemplo%20LTDA&email=contato@exemplo.com`

### 4.5 Buscar por id — `GET /clients/:id`

**Controller:** `Number(req.params.id)` → `ClientsService.getById(id)`.

**Service:**
1. `ClientsRepository.searchClientById(id)` → se não existir: `ConflictError` 409 `INVALID_ID_CLIENT` (`'Cliente inválido'`).
2. Retorna o cliente.

---

## 5. Repositório (`ClientsRepository`)

| Método | Operação Prisma | Erro em falha (500) |
|---|---|---|
| `create(data)` | `prisma.client.create({ data })` | `'Erro ao cadastrar o cliente'` · `INTERNAL_SERVER_ERROR` |
| `edit(id, data)` | `prisma.client.update({ data, where: { id } })` | `'Erro interno do servidor.'` · `INTERNAL_SERVER_ERROR` |
| `delete(id)` | `prisma.client.delete({ where: { id } })` | `INTERNAL_SERVER_ERROR` |
| `searchClientByCnpjCpf(cnpjCpf, userId)` | `findUnique({ where: { userId_cnpjCpf: { cnpjCpf, userId } } })` — usa a unique composta `(userId, cnpjCpf)` | `INTERNAL_SERVER_ERROR` |
| `searchClientById(id)` | `findUnique({ where: { id } })` | `INTERNAL_SERVER_ERROR` |
| `getAll(userId, filters?)` | `findMany({ where: { userId, ...filters } })` | `INTERNAL_SERVER_ERROR` |

Buscas retornam `null` quando não encontram; quem transforma isso em erro é o service.

---

## 6. Regras de negócio

| Regra | Onde é garantida |
|---|---|
| CPF/CNPJ deve ser válido (dígitos verificadores; 11 ou 14 dígitos) | Zod (`isValidCnpjCpf`) |
| CPF/CNPJ não se repete para o mesmo usuário | Service (`searchClientByCnpjCpf`) + banco (`@@unique([userId, cnpjCpf])`) |
| O mesmo CPF/CNPJ pode existir para usuários diferentes | Unique composta no banco |
| `email` e `tellphone` são opcionais | Zod (`.nullable().optional()`) + colunas `NULL` |
| `email` de cliente é único na tabela | Banco (`clients_email_key`) |
| Edição exige pelo menos um campo | Zod (`.refine` no `edit`) |
| Listagem retorna apenas clientes do usuário autenticado | Controller (`req.user`) + repositório (`where: { userId }`) |

---

## 7. Códigos de erro do módulo

| Código | Status | Quando |
|---|---|---|
| `CLIENT_ALREADY_EXISTS` | 409 | CPF/CNPJ já cadastrado para o usuário (criar/editar). |
| `INVALID_USER` | 409 | `userId` informado na edição não existe. |
| `INVALID_ID_CLIENT` (`ErrorCode.INVALID_CLIENT`) | 409 | Cliente não encontrado (excluir/buscar por id). |
| `UNAUTHORIZED_USER` | 401 | Cookie `accessToken` ausente, inválido ou expirado (middleware `authenticate`). |
| `RATE_LIMIT_EXCEEDED` | 429 | Mais de 100 requisições/min na mesma rota e IP. |
| — (validação) | 400 | Body ou query fora do schema (`details` com campo e mensagem). |
| `INTERNAL_SERVER_ERROR` | 500 | Falha do Prisma no repositório. |

---

## 8. Testes

O módulo ainda não possui testes unitários. Ao criá-los, seguir o padrão de `tests/unit/auth/` em `tests/unit/clients/{metodo}.unit.test.ts`, mockando `@/modules/clients/clients.repository` e `@/modules/user/user.repository` (ver [`../architecture/conventions.md`](../architecture/conventions.md#10-testes)).
