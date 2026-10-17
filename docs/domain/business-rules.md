---
title: "Regras de negócio"
description: "Regras de negócio oficiais do OrçaFácil: princípios gerais, usuários, clientes, produtos, serviços e orçamentos, com o status de implementação de cada regra e as decisões de produto."
type: domain
tags:
  - "regras-de-negocio"
  - "dominio"
  - "multi-tenant"
  - "decisoes-de-produto"
modules:
  - "auth"
  - "clients"
  - "user"
  - "products"
sources:
  - "src/modules/"
  - "prisma/schema.prisma"
related:
  - "domain/glossary.md"
  - "database/relationships.md"
  - "modules/auth.md"
  - "modules/clients.md"
  - "project/issues.md"
last_reviewed: 2026-10-16
---

# Domínio — Regras de Negócio

> **Escopo:** regras de negócio oficiais do OrçaFácil, independentes de implementação: princípios gerais, contas de usuário, clientes e as regras transversais de produtos, serviços e orçamentos. As regras detalhadas de cada módulo futuro ficarão em `products.md`, `services.md` e `budgets.md`.
> **Documentos relacionados:** [`glossary.md`](./glossary.md) · [`../database/relationships.md`](../database/relationships.md) · [`../modules/auth.md`](../modules/auth.md) · [`../modules/clients.md`](../modules/clients.md) · [`../project/issues.md`](../project/issues.md)
> **Fonte da verdade:** este documento define **o que o sistema deve fazer** (validado pelo responsável pelo produto em 2026-10-15). O código define o que ele faz hoje; o status de cada regra indica a diferença.
> **Última revisão:** 2026-10-16.

---

## Status das regras

| Status | Significado | O que fazer |
|---|---|---|
| ✅ **Vigente** | Implementada no código e de acordo com a regra. | Manter. |
| ⚠️ **Vigente com divergência** | Existe no código, mas com comportamento diferente do definido. Há uma issue ligada. | Corrigir o código conforme a regra e a issue. |
| 🔵 **Aprovada** | Decidida, mas ainda **não implementada**. | Implementar quando a funcionalidade for desenvolvida; ao implementar, mudar o status para ✅. |

Regras:

- **Ao escrever código, siga a regra deste documento**, mesmo que o código atual faça diferente (status ⚠️).
- Identificadores (`RN-...`) são permanentes. Regras descartadas na revisão (`RN-G11`, `RN-C08`, `RN-V01` a `RN-V03`) **não são reutilizadas**.
- Mudanças em regras exigem decisão do responsável pelo produto e devem ser registradas aqui (inclusive na seção 8).

---

## 1. Princípios gerais

✅ **RN-G01 — Conta individual.** Cada conta (usuário) representa **uma** empresa ou profissional. Não há equipe, vendedores nem vários logins por empresa (ver decisão D1).

