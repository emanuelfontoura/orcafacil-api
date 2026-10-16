# Banco de Dados — Schema

> **Escopo:** estrutura do banco de dados relacional do `orcafacil-api`: tecnologia, convenções, tabelas, colunas, restrições e regras de negócio ligadas a cada tabela.
> **Relações entre tabelas:** ver [`relationships.md`](./relationships.md).
> **Fonte da verdade:** `prisma/schema.prisma` e `prisma/migrations/` no repositório `orcafacil-api`. Se este documento divergir do código, o código prevalece — e este documento deve ser atualizado.
> **Última revisão:** 2026-10-15 (migration mais recente: `20260907203920_removido_sellers_e_services`).

---

## 1. Visão geral

O OrçaFácil é um sistema de gestão de orçamentos, clientes e vendas. O banco é **multi-tenant por usuário**: cada `User` é a conta de uma empresa/profissional (identificada por CPF ou CNPJ) e todos os demais dados (clientes, produtos) pertencem a um usuário.

| Item | Valor |
|---|---|
| SGBD | PostgreSQL 15 (imagem `postgres:15` no `docker-compose.dev.yml`) |
| ORM | Prisma 7 (`prisma-client-js`) |
| Driver | `@prisma/adapter-pg` (driver adapter nativo `pg`) |
| Conexão | variável de ambiente `DATABASE_URL` |
| Configuração do Prisma | `prisma.config.ts` (schema em `prisma/schema.prisma`, migrations em `prisma/migrations`) |
| Instância do client | `src/lib/prisma.ts` exporta `prisma` (singleton reaproveitado via `global` fora de produção) |

### Tabelas atuais

| Model Prisma | Tabela física | Finalidade |
|---|---|---|
| `User` | `users` | Conta do usuário do sistema (dono dos dados). |
| `Client` | `clients` | Clientes cadastrados por um usuário. |
| `Product` | `products` | Produtos (com preço) cadastrados por um usuário. |

### Dados que NÃO ficam no PostgreSQL

Dados temporários de autenticação ficam no **Redis** (`src/lib/redis.ts`), não em tabelas. Não procure/crie tabelas para eles sem uma decisão explícita:

| Chave Redis | Conteúdo | TTL |
|---|---|---|
| `verify-email-{email}` | Cadastro pendente (nome, cnpjCpf, hash da senha, hash do código) | 600 s |
| `verify-email-cooldown-{email}` | Flag de cooldown para reenvio de código | 60 s |
| `refresh-token-{jti}` | `userId` dono do refresh token (whitelist de sessões) | 604800 s (7 dias) |
| `recovery-password-{uuid}` | Fluxo de recuperação de senha (`id`, hash do código, `authorized`, `attempts`) | 600 s |

O registro em `users` só é criado **depois** que o e-mail é confirmado (`AuthUserService.confirmEmail`).

---

## 2. Convenções de modelagem

Toda nova tabela deve seguir estas convenções, já usadas no schema:

- **Nome do model:** PascalCase no singular (`Client`). **Nome da tabela:** snake_case no plural via `@@map("clients")`.
- **Nome das colunas:** camelCase, idêntico ao campo do Prisma (`cnpjCpf`, `createdAt`, `userId`). Não há `@map` em colunas — no banco as colunas aparecem com aspas (`"createdAt"`).
- **Chave primária:** `id Int @id @default(autoincrement())` → `SERIAL` no PostgreSQL.
- **Timestamps obrigatórios:**
  - `createdAt DateTime @default(now())` → `TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`
  - `updatedAt DateTime @updatedAt` → preenchido pelo Prisma a cada update (não tem default no banco).
- **Tamanhos explícitos em strings:** sempre usar `@db.VarChar(n)`. Padrões em uso:
  - nomes: `VarChar(100)`
  - e-mails e descrições: `VarChar(255)`
  - telefone: `VarChar(50)`
  - CPF/CNPJ: `VarChar(14)`
- **Campos opcionais:** `String?` → coluna `NULL`. Campos obrigatórios → `NOT NULL`.
- **Valores monetários:** `Decimal @db.Decimal(p, s)` (nunca `Float`).
- **Propriedade do dado (tenant):** toda entidade de negócio tem `userId Int` + relação obrigatória com `User`.
- **Nomes de constraints** (gerados pelo Prisma): `{tabela}_pkey`, `{tabela}_{coluna}_key`, `{tabela}_{col1}_{col2}_key`, `{tabela}_{coluna}_fkey`.
- **Alterações de schema:** sempre via `prisma migrate dev --name <descricao>` — nunca editar migrations já aplicadas.

---

## 3. Tabelas

### 3.1 `users` (model `User`)

Representa a conta que acessa o sistema — normalmente uma empresa ou profissional autônomo. É a **raiz de todos os dados**: clientes e produtos pertencem a um usuário.

