---
title: "Glossário"
description: "Termos do domínio e técnicos do OrçaFácil com tradução PT/EN, definição e o nome usado (ou a usar) no código."
type: domain
tags:
  - "glossario"
  - "dominio"
  - "nomenclatura"
  - "traducao"
modules:
  - "auth"
  - "clients"
  - "user"
  - "products"
sources:
  - "prisma/schema.prisma"
  - "src/modules/"
  - "src/shared/"
related:
  - "domain/business-rules.md"
  - "architecture/conventions.md"
  - "database/schema.md"
last_reviewed: 2026-10-16
---

# Domínio — Glossário

> **Escopo:** vocabulário do OrçaFácil: termos de negócio, termos técnicos usados no projeto e o **nome que cada conceito tem (ou deve ter) no código**. Use este glossário para nomear models, campos, rotas, variáveis e mensagens de forma consistente.
> **Documentos relacionados:** [`business-rules.md`](./business-rules.md) · [`../architecture/conventions.md`](../architecture/conventions.md#1-idioma) · [`../database/schema.md`](../database/schema.md)
> **Fonte da verdade:** `prisma/schema.prisma` e `src/` para os termos existentes. Termos marcados como **previsto** ainda não existem no código; o nome indicado é a convenção a seguir quando forem criados.
> **Última revisão:** 2026-10-16.

---

## 1. Regras de nomenclatura

- **Código em inglês, mensagens ao usuário em português** (ver [`conventions.md`](../architecture/conventions.md#1-idioma)).
- Model Prisma no **singular PascalCase** (`Client`); tabela no **plural snake_case** (`clients`); campos em **camelCase** (`unitPrice`).
- Módulo em `src/modules/` no **plural** quando representa coleção (`clients`, `products`).
- Quando um termo tiver nome definido aqui, **use exatamente esse nome**. Para conceitos novos, adicione a entrada neste glossário.

Legenda da coluna **Situação**: **existente** (já está no código) · **previsto** (convenção para quando for implementado) · **fora do escopo** (não será implementado no momento, por decisão de produto) · **removido** (existiu e foi retirado).

---

## 2. Termos de negócio

| Termo (PT) | Inglês / nome no código | Situação | Definição |
|---|---|---|---|
| **OrçaFácil** | `orcafacil` | existente | O sistema: gestão de orçamentos e clientes (vendas estão fora do escopo atual). |
| **Usuário** | `User` · tabela `users` · módulo `user` | existente | Conta que acessa o sistema: a empresa ou o profissional autônomo. Dono de todos os demais dados. Identificado por CPF ou CNPJ e por e-mail. |
| **Conta** | `User` | existente | Sinônimo de usuário do ponto de vista de acesso (login, senha, sessão). |
| **Dono (do registro)** | `userId` | existente | Usuário a quem um registro de negócio pertence. Todo cliente, produto, serviço e orçamento tem `userId`. |
| **Cliente** | `Client` · tabela `clients` · módulo `clients` | existente | Pessoa física ou jurídica para quem o usuário emite orçamentos. Pertence a um único usuário. |
| **Produto** | `Product` · tabela `products` · módulo `products` | existente (tabela) / previsto (módulo) | Item físico do catálogo do usuário, com nome, descrição e preço, usado para compor orçamentos. |
| **Serviço** | `Service` · tabela `services` · módulo `services` | previsto | Trabalho prestado do catálogo do usuário (ex.: mão de obra, instalação, hora técnica). **Entidade separada de produto** (decisão D2 em [`business-rules.md`](./business-rules.md#8-decisões-de-produto)). Classes do módulo: `ServicesController`, `ServicesService`, `ServicesRepository`. Não confundir com a **camada service** (seção 4). |
| **Catálogo** | `products` + `services` | previsto | Conjunto dos produtos e serviços de um usuário. |
| **Orçamento** | `Budget` · tabela `budgets` · módulo `budgets` | previsto | Proposta comercial de um usuário para um cliente, composta por itens, com valores, condições e status. |
| **Item do orçamento** | `BudgetItem` · tabela `budget_items` | previsto | Linha de um orçamento: produto ou serviço, quantidade, preço unitário e subtotal. |
| **Venda** | `Sale` | fora do escopo | Negócio fechado a partir de um orçamento. **Não será implementada no momento** (decisão D6); não criar models, rotas ou campos de venda sem nova decisão. |
| **Status do orçamento** | `status` (enum `BudgetStatus`) | previsto | Situação do orçamento no seu ciclo de vida (ex.: rascunho, enviado, aprovado). Valores: `DRAFT`, `SENT`, `APPROVED`, `REJECTED`, `EXPIRED`, `CANCELED` ([`budgets.md`](./budgets.md#2-ciclo-de-vida-status)). |
| **Validade** | `validUntil` | previsto | Data até a qual o orçamento é válido. |
| **Quantidade** | `quantity` | previsto | Quantidade de um produto ou serviço em um item. |
| **Preço unitário** | `unitPrice` | previsto | Preço de uma unidade do produto ou serviço **no momento** em que foi incluído no orçamento. |
| **Preço (do catálogo)** | `price` | existente (produtos) / previsto (serviços) | Preço atual do produto ou serviço no catálogo (`products.price`). Obrigatório em produtos; **opcional** em serviços. |
| **A combinar** | `price: null` | previsto | Serviço sem preço no catálogo; o valor é definido no item do orçamento (RN-S03, RN-S11). |
| **Categoria** | `category` | previsto | Texto livre que agrupa produtos no catálogo (ex.: "Construção"), usado como filtro na listagem. |
| **Observações internas** | `notes` | previsto | Texto livre visível apenas para o usuário dono; nunca aparece no orçamento (produtos e clientes). |
| **Ativo / inativo** | `active` | previsto | Indica se o registro pode ser usado em novos orçamentos. Inativos continuam no histórico (RN-G14). |
| **Subtotal** | `subtotal` | previsto | Valor de um item (`quantity × unitPrice`, antes de descontos do item) ou soma dos itens antes dos ajustes do orçamento. |
| **Desconto** | `discount` | previsto | Redução de valor, em item ou no total. |
| **Acréscimo** | `surcharge` | previsto | Aumento de valor (frete, taxa) aplicado ao total. |
| **Total** | `total` | previsto | Valor final do orçamento após descontos e acréscimos. |
| **Forma de pagamento** | `paymentMethod` | fora do escopo | Condições de pagamento não fazem parte do orçamento nesta versão (decisão em [`budgets.md`](./budgets.md#13-decisões)). |
| **Parcela** | `installment` | fora do escopo | Idem: não há parcelamento no orçamento nesta versão. |
| **PDF do orçamento** | — | previsto | Documento gerado a partir do orçamento, com os dados da empresa e do cliente, para envio ao cliente final (roadmap, Fase 6). |
| **Link público** | `publicToken` | previsto | Endereço curto (`/o/{token}`) de visualização do orçamento, acessível pelo cliente final sem login, válido até a validade do orçamento; permite aprovar ou recusar ([`dispatch.md`](./dispatch.md#6-link-público)). |
| **Histórico de envio** | `BudgetDispatch` · tabela `budget_dispatches` | previsto | Registro de cada envio, falha, visualização e resposta de um orçamento, com data e canal (RN-E28). |
| **Canal de envio** | `channel` | previsto | Meio pelo qual o orçamento foi enviado: `EMAIL`, `LINK`, `MANUAL` (usuário enviou o PDF por conta própria) ou `WHATSAPP` (Fase 7). |
| **Notificação** | `Notification` · tabela `notifications` · módulo `notifications` | previsto | Aviso dentro do sistema para o usuário (ex.: cliente aprovou ou recusou um orçamento), com estado lida/não lida (RN-E30). |
| **Instância do WhatsApp** | `WhatsappInstance` · tabela `whatsapp_instances` · módulo `whatsapp` | previsto | Conexão do número de WhatsApp do usuário com o sistema, usada para enviar orçamentos a partir desse número. **Uma por conta** (RN-W01). A forma de conexão (QR Code ou API oficial) ainda será decidida (roadmap, Fase 7, decisão A1). |
| **Número do orçamento** | `number` | previsto | Número sequencial do orçamento dentro da conta do usuário (1, 2, 3...). |
| **Código do orçamento** | `code` | previsto | Número formatado para exibição: `ORC-0001`. |
| **Total parcial** | `hasPendingPrices` | previsto | Indica que o orçamento tem itens a combinar e o total não inclui esses itens (RN-O15). |
| **Observações ao cliente** | `customerNotes` | previsto | Texto exibido no orçamento para o cliente (garantia, o que não está incluso). Diferente de `notes`, que é interno. |
| **Validade padrão** | `defaultBudgetValidityDays` | previsto | Configuração do usuário: dias de validade dos novos orçamentos (padrão 15 — RN-O31). |
| **Quem respondeu** | `respondedBy` (`USER` ou `CLIENT`) | previsto | Indica se a aprovação/recusa foi feita pelo usuário ou pelo cliente no link público (RN-O09). |
| **Vendedor** | `Seller` · tabela `sellers` | removido | Existiu (com taxa de comissão) e foi removido em set/2026. Fora do escopo (contas individuais — decisão D1). |

---

## 3. Identificação e dados pessoais

| Termo (PT) | Nome no código | Situação | Definição |
|---|---|---|---|
| **CPF** | parte de `cnpjCpf` | existente | Cadastro de Pessoa Física: 11 dígitos, com 2 dígitos verificadores. |
| **CNPJ** | parte de `cnpjCpf` | existente | Cadastro Nacional da Pessoa Jurídica: 14 dígitos, com 2 dígitos verificadores. |
| **CPF/CNPJ** | `cnpjCpf` | existente | Campo único que aceita CPF **ou** CNPJ, em `users` e `clients` (`VARCHAR(14)`). Validado por `isValidCnpjCpf`. O nome é sempre `cnpjCpf` (nessa ordem). |
| **Pessoa física / jurídica** | — | previsto | Tipo de pessoa, derivável do tamanho do documento (11 = física, 14 = jurídica). |
| **Telefone** | `tellphone` | existente | Telefone de contato do cliente. **Grafia com dois "l"** no banco e na API — manter exatamente esse nome. |
| **E-mail** | `email` | existente | E-mail de login (usuário) ou de contato (cliente). |
| **Nome / razão social** | `name` | existente | Nome da pessoa física ou razão social da empresa. |
| **Descrição** | `description` | existente | Texto livre opcional (ex.: `products.description`). |

---

## 4. Termos técnicos do projeto

### Arquitetura

| Termo | Definição |
|---|---|
| **Módulo** | Pasta em `src/modules/{modulo}/` com os arquivos de um recurso (route, controller, service, repository, schema, dtos, types). |
| **Route** | Arquivo `*.route.ts`: define os endpoints e a cadeia de middlewares. |
| **Controller** | Camada que recebe a requisição, chama o service e responde. Sem regra de negócio. |
| **Service (camada)** | Camada de regras de negócio (`*.service.ts`). Não confundir com a entidade de negócio **Serviço** (`Service`). |
| **Repository** | Camada de acesso ao banco via Prisma (`*.repository.ts`). |
| **Schema (Zod)** | Definição de validação de entrada (`*.schema.ts`). Não confundir com o **schema do Prisma** (`schema.prisma`). |
| **DTO** | *Data Transfer Object*: formato de entrada/saída da API (`*.dtos.ts`), com sufixos `RequestDTO`, `ResponseDTO`, `QueryDTO`. |
| **Types** | Formatos internos entre service e repository (`*.types.ts`). |
| **Middleware** | Função Express executada antes do controller (`rateLimit`, `authenticate`, `validateSchema`) ou após erros (`handleError`). |
| **`ApiResponse<T>`** | Formato padrão de toda resposta: `{ success: true, data }` ou `{ success: false, error, code?, details? }`. |
| **`AppError`** | Classe base dos erros esperados (`message`, `statusCode`, `code`). Subclasses: `ConflictError` (409), `UnauthorizedError` (401), `NotFoundError` (404). |
| **`ErrorCode`** | Enum com os códigos de erro enviados ao cliente no campo `code`. |
| **Multi-tenant (por usuário)** | Modelo em que vários usuários compartilham o sistema, mas cada um só acessa os próprios dados (isolamento por `userId`). |
| **Tenant** | A unidade de isolamento de dados — no OrçaFácil, o **usuário**. |

### Autenticação e sessão

| Termo | Nome no código | Definição |
|---|---|---|
| **Cadastro pendente** | chave `verify-email-{email}` | Dados de um cadastro aguardando confirmação do e-mail, guardados no Redis por 10 min. |
| **Código de verificação** | `code` | Número de 6 dígitos enviado por e-mail para confirmar cadastro ou recuperar senha. |
| **Cooldown** | chave `verify-email-cooldown-{email}` | Intervalo mínimo (60 s) entre envios de código para o mesmo e-mail. |
| **Access token** | cookie `accessToken` | JWT de 15 min que autentica as requisições. |
| **Refresh token** | cookie `refreshToken` | JWT de 7 dias usado para obter um novo par de tokens. |
| **`jti`** | `jti` | Identificador único (UUID) de um refresh token, registrado no Redis (`refresh-token-{jti}`). |
| **Rotação de token** | — | A cada renovação, o refresh token usado é invalidado e um novo é emitido. |
| **`tokenUUID`** | `tokenUUID` | Identificador (UUID) de um processo de recuperação de senha. |
| **`req.user`** | `req.user` | Id do usuário autenticado (string), preenchido pelo middleware `authenticate`. |
| **Pepper** | `PEPPER` | Segredo concatenado às senhas e códigos antes do hash Argon2. |
| **Argon2id** | `ArgonHash` | Algoritmo de hash usado para senhas e códigos. |
| **Rate limit** | `rateLimit` | Limite de requisições por IP e rota numa janela de tempo. |

### Dados e persistência

| Termo | Definição |
|---|---|
| **Prisma** | ORM usado para acessar o PostgreSQL. |
| **Migration** | Alteração versionada do banco em `prisma/migrations/`, criada com `prisma migrate dev`. |
| **TTL** | *Time to live*: tempo de expiração de uma chave no Redis. |
| **Snapshot** (previsto) | Cópia dos valores no momento de um evento (ex.: preço do produto gravado no item do orçamento), para não mudar quando o original mudar. |
| **Soft delete / inativação** (previsto) | Marcar um registro como inativo em vez de excluí-lo fisicamente. |
| **Hard delete** | Exclusão física do registro (comportamento atual de clientes). |

---

## 5. Termos a evitar

| Evite | Use | Motivo |
|---|---|---|
| `customer` | `client` | O projeto já usa `Client`. |
| `quote`, `estimate` | `budget` | Padronização do conceito de orçamento. |
| `telephone`, `phone` (em `clients`) | `tellphone` | Nome existente no banco e na API. |
| `cpf`, `cnpj` como campos separados | `cnpjCpf` | Campo único já adotado. |
| `account` para o model | `User` | O model de conta é `User`. |
| `seller` como model | — | Conceito removido; contas são individuais (decisão D1). |
| `sale`, `order` | — | Vendas estão fora do escopo (decisão D6). |
| `service` para itens do catálogo **dentro** de `Product` (ex.: campo `type`) | model `Service` separado | Serviço é entidade separada (decisão D2). |