⚠️ **RN-G02 — Isolamento por usuário.** Todo dado de negócio (cliente, produto, serviço, orçamento) pertence a exatamente um usuário, e um usuário **só pode ver, criar, alterar ou excluir os próprios dados**.
*Divergência:* clientes podem ser criados, lidos, alterados e excluídos em nome de outro usuário ([ISS-04](../project/issues.md#iss-04--criação-de-cliente-usa-userid-enviado-no-body), [ISS-05](../project/issues.md#iss-05--editar-excluir-e-buscar-cliente-sem-verificar-o-dono-idor)).

⚠️ **RN-G03 — Identidade vem da sessão.** O usuário que executa uma ação é sempre o da sessão autenticada; nunca um id informado pelo cliente da API.
*Divergência:* criação e edição de clientes usam `userId` do body ([ISS-04](../project/issues.md#iss-04--criação-de-cliente-usa-userid-enviado-no-body)).

✅ **RN-G04 — Documento válido.** Todo CPF ou CNPJ informado (de usuário ou cliente) deve ser válido, incluindo os dígitos verificadores.

✅ **RN-G05 — Registro de datas.** Todo registro guarda data de criação e de última alteração.

✅ **RN-G06 — Idioma.** Mensagens exibidas ao usuário são em português do Brasil.

🔵 **RN-G07 — Documento sem máscara.** CPF/CNPJ é armazenado **apenas com dígitos**; a API aceita com ou sem máscara e normaliza. *(Resolve [ISS-13](../project/issues.md#iss-13--cpfcnpj-não-é-normalizado-antes-de-salvar).)*

🔵 **RN-G08 — E-mail normalizado.** E-mails são armazenados em minúsculas e sem espaços; `Joao@Email.com` e `joao@email.com` são o mesmo e-mail. *(Resolve [ISS-16](../project/issues.md#iss-16--e-mails-não-são-normalizados-maiúsculasminúsculas).)*

🔵 **RN-G09 — Moeda.** Todos os valores monetários são em **reais (BRL)**, com 2 casas decimais. Não há multimoeda.

🔵 **RN-G10 — Arredondamento.** Cálculos monetários são arredondados para 2 casas no padrão comercial (meio para cima), **item a item**, e o total é a soma dos valores já arredondados.

🔵 **RN-G12 — Fuso horário.** Datas são armazenadas em UTC; datas de negócio (ex.: validade do orçamento) seguem o fuso `America/Sao_Paulo`.

🔵 **RN-G13 — Documentos emitidos são imutáveis.** Depois de enviado ao cliente, um orçamento preserva os valores do momento (nome e preço dos produtos e serviços, dados do cliente). Alterações posteriores no catálogo ou no cadastro do cliente **não** alteram orçamentos já emitidos.

🔵 **RN-G14 — Inativar em vez de excluir.** Registros referenciados por outros (cliente com orçamento, produto ou serviço usado em orçamento) **não podem ser excluídos**, apenas inativados. Registros inativos não aparecem para novos orçamentos, mas continuam visíveis no histórico. Registros sem referências podem ser excluídos definitivamente.

🔵 **RN-G15 — Listagens paginadas.** Toda listagem é paginada (padrão de 20 itens, máximo de 100 por página) e ordenada do mais recente para o mais antigo, salvo filtro de ordenação.

🔵 **RN-G16 — Busca por texto.** Filtros por nome ou descrição fazem busca parcial e ignoram maiúsculas/minúsculas e acentos.

🔵 **RN-G17 — Privacidade (LGPD).** Dados pessoais de clientes (CPF/CNPJ, e-mail, telefone, endereço) são usados apenas pelo usuário dono, para fins de orçamento, e são apagados junto com a conta do usuário (RN-U14).

---

## 2. Usuários e contas

### Cadastro

✅ **RN-U01 — Dados obrigatórios.** Para se cadastrar, o usuário informa nome (1–100 caracteres), CPF ou CNPJ, e-mail e senha (8–128 caracteres) com confirmação idêntica.

✅ **RN-U02 — Confirmação de e-mail.** A conta só é criada depois que o usuário confirma o e-mail com um código de 6 dígitos enviado para ele. O código vale **10 minutos**; depois disso o cadastro precisa ser reiniciado.

✅ **RN-U03 — E-mail único.** Um e-mail só pode estar associado a uma conta.

⚠️ **RN-U04 — Documento único.** Um CPF/CNPJ só pode estar associado a uma conta.
*Divergência:* a duplicidade só é detectada no fim do fluxo, com erro genérico ([ISS-12](../project/issues.md#iss-12--cpfcnpj-de-usuário-duplicado-só-é-detectado-no-insert)).

⚠️ **RN-U05 — Reenvio de código.** O usuário pode pedir um novo código, respeitando um intervalo mínimo de **60 segundos** entre envios.
*Divergência:* após o reenvio, a confirmação falha ([ISS-03](../project/issues.md#iss-03--reenvio-de-código-grava-o-código-sem-hash)).

🔵 **RN-U06 — Limite de tentativas na confirmação.** Após **5 códigos errados**, o cadastro pendente é descartado e precisa ser reiniciado. *(Resolve [ISS-09](../project/issues.md#iss-09--confirmação-de-e-mail-sem-limite-de-tentativas).)*

🔵 **RN-U07 — Aceite de termos.** O cadastro exige aceite dos Termos de Uso e da Política de Privacidade, com registro da data do aceite.

### Acesso

✅ **RN-U08 — Login.** O acesso é feito com e-mail e senha. Erros de login não informam se o e-mail existe ou se a senha está errada.

✅ **RN-U09 — Sessão.** A sessão fica ativa por até **15 minutos** sem renovação e pode ser renovada por até **7 dias**. Encerrar a sessão (logout) invalida a renovação.

✅ **RN-U10 — Recuperação de senha.** O usuário recupera a senha com um código enviado por e-mail, válido por **10 minutos**, com no máximo **5 tentativas**. Só depois de confirmar o código ele pode definir a nova senha.

🔵 **RN-U11 — Troca de senha encerra sessões.** Ao trocar ou recuperar a senha, todas as sessões abertas da conta são encerradas. *(Resolve parte de [ISS-10](../project/issues.md#iss-10--tokenuuid-de-recuperação-reutilizável-e-sessões-não-revogadas).)*

🔵 **RN-U12 — Recuperação não revela contas.** Pedir recuperação de senha para um e-mail inexistente tem a mesma resposta de um e-mail existente. *(Resolve [ISS-22](../project/issues.md#iss-22--recuperação-de-senha-revela-se-o-e-mail-existe).)*

🔵 **RN-U13 — Alterar senha logado.** O usuário autenticado pode alterar a senha informando a **senha atual** e confirmando a operação com um **código enviado por e-mail**, no mesmo padrão da confirmação de cadastro (código de 6 dígitos, válido por 10 minutos, com limite de tentativas).

### Perfil e encerramento

🔵 **RN-U14 — Excluir a conta.** O usuário pode excluir a própria conta, informando a senha. A exclusão é **imediata e irreversível** (sem período de carência — decisão D5) e remove **todos** os dados da conta (clientes, produtos, serviços, orçamentos).

🔵 **RN-U15 — Editar perfil.** O usuário pode alterar o nome. Alterar o e-mail exige confirmação do novo endereço por código. O **CPF/CNPJ não pode ser alterado** depois do cadastro.

🔵 **RN-U16 — Dados da empresa para documentos.** O usuário pode cadastrar dados exibidos nos orçamentos: nome fantasia, telefone, e-mail comercial, endereço e logotipo. Todos opcionais; sem eles, o orçamento usa o nome da conta.

---

## 3. Clientes

✅ **RN-C01 — Dono.** Todo cliente pertence a um único usuário.

✅ **RN-C02 — Dados.** Obrigatórios: nome e CPF/CNPJ (todo cliente precisa de documento — decisão D4). Opcionais: e-mail e telefone.

✅ **RN-C03 — Documento único por usuário.** Um usuário não pode ter dois clientes com o mesmo CPF/CNPJ.

✅ **RN-C04 — Clientes independentes entre contas.** O mesmo CPF/CNPJ pode estar cadastrado como cliente em contas diferentes; cada cadastro é independente.

⚠️ **RN-C05 — Edição parcial.** O usuário pode alterar qualquer dado do cliente, inclusive o CPF/CNPJ, desde que não duplique outro cliente da mesma conta.
*Divergência:* reenviar o CPF/CNPJ atual do próprio cliente gera conflito ([ISS-15](../project/issues.md#iss-15--editar-cliente-com-o-próprio-cpfcnpj-retorna-409)).

⚠️ **RN-C06 — Exclusão.** Hoje o cliente é sempre excluído definitivamente. *Divergência:* a regra definida é a RN-C09.

🔵 **RN-C07 — E-mail único por usuário.** Um usuário não pode ter dois clientes com o mesmo e-mail, mas contas diferentes podem. *(Hoje o e-mail é único em todo o sistema — [ISS-14](../project/issues.md#iss-14--e-mail-de-cliente-único-em-toda-a-tabela).)*

🔵 **RN-C09 — Exclusão com histórico.** Cliente **sem** orçamentos pode ser excluído; cliente **com** orçamentos só pode ser inativado (RN-G14).

🔵 **RN-C10 — Endereço.** O cliente pode ter um endereço opcional (CEP, logradouro, número, complemento, bairro, cidade, UF), exibido no orçamento.

🔵 **RN-C11 — Observações.** O cliente pode ter um campo de observações internas, visível apenas para o usuário.

🔵 **RN-C12 — Busca de clientes.** A listagem permite buscar por nome (parcial), CPF/CNPJ, e-mail e telefone, e filtrar ativos/inativos.

---

## 4. Produtos (regras transversais)

Regras específicas do módulo (RN-P06 a RN-P11), campos, busca e endpoints estão em [`products.md`](./products.md).

✅ **RN-P01 — Dono.** Todo produto pertence a um único usuário. *(A tabela existe; o módulo ainda não.)*

🔵 **RN-P02 — Preço.** O preço é obrigatório, **maior que zero** (R$ 0,00 não é permitido — decisão PD3 de [`products.md`](./products.md#9-decisões)), com 2 casas decimais, e comporta valores de pelo menos R$ 9.999.999.999,99. *(Hoje o limite é R$ 999,99 — [ISS-21](../project/issues.md#iss-21--preço-de-produto-limitado-a-99999).)*

🔵 **RN-P03 — Mudança de preço.** Alterar o preço de um produto não altera orçamentos já criados (RN-G13).

🔵 **RN-P04 — Nome único por usuário.** Um usuário não pode ter dois produtos ativos com o mesmo nome.

🔵 **RN-P05 — Exclusão com histórico.** Produto usado em algum orçamento só pode ser inativado (RN-G14).

---

## 5. Serviços (regras transversais)

O catálogo terá **serviços** (ex.: mão de obra, instalação, hora técnica) como **entidade separada** de produtos (decisão D2). Regras específicas do módulo (RN-S03 a RN-S11), campos, busca e endpoints estão em [`services.md`](./services.md).

🔵 **RN-S01 — Entidade própria.** Serviço é uma entidade distinta de produto, com cadastro, listagem e regras próprias. Um orçamento pode conter produtos e serviços.

🔵 **RN-S02 — Dono.** Todo serviço pertence a um único usuário (RN-G02).

> Diferente de produtos, o **preço do serviço é opcional**: serviço sem preço é **a combinar**, e o valor é definido no item do orçamento (RN-S03, RN-S11 em [`services.md`](./services.md#4-regras-de-negócio)).

---

## 6. Orçamentos (regras transversais)

Regras específicas do módulo (RN-O07 a RN-O32: status e transições, aprovação pelo cliente, itens, cálculos, numeração, edição), campos, busca e endpoints estão em [`budgets.md`](./budgets.md). Ali também está a **RN-O21** (a API calcula os totais do orçamento), aprovada especificamente para orçamentos, embora a regra geral RN-G11 tenha sido descartada.

🔵 **RN-O01 — Dono e cliente.** Todo orçamento pertence a um usuário e é emitido para **um cliente desse mesmo usuário**.

🔵 **RN-O02 — Itens do próprio catálogo.** Itens de orçamento só podem usar produtos e serviços do mesmo usuário.

🔵 **RN-O03 — Ao menos um item.** Um orçamento só pode ser enviado ao cliente se tiver pelo menos um item.

🔵 **RN-O04 — Preço congelado.** Ao incluir um produto ou serviço, o nome e o preço do momento são copiados para o item (snapshot), e podem ser ajustados no próprio item sem alterar o catálogo.

🔵 **RN-O05 — Numeração.** Cada orçamento recebe um número sequencial **por usuário** (1, 2, 3...), que nunca é reutilizado.

🔵 **RN-O06 — Valores não negativos.** Nenhum desconto pode deixar um item ou o total com valor negativo.

### Vendas

**Fora do escopo atual.** No momento o sistema terá **apenas orçamentos**; não haverá módulo de vendas, conversão de orçamento em venda, nem controle de pagamento. Qualquer funcionalidade de vendas exige nova decisão de produto.

### Envio por WhatsApp

Regras da integração com WhatsApp ([roadmap, Fase 7](./roadmap.md#fase-7--integração-com-whatsapp)). A forma de integração ainda será decidida (decisão em aberto A1 do roadmap).

🔵 **RN-W01 — Um número por conta.** Cada conta pode conectar **um único número de WhatsApp** (uma instância). Para usar outro número, o usuário desconecta o atual e conecta o novo. *(Decisão R5 do roadmap.)*

---

## 7. Limites e proteção da conta

✅ **RN-L01 — Limite de uso.** Cada operação tem um limite de requisições por minuto, mais restrito nas operações de acesso (login, códigos, senha). Ao exceder, o usuário precisa aguardar.

🔵 **RN-L02 — Sem limites por conta.** Não há limite de quantidade de clientes, produtos, serviços ou orçamentos por conta. O sistema não terá planos pagos (decisão D3).

---

## 8. Decisões de produto

Decisões tomadas na revisão de 2026-10-15 que orientam as regras acima.

| ID | Pergunta | Decisão | Regras afetadas |
|---|---|---|---|
| **D1** | Haverá vários usuários (equipe, vendedores) na mesma empresa? | **Não, no momento.** Cada conta é individual. | RN-G01, RN-G02 |
| **D2** | O catálogo terá serviços além de produtos? | **Sim, como entidade separada.** | RN-S01, RN-S02, RN-O02, RN-O04, RN-G14 |
| **D3** | O sistema terá planos pagos com limites? | **Não.** | RN-L02 |
| **D4** | Pode haver cliente sem documento? | **Não.** CPF/CNPJ é obrigatório para todo cliente. | RN-C02 |
| **D5** | A exclusão de conta tem período de carência? | **Não.** Exclusão imediata. | RN-U14 |
| **D6** | O sistema terá vendas? | **Não, no momento.** Apenas orçamentos. | Seção 6 (Vendas) |

### Propostas descartadas

| ID | Proposta | Situação |
|---|---|---|
| RN-G11 | Cálculos (subtotais, descontos, totais) sempre feitos pela API, ignorando valores calculados enviados pelo frontend. | Descartada |
| RN-C08 | Tipo de pessoa (física/jurídica) definido automaticamente pelo tamanho do documento. | Descartada |
| RN-V01–V03 | Regras de vendas (origem em orçamento aprovado, uma venda por orçamento, dono). | Descartadas com a decisão D6 |

---

## 9. Regras adicionais

> Espaço para novas regras. Formato:
>
> **RN-X — Título.** Descrição da regra.
>
> Toda regra nova entra com status 🔵 Aprovada (ou ✅ se já implementada) e com a decisão registrada na seção 8 quando necessário.