```prisma
model User {
  id        Int      @id @default(autoincrement())
  cnpjCpf   String   @db.VarChar(14)
  name      String   @db.VarChar(100)
  email     String   @unique @db.VarChar(255)
  password  String   @db.VarChar(255)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  clients  Client[]
  products Product[]

  @@unique([cnpjCpf])
  @@map("users")
}
```

| Coluna | Tipo (PostgreSQL) | Nulo | Default / Restrição | Descrição |
|---|---|---|---|---|
| `id` | `SERIAL` | não | PK `users_pkey` | Identificador do usuário. Vai no `sub` do JWT. |
| `cnpjCpf` | `VARCHAR(14)` | não | UNIQUE `users_cnpjCpf_key` | CPF (11 dígitos) ou CNPJ (14 dígitos) do usuário. Único no sistema inteiro. |
| `name` | `VARCHAR(100)` | não | — | Nome da pessoa ou razão social. |
| `email` | `VARCHAR(255)` | não | UNIQUE `users_email_key` | E-mail de login. Único no sistema inteiro. |
| `password` | `VARCHAR(255)` | não | — | **Hash Argon2id** da senha (com pepper `PEPPER`). Nunca armazena senha em texto puro. |
| `createdAt` | `TIMESTAMP(3)` | não | `CURRENT_TIMESTAMP` | Data de criação. |
| `updatedAt` | `TIMESTAMP(3)` | não | `@updatedAt` | Data da última alteração. |

**Regras de negócio**

- Criado apenas em `AuthUserService.confirmEmail`, após validação do código enviado por e-mail.
- Validação de entrada (Zod, `auth.schema.ts`): `name` 1–100, `email` válido até 255, `password` 8–128, `cnpjCpf` validado por `isValidCnpjCpf` (dígitos verificadores de CPF/CNPJ).
- `password` pode ser **re-hasheado no login** quando os parâmetros do Argon2 mudam (`ArgonHash.argonRehash` + `UserRepository.updatePasswordHash`).
- A coluna `password` **nunca** deve ser retornada pela API. O `UserRepository` usa `select` explícito; apenas `returnLoginCredentials` lê o hash, para o login.

**Acesso (repositório):** `src/modules/user/user.repository.ts` — `findByEmail`, `findById`, `createUser`, `returnLoginCredentials`, `updatePasswordHash`.

---

### 3.2 `clients` (model `Client`)

Clientes de um usuário — as pessoas ou empresas para quem o usuário emite orçamentos/vendas.

```prisma
model Client {
  id        Int      @id @default(autoincrement())
  cnpjCpf   String   @db.VarChar(14)
  name      String   @db.VarChar(100)
  email     String?  @unique @db.VarChar(255)
  tellphone String?  @db.VarChar(50)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User @relation(fields: [userId], references: [id])
  userId Int

  @@unique([userId, cnpjCpf])
  @@map("clients")
}
```

| Coluna | Tipo (PostgreSQL) | Nulo | Default / Restrição | Descrição |
|---|---|---|---|---|
| `id` | `SERIAL` | não | PK `clients_pkey` | Identificador do cliente. |
| `cnpjCpf` | `VARCHAR(14)` | não | UNIQUE composto `clients_userId_cnpjCpf_key` | CPF ou CNPJ do cliente. Único **por usuário**. |
| `name` | `VARCHAR(100)` | não | — | Nome ou razão social do cliente. |
| `email` | `VARCHAR(255)` | sim | UNIQUE `clients_email_key` | E-mail de contato (opcional). Único **no sistema inteiro** (ver pontos de atenção). |
| `tellphone` | `VARCHAR(50)` | sim | — | Telefone de contato (opcional). **O nome da coluna é `tellphone` (com dois "l")** — use exatamente esse nome. |
| `userId` | `INTEGER` | não | FK `clients_userId_fkey` → `users.id` | Usuário dono do cliente. |
| `createdAt` | `TIMESTAMP(3)` | não | `CURRENT_TIMESTAMP` | Data de criação. |
| `updatedAt` | `TIMESTAMP(3)` | não | `@updatedAt` | Data da última alteração. |

**Regras de negócio**

- O mesmo CPF/CNPJ pode existir para usuários diferentes, mas **não pode se repetir dentro do mesmo usuário** (`@@unique([userId, cnpjCpf])`). O service verifica isso antes de criar/editar (`ClientsRepository.searchClientByCnpjCpf` usando a chave composta `userId_cnpjCpf`) e lança `ConflictError` com `ErrorCode.CLIENT_ALREADY_EXISTS`.
- Listagem (`getAll`) é sempre filtrada por `userId`, com filtros opcionais por `name`, `cnpjCpf`, `tellphone` e `email` (igualdade exata).
- Validação de entrada (Zod, `clients.schema.ts`): `cnpjCpf` validado por `isValidCnpjCpf`; `email` e `tellphone` opcionais e anuláveis.

