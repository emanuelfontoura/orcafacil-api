---
title: "Especificação: serviços"
description: "Especificação oficial do módulo de serviços (mão de obra, instalação, hora técnica): campos, preço opcional (a combinar), regras de negócio, inativação, busca, endpoints, erros e modelo de dados."
type: domain
tags:
  - "servicos"
  - "catalogo"
  - "especificacao"
  - "preco-a-combinar"
modules:
  - "services"
sources:
  - "prisma/schema.prisma"
related:
  - "domain/business-rules.md"
  - "domain/products.md"
  - "domain/roadmap.md"
  - "domain/glossary.md"
last_reviewed: 2026-10-16
---

# Domínio — Especificação: Serviços

> **Escopo:** especificação funcional do módulo de **serviços** (Fase 2 do [roadmap](./roadmap.md#fase-2--serviços)): campos, regras, inativação, busca, endpoints, formato de resposta, erros e modelo de dados.
> **Documentos relacionados:** [`business-rules.md`](./business-rules.md#5-serviços-regras-transversais) · [`products.md`](./products.md) (módulo irmão; mesmas convenções) · [`roadmap.md`](./roadmap.md) · [`glossary.md`](./glossary.md)
> **Fonte da verdade:** especificação validada pelo responsável pelo produto em 2026-10-16. Ao implementar, o módulo ganha também `modules/services.md`, com a documentação técnica.
> **Última revisão:** 2026-10-16.

---

## Status

Tudo neste documento está 🔵 **Aprovado** e ainda **não implementado**: não existe código nem tabela de serviços. Ao implementar, as regras passam a ✅ em [`business-rules.md`](./business-rules.md).

---

## 1. Objetivo

Permitir que o usuário mantenha um **catálogo de serviços** (trabalho que ele presta: mão de obra, instalação, manutenção, visita técnica, hora técnica) para incluí-los nos orçamentos ao lado dos produtos. Serviço é uma **entidade separada** de produto (decisão D2, RN-S01).

A tabela `services` que existiu antes foi removida em set/2026 ([histórico](../database/schema.md#4-histórico-de-migrations)) e **não** deve ser restaurada como estava: o novo modelo segue esta especificação.

Fora do escopo desta versão: forma de cobrança (hora, diária, m²...), duração estimada, produtos/materiais vinculados ao serviço, imagem e importação de planilha (ver [Decisões](#9-decisões)).

---

## 2. Relação com produtos

O módulo de serviços **segue as mesmas decisões de [`products.md`](./products.md)** em tudo que não for específico de serviço, para que frontend, API e código sejam previsíveis:

- Campos `name`, `description`, `category`, `notes`, `active` com os mesmos tamanhos e regras.
- Preço como texto com 2 casas na API (`"150.00"`).
- Inativar/reativar pelo `edit`, com `active` (sem rotas próprias).
- Mesma estrutura de busca, filtros, paginação, ordenação e formato de resposta da listagem.
- Sem imagem e sem importação por planilha.

**Única diferença:** o **preço do serviço é opcional** (serviço "a combinar" — RN-S03, decisão SD2). Em produtos, o preço é obrigatório.

---

## 3. Campos

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `id` | inteiro | — | Gerado automaticamente. |
| `name` | texto (1–100) | sim | Sem espaços nas pontas (RN-S06). Único entre os serviços **ativos** do usuário (RN-S04, RN-S05). |
| `description` | texto (até 255) | não | Sem espaços nas pontas (RN-S06). Exibida no orçamento (ex.: o que está incluso). |
| `price` | decimal, 2 casas | **não** | Vazio (`null`) = serviço **a combinar**. Quando informado, **maior que zero** (RN-S03). |
| `category` | texto (até 50) | não | Texto livre para organizar o catálogo e filtrar a listagem. |
| `notes` | texto (até 1000) | não | Observações internas, visíveis só para o usuário; **nunca** aparecem no orçamento. |
| `active` | booleano | — | Padrão `true`. Alterado pelo `edit` (RN-S07, RN-S08). |
| `userId` | inteiro | — | Dono; vem sempre da sessão (RN-G03, RN-S02). |
| `createdAt` / `updatedAt` | data/hora | — | Automáticos. |

---

## 4. Regras de negócio

### Regras transversais (de [`business-rules.md`](./business-rules.md#5-serviços-regras-transversais))

🔵 **RN-S01 — Entidade própria.** Serviço é uma entidade distinta de produto; um orçamento pode conter produtos e serviços.

🔵 **RN-S02 — Dono.** Todo serviço pertence a um único usuário.

🔵 **RN-G13 / RN-G14** — Alterar um serviço não altera orçamentos já emitidos; serviço usado em orçamento só pode ser inativado.

### Regras do módulo

🔵 **RN-S03 — Preço opcional ("a combinar").** O preço do serviço no catálogo é **opcional**. Sem preço, o serviço é tratado como **a combinar**. Quando informado, o preço é **maior que zero**, com 2 casas decimais, comportando pelo menos R$ 9.999.999.999,99.

🔵 **RN-S04 — Nome único por usuário.** Não pode haver dois serviços **ativos** com o mesmo nome. Produtos e serviços **podem** ter o mesmo nome entre si.

🔵 **RN-S05 — Comparação de nomes.** Para a unicidade, nomes são comparados sem diferenciar maiúsculas/minúsculas, acentos e espaços nas pontas.

🔵 **RN-S06 — Texto limpo.** Espaços no início e no fim do nome e da descrição são removidos ao salvar.

🔵 **RN-S07 — Reativação.** Um serviço inativo pode ser reativado (pelo `edit`, com `active: true`); ao reativar, vale de novo a unicidade de nome.

🔵 **RN-S08 — Inativos fora do catálogo ativo.** A listagem mostra só serviços ativos por padrão; inativos aparecem com filtro. Serviço inativo não pode ser adicionado a orçamentos, mas continua nos orçamentos em que já estava.

🔵 **RN-S09 — Exclusão definitiva.** Serviço nunca usado em orçamento pode ser excluído definitivamente; usado, só inativado.

🔵 **RN-S11 — Preço ajustável no orçamento.** O preço do catálogo é uma **referência**: no orçamento, o preço do item pode ser ajustado livremente (RN-O04), sem alterar o catálogo. Serviço **a combinar** entra no orçamento sem preço, e o usuário informa o valor no item.

> `RN-S10` (quantidade conforme a forma de cobrança) foi descartada junto com o campo `billingType` e não será reutilizada.
>
> **Para `budgets.md`:** definir se um orçamento pode ser **enviado** com item de serviço ainda sem preço (a combinar), ou se todo item precisa de preço antes do envio.

---

## 5. Busca e listagem

Igual a produtos ([`products.md`](./products.md#5-busca-e-listagem)):

| Item | Especificação |
|---|---|
| Paginação | `page` (padrão 1) e `pageSize` (padrão 20, máximo 100) — RN-G15. |
| Ordenação | `orderBy` = `name`, `price` ou `createdAt`; `order` = `asc` ou `desc`. Padrão: `createdAt desc`. Ao ordenar por preço, serviços **a combinar** ficam por último. |
| Busca | `search`: texto parcial no **nome** e na **descrição**, sem diferenciar maiúsculas e acentos — RN-G16. |
| Filtros | `active` (`true` padrão, `false` ou `all`), `category`, `minPrice` e `maxPrice` (serviços a combinar não entram quando há filtro de preço). |

Resposta: `{ items: [...], page, pageSize, total }` dentro de `data`.

---

## 6. Endpoints

Mesmo padrão de produtos. Todos exigem `authenticate` e consideram apenas os serviços do usuário da sessão.

| Método e rota | Uso | Rate limit |
|---|---|---|
| `POST /services/create` | Criar serviço | 60 / 60 s |
| `PATCH /services/edit/:id` | Editar serviço, inclusive inativar/reativar via `active` | 60 / 60 s |
| `GET /services` | Listar com busca, filtros e paginação | 120 / 60 s |
| `GET /services/:id` | Ver um serviço | 120 / 60 s |
| `DELETE /services/delete/:id` | Excluir definitivamente (se nunca usado em orçamento) | 30 / 60 s |

### Body

**`POST /services/create`**
```json
{
  "name": "Instalação de chuveiro",
  "description": "Inclui mão de obra e teste; não inclui materiais",
  "price": "150.00",
  "category": "Elétrica",
  "notes": "Levar escada"
}
```
Só `name` é obrigatório. Para um serviço a combinar, omita `price` ou envie `null`.

**`PATCH /services/edit/:id`** — todos os campos opcionais, ao menos um obrigatório: `name`, `description`, `price` (aceita `null` para tornar o serviço a combinar), `category`, `notes`, `active`.

### Formato do serviço na resposta

```json
{
  "id": 1,
  "name": "Instalação de chuveiro",
  "description": "Inclui mão de obra e teste; não inclui materiais",
  "price": "150.00",
  "category": "Elétrica",
  "notes": "Levar escada",
  "active": true,
  "createdAt": "2026-10-16T12:00:00.000Z",
  "updatedAt": "2026-10-16T12:00:00.000Z"
}
```

Serviço a combinar: `"price": null`.

---

## 7. Erros

| Situação | Status | Código | Classe |
|---|---|---|---|
| Serviço não encontrado (ou de outro usuário) | 404 | `SERVICE_NOT_FOUND` | `NotFoundError` |
| Nome já usado por outro serviço ativo | 409 | `SERVICE_ALREADY_EXISTS` | `ConflictError` |
| Excluir serviço usado em orçamento | 409 | `SERVICE_IN_USE` | `ConflictError` |
| Usar serviço inativo em orçamento (Fase 5) | 409 | `SERVICE_INACTIVE` | `ConflictError` |
| Dados inválidos (inclusive preço informado ≤ 0) | 400 | — (validação Zod) | `ZodError` |

---

## 8. Modelo de dados

```prisma
model Service {
  id          Int      @id @default(autoincrement())
  name        String   @db.VarChar(100)
  description String?  @db.VarChar(255)
  price       Decimal? @db.Decimal(12, 2)   // RN-S03: null = a combinar; se informado, > 0
  category    String?  @db.VarChar(50)
  notes       String?  @db.VarChar(1000)
  active      Boolean  @default(true)       // RN-G14
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user   User @relation(fields: [userId], references: [id])
  userId Int

  @@index([userId, active])
  @@map("services")
}
```

- O model `User` ganha a relação `services Service[]`.
- A unicidade de nome entre ativos, sem diferenciar maiúsculas e acentos (RN-S04, RN-S05), é garantida no service (como em produtos).
- "Preço maior que zero quando informado" é validado no schema Zod; opcionalmente reforçado por `CHECK (price IS NULL OR price > 0)` na migration.
- Nomes no código (ver [`glossary.md`](./glossary.md)): módulo `src/modules/services/`, classes `ServicesController`, `ServicesService`, `ServicesRepository`, `ServicesSchema`, `ServicesDTOs`, `ServicesTypes`; rotas em `ServicesRoutes`.

---

## 9. Decisões

Decisões tomadas na revisão de 2026-10-16.

| ID | Pergunta | Decisão |
|---|---|---|
| **SD1** | Serviço terá forma de cobrança (hora, diária, m²...) ou duração estimada? | **Não.** |
| **SD2** | Existe serviço sem preço fixo ("a combinar")? | **Sim.** O preço no catálogo é opcional (RN-S03). |
| **SD3** | Um serviço pode ter produtos/materiais vinculados? | **Não.** Produtos e serviços entram separadamente no orçamento. |
| **SD4** | Serviços seguem as decisões de produtos? | **Sim**, exceto o preço opcional (SD2). |

### Propostas descartadas

| Proposta | Situação |
|---|---|
| Campo `billingType` (forma de cobrança) e o filtro correspondente | Descartados (SD1) |
| Campo `estimatedDuration` (duração estimada) | Descartado (SD1) |
| RN-S10 — Quantidade conforme a forma de cobrança | Descartada (SD1) |
