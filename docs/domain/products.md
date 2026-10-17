---
title: "Especificação: produtos"
description: "Especificação oficial do módulo de produtos: campos, regras de negócio, inativação, busca, endpoints, formato de resposta, erros e modelo de dados, com o estado atual da branch features/products."
type: domain
tags:
  - "produtos"
  - "catalogo"
  - "especificacao"
modules:
  - "products"
sources:
  - "prisma/schema.prisma"
related:
  - "domain/business-rules.md"
  - "domain/roadmap.md"
  - "domain/glossary.md"
  - "modules/clients.md"
last_reviewed: 2026-10-16
---

# Domínio — Especificação: Produtos

> **Escopo:** especificação funcional do módulo de **produtos** (Fase 1 do [roadmap](./roadmap.md#fase-1--produtos)): campos, regras, inativação, busca, endpoints, formato de resposta, erros e modelo de dados.
> **Documentos relacionados:** [`business-rules.md`](./business-rules.md#4-produtos-regras-transversais) · [`roadmap.md`](./roadmap.md) · [`glossary.md`](./glossary.md) · [`../modules/clients.md`](../modules/clients.md) (módulo de referência)
> **Fonte da verdade:** especificação validada pelo responsável pelo produto em 2026-10-16. Ao implementar, o módulo ganha também `modules/products.md`, com a documentação técnica.
> **Última revisão:** 2026-10-16.

---

## Status

| Marcação | Significado |
|---|---|
| ✅ **Existente** | Já existe no banco ou no código da `main`. |
| 🔵 **Aprovada** | Decidida, ainda não implementada. Ao implementar, passa a ✅. |

**Ao implementar o módulo, siga esta especificação**, inclusive onde o código da branch `features/products` faz diferente.

---

## 1. Objetivo

Permitir que o usuário mantenha um **catálogo de produtos** (itens físicos que ele vende) com preço atualizado, para incluí-los rapidamente nos orçamentos. Serviços (mão de obra, instalação) **não** são produtos: têm módulo próprio (decisão D2).

Fora do escopo desta versão: unidade de medida, código/SKU, preço de custo, imagem, controle de estoque, duplicação de produto e importação de planilha (ver [Decisões](#9-decisões)).

---

## 2. Estado atual

| Onde | O que existe |
|---|---|
| Banco (`main`) | Tabela `products` com `id`, `name`, `description`, `price DECIMAL(5,2)`, `userId`, `createdAt`, `updatedAt` (ver [`../database/schema.md`](../database/schema.md#33-products-model-product)). |
| Branch `features/products` (commit `9b5bc75`) | Rotas `POST /products/create` e `PATCH /products/edit/:id`; controller com `create`, `edit`, `delete` (sem rota) e `getAll`/`getById` vazios; service e repository de `create`, `edit`, `delete` e busca por id; schema Zod (`create`, `edit`, validação de `:id`); código de erro `INVALID_PRODUCT`; o preço é convertido de `Decimal` para `number` nas respostas. |

Ajustes da branch para seguir esta especificação e o README (ordem dos middlewares, filtro por dono, campos novos, preço como texto, códigos de erro) fazem parte da implementação da Fase 1.

---

## 3. Campos

| Campo | Tipo | Obrigatório | Regras | Status |
|---|---|---|---|---|
| `id` | inteiro | — | Gerado automaticamente. | ✅ |
| `name` | texto (1–100) | sim | Sem espaços nas pontas (RN-P07). Único entre os produtos **ativos** do usuário (RN-P04, RN-P06). | ✅ campo · 🔵 regras |
| `description` | texto (até 255) | não | Sem espaços nas pontas (RN-P07). Exibida no orçamento. | ✅ |
| `price` | decimal, 2 casas | sim | **Maior que zero**; suporta valores altos (RN-P02). | ✅ campo · 🔵 regras |
| `category` | texto (até 50) | não | Texto livre para organizar o catálogo e filtrar a listagem. | 🔵 |
| `notes` | texto (até 1000) | não | Observações internas, visíveis só para o usuário; **nunca** aparecem no orçamento. | 🔵 |
| `active` | booleano | — | Padrão `true`. Alterado pelo `edit` (RN-P08, RN-P09). | 🔵 |
| `userId` | inteiro | — | Dono; vem sempre da sessão (RN-G03). | ✅ |
| `createdAt` / `updatedAt` | data/hora | — | Automáticos. | ✅ |

---

## 4. Regras de negócio

### Regras transversais (de [`business-rules.md`](./business-rules.md#4-produtos-regras-transversais))

✅ **RN-P01 — Dono.** Todo produto pertence a um único usuário.

🔵 **RN-P02 — Preço.** Obrigatório, **maior que zero** (preço R$ 0,00 não é permitido), 2 casas decimais, comportando pelo menos R$ 9.999.999.999,99.

🔵 **RN-P03 — Mudança de preço.** Alterar o preço não altera orçamentos já criados.

🔵 **RN-P04 — Nome único por usuário.** Não pode haver dois produtos **ativos** com o mesmo nome.

🔵 **RN-P05 — Exclusão com histórico.** Produto usado em orçamento só pode ser inativado.

### Regras do módulo

🔵 **RN-P06 — Comparação de nomes.** Para a unicidade (RN-P04), nomes são comparados sem diferenciar maiúsculas/minúsculas, acentos e espaços nas pontas: "Cimento CP-II" e "cimento cp-ii " são o mesmo nome.

🔵 **RN-P07 — Texto limpo.** Espaços no início e no fim do nome e da descrição são removidos ao salvar.

🔵 **RN-P08 — Reativação.** Um produto inativo pode ser reativado (pelo `edit`, com `active: true`); ao reativar, vale de novo a unicidade de nome (RN-P04).

🔵 **RN-P09 — Inativos fora do catálogo ativo.** A listagem mostra só produtos ativos por padrão; inativos aparecem com filtro. Produto inativo não pode ser adicionado a orçamentos, mas continua aparecendo nos orçamentos em que já estava.

🔵 **RN-P10 — Exclusão definitiva.** Produto nunca usado em orçamento pode ser excluído definitivamente.

🔵 **RN-P11 — Sem controle de estoque.** O sistema **não** controla estoque nem quantidade disponível (não há vendas — decisão D6).

> `RN-P12` (duplicar produto) foi descartada na revisão e não será reutilizada.

---

## 5. Busca e listagem

| Item | Especificação | Regras |
|---|---|---|
| Paginação | `page` (padrão 1) e `pageSize` (padrão 20, máximo 100). | RN-G15 |
| Ordenação | `orderBy` = `name`, `price` ou `createdAt`; `order` = `asc` ou `desc`. Padrão: `createdAt desc`. | RN-G15 |
| Busca | `search`: texto parcial no **nome** e na **descrição**, sem diferenciar maiúsculas e acentos. | RN-G16 |
| Filtros | `active` (`true` padrão, `false` ou `all`), `category` (igualdade, sem diferenciar maiúsculas), `minPrice` e `maxPrice`. | RN-P09 |

Exemplo: `GET /products?search=cimento&category=Construção&minPrice=10&orderBy=price&order=asc&page=1&pageSize=20`

---

## 6. Endpoints

Seguem o padrão do módulo `clients` e as regras do [README](../README.md#2-regras-obrigatórias). Todos exigem `authenticate` e consideram apenas os produtos do usuário da sessão.

| Método e rota | Uso | Rate limit |
|---|---|---|
| `POST /products/create` | Criar produto | 60 / 60 s |
| `PATCH /products/edit/:id` | Editar produto, inclusive inativar/reativar via `active` | 60 / 60 s |
| `GET /products` | Listar com busca, filtros e paginação | 120 / 60 s |
| `GET /products/:id` | Ver um produto | 120 / 60 s |
| `DELETE /products/delete/:id` | Excluir definitivamente (se nunca usado em orçamento) | 30 / 60 s |

Não há rotas separadas para inativar/reativar nem para duplicar produto.

### Body

**`POST /products/create`**
```json
{
  "name": "Cimento CP-II 50kg",
  "description": "Saco de 50 kg",
  "price": "38.90",
  "category": "Construção",
  "notes": "Fornecedor X, pedido mínimo 10 sacos"
}
```
`name` e `price` obrigatórios; demais opcionais.

**`PATCH /products/edit/:id`** — todos os campos opcionais, ao menos um obrigatório: `name`, `description`, `price`, `category`, `notes`, `active`.

### Formato do produto na resposta

```json
{
  "id": 1,
  "name": "Cimento CP-II 50kg",
  "description": "Saco de 50 kg",
  "price": "38.90",
  "category": "Construção",
  "notes": "Fornecedor X, pedido mínimo 10 sacos",
  "active": true,
  "createdAt": "2026-10-15T12:00:00.000Z",
  "updatedAt": "2026-10-15T12:00:00.000Z"
}
```

- 🔵 **Preço como texto** com 2 casas (`"38.90"`), tanto na entrada quanto na resposta, para não perder precisão em valores grandes. O frontend formata para exibição.
- A listagem retorna `{ items: [...], page, pageSize, total }` dentro de `data`.

---

## 7. Erros

| Situação | Status | Código | Classe |
|---|---|---|---|
| Produto não encontrado (ou de outro usuário) | 404 | `PRODUCT_NOT_FOUND` | `NotFoundError` |
| Nome já usado por outro produto ativo | 409 | `PRODUCT_ALREADY_EXISTS` | `ConflictError` |
| Excluir produto usado em orçamento | 409 | `PRODUCT_IN_USE` | `ConflictError` |
| Usar produto inativo em orçamento (Fase 5) | 409 | `PRODUCT_INACTIVE` | `ConflictError` |
| Dados inválidos (inclusive preço ≤ 0) | 400 | — (validação Zod) | `ZodError` |

O código `INVALID_PRODUCT` da branch `features/products` deve ser substituído por `PRODUCT_NOT_FOUND`.

---

## 8. Modelo de dados

```prisma
model Product {
  id          Int      @id @default(autoincrement())
  name        String   @db.VarChar(100)
  description String?  @db.VarChar(255)
  price       Decimal  @db.Decimal(12, 2)   // RN-P02: > 0, até 9.999.999.999,99
  category    String?  @db.VarChar(50)
  notes       String?  @db.VarChar(1000)
  active      Boolean  @default(true)       // RN-G14
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user   User @relation(fields: [userId], references: [id])
  userId Int

  @@index([userId, active])
  @@map("products")
}
```

- **Migration necessária:** alterar `price` para `DECIMAL(12,2)` e adicionar `category`, `notes` e `active`.
- A unicidade de nome **entre ativos**, sem diferenciar maiúsculas e acentos (RN-P04, RN-P06), não é expressável com `@@unique`; é garantida no service (opcionalmente reforçada por um índice parcial no PostgreSQL via migration SQL).
- "Preço maior que zero" é validado no schema Zod; opcionalmente reforçado por uma `CHECK (price > 0)` na migration.

---

## 9. Decisões

Decisões tomadas na revisão de 2026-10-16.

| ID | Pergunta | Decisão |
|---|---|---|
| **PD1** | Produto terá unidade de medida? | **Não.** Sem unidade, nem lista fixa, nem unidades próprias. |
| **PD2** | Produto terá imagem? | **Não.** |
| **PD3** | Preço R$ 0,00 é permitido? | **Não.** O preço deve ser maior que zero (altera RN-P02). |
| **PD4** | Importação de catálogo por planilha na primeira versão? | **Não, por enquanto.** |
| **PD5** | Inativar/reativar terá rotas próprias? | **Não.** Feito pelo `edit`, com o campo `active`. |

### Propostas descartadas

| Proposta | Situação |
|---|---|
| Campos `unit` (unidade de medida), `code` (SKU), `costPrice` (preço de custo) e `imageUrl` (imagem) | Descartados |
| RN-P12 — Duplicar produto (e a rota `POST /products/:id/duplicate`) | Descartada |
| Rotas `PATCH /products/:id/inactivate` e `/activate` | Descartadas (decisão PD5) |