**Acesso (repositório):** `src/modules/clients/clients.repository.ts` — `create`, `edit`, `delete`, `searchClientByCnpjCpf`, `searchClientById`, `getAll`.

---

### 3.3 `products` (model `Product`)

Catálogo de produtos de um usuário, com preço, usados para compor orçamentos.

```prisma
model Product {
  id          Int      @id @default(autoincrement())
  name        String   @db.VarChar(100)
  description String?  @db.VarChar(255)
  price       Decimal  @db.Decimal(5, 2)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user   User @relation(fields: [userId], references: [id])
  userId Int

  @@map("products")
}
```

| Coluna | Tipo (PostgreSQL) | Nulo | Default / Restrição | Descrição |
|---|---|---|---|---|
| `id` | `SERIAL` | não | PK `products_pkey` | Identificador do produto. |
| `name` | `VARCHAR(100)` | não | — | Nome do produto. Não é único. |
| `description` | `VARCHAR(255)` | sim | — | Descrição opcional. |
| `price` | `DECIMAL(5,2)` | não | — | Preço unitário. Precisão 5, escala 2 → **máximo 999.99**. |
| `userId` | `INTEGER` | não | FK `products_userId_fkey` → `users.id` | Usuário dono do produto. |
| `createdAt` | `TIMESTAMP(3)` | não | `CURRENT_TIMESTAMP` | Data de criação. |
| `updatedAt` | `TIMESTAMP(3)` | não | `@updatedAt` | Data da última alteração. |

**Regras de negócio**

- A tabela existe, mas **ainda não há módulo `products`** na API (sem rotas, service ou repositório). Ao implementar, seguir o padrão do módulo `clients` (`*.route.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.schema.ts`, `*.types.ts`, `*.dtos.ts`).
- No Prisma Client, `price` é do tipo `Prisma.Decimal` (não `number`). Converter explicitamente ao serializar/receber.

---

## 4. Histórico de migrations

| Migration | O que mudou |
|---|---|
| `20260327032012_start` | Cria `users` (`id`, `name`, `email` único, `password VARCHAR(20)`, timestamps). |
| `20260329165531_aumentei_o_tamanho_do_campo_de_password` | `users.password` → `VARCHAR(255)` (para caber o hash Argon2). |
| `20260613180755_add_sellers_clients_products_services` | Cria `sellers`, `clients`, `products`, `services`. `clients.sellerId` → FK para `sellers`. |
| `20260725210257_add_cnpj_cpf_field` | Adiciona `cnpjCpf` em `users` (único), `clients` e `sellers` (únicos por `userId`). Adiciona `userId` em `clients`, `products`, `sellers`, `services` com FK para `users`. `clients.sellerId` passa a ser opcional (`ON DELETE SET NULL`). |
| `20260727174937_alter_columns_to_nullable` | Torna opcionais: `clients.email`, `clients.tellphone`, `products.description`, campos de `sellers` e `services.description`. Remove `sellers.cpf`. |
| `20260907203920_removido_sellers_e_services` | **Remove** as tabelas `sellers` e `services` e a coluna `clients.sellerId`. |

> As tabelas `sellers` (vendedores, com `comissionRate`) e `services` (serviços com preço) **não existem mais**. Não as referencie em código novo.

---

## 5. Pontos de atenção (estado atual)

Divergências conhecidas entre o schema e o código/regras de negócio. Considere-as ao alterar o banco ou os módulos:

1. **`clients.email` é único globalmente.** Com o modelo multi-tenant, dois usuários diferentes não conseguem cadastrar um cliente com o mesmo e-mail. O provável comportamento desejado é `@@unique([userId, email])`.
2. **`cnpjCpf` não é normalizado antes de salvar.** `isValidCnpjCpf` remove a pontuação apenas para validar; o valor original é persistido. Um CNPJ formatado (`12.345.678/0001-90`, 18 caracteres) estoura o `VARCHAR(14)`, e o mesmo documento com/sem máscara burla a constraint de unicidade. Recomenda-se transformar para apenas dígitos no schema Zod (`.transform(v => v.replace(/\D/g, ''))`).
3. **Limites do Zod maiores que os do banco.** `clients.schema.ts` aceita `name` até 255, mas a coluna é `VARCHAR(100)`.
4. **Resíduo de `sellerId`.** `ClientsRepository.create` e `ClientsTypes` ainda referenciam `sellerId`, coluna removida na última migration.
5. **`products.price DECIMAL(5,2)`** limita o preço a 999.99 — provavelmente insuficiente para produtos reais.
6. **Sem índice dedicado em `products.userId`.** O PostgreSQL não cria índice automaticamente para FKs. Em `clients`, a unique composta `(userId, cnpjCpf)` já serve como índice para buscas por `userId`.
