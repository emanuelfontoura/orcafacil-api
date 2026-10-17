---
title: "Visão geral do projeto"
description: "Objetivo do OrçaFácil, público-alvo, conceitos do domínio, escopo atual e planejado, estado do projeto e índice da documentação."
type: project
tags:
  - "objetivo"
  - "dominio"
  - "escopo"
  - "roadmap"
  - "indice"
modules:
  - "auth"
  - "clients"
  - "user"
  - "products"
sources:
  - "README.md"
  - "prisma/schema.prisma"
related:
  - "project/issues.md"
  - "architecture/overview.md"
last_reviewed: 2026-10-15
---

# Projeto — Visão Geral

> **Escopo:** objetivo do OrçaFácil, problema que resolve, público-alvo, domínio, escopo atual e planejado, estado do projeto e índice desta documentação (RAG). **Comece por aqui.**
> **Documentos relacionados:** [`issues.md`](./issues.md) · [`../architecture/overview.md`](../architecture/overview.md)
> **Fonte da verdade:** repositório `orcafacil-api` (Bitbucket: `bitbucket.org/orcafacil-api/orcafacil-api`).
> **Última revisão:** 2026-10-15.

---

## 1. Objetivo

O **OrçaFácil** é um sistema para **gestão de orçamentos e clientes**. Seu objetivo é agilizar e organizar o processo de criar orçamentos, mantendo em um só lugar o cadastro de clientes e o catálogo de produtos e serviços.

> Vendas (conversão de orçamento em venda, pagamentos) estão **fora do escopo atual**, por decisão de produto ([D6](../domain/business-rules.md#8-decisões-de-produto)). O nome e a descrição originais do projeto ainda citam vendas.

O `orcafacil-api` é o **backend** desse sistema: uma API REST em Node.js/TypeScript consumida por um frontend separado.

---

## 2. Problema e público-alvo

| | |
|---|---|
| **Problema** | Profissionais e pequenas empresas montam orçamentos de forma manual (planilhas, mensagens, papel), perdem histórico de clientes e não têm um catálogo organizado de preços. |
| **Público** | Empresas e profissionais autônomos que vendem produtos e prestam serviços e emitem orçamentos para seus clientes. |
| **Usuário do sistema** | A empresa/profissional, identificado por **CPF ou CNPJ**. Cada usuário tem uma conta própria e enxerga somente os próprios dados (modelo multi-tenant por usuário). |

---

## 3. Conceitos do domínio

| Conceito | Descrição | Situação |
|---|---|---|
| **Usuário** (`users`) | Conta da empresa/profissional que usa o sistema. Dono de todos os demais dados. | Implementado (cadastro, login, recuperação de senha) |
| **Cliente** (`clients`) | Pessoa ou empresa para quem o usuário emite orçamentos. Identificado por CPF/CNPJ, único por usuário. | Implementado (CRUD) |
| **Produto** (`products`) | Item físico do catálogo do usuário, com nome, descrição e preço. | Tabela criada; módulo em desenvolvimento (branch `features/products`) |
| **Serviço** (`services`) | Trabalho prestado do catálogo do usuário (mão de obra, instalação, hora técnica). Entidade separada de produto. | Planejado (decisão [D2](../domain/business-rules.md#8-decisões-de-produto)) |
| **Orçamento** | Proposta para um cliente, composta por itens (produtos e serviços, quantidades e preços). | Planejado |
| **Venda** | Orçamento convertido em negócio fechado. | **Fora do escopo** (decisão [D6](../domain/business-rules.md#8-decisões-de-produto)) |
| **Vendedor** | Existiu no modelo (`sellers`) e foi **removido** em set/2026. Contas são individuais (decisão [D1](../domain/business-rules.md#8-decisões-de-produto)). | Removido |

As regras de cada conceito estão em [`../domain/business-rules.md`](../domain/business-rules.md) e os nomes oficiais em [`../domain/glossary.md`](../domain/glossary.md).

---

## 4. Escopo

### Implementado
- Cadastro de usuário com confirmação de e-mail por código.
- Login com JWT em cookies `httpOnly`, renovação de sessão com rotação de refresh token e logout.
- Recuperação de senha por código enviado por e-mail.
- CRUD de clientes com filtros na listagem.
- Rate limit em todas as rotas, validação de entrada com Zod, tratamento de erros padronizado.
- Testes unitários dos principais fluxos de autenticação.
- Docker para desenvolvimento e produção; CI no Bitbucket Pipelines.

### Próximos passos

O plano completo, com ordem e dependências, está em [`../domain/roadmap.md`](../domain/roadmap.md). Em resumo:

1. **Produtos** (em andamento), **serviços**, **clientes completos** e **conta do usuário**, sem prioridade entre si.
2. **Orçamentos**, com itens de produtos e serviços.
3. **Envio do orçamento** por PDF, e-mail e link público.
4. **Integração com WhatsApp**, para enviar o orçamento pelo número do próprio usuário.

As correções do que já existe são tratadas à parte, em [`issues.md`](./issues.md).
- Correção dos problemas listados em [`issues.md`](./issues.md).

---

## 5. Estado atual

| Aspecto | Situação |
|---|---|
| Módulos | `auth` (completo), `clients` (completo), `user` (somente repositório) |
| Banco | 3 tabelas: `users`, `clients`, `products` |
| Testes | 26 testes unitários, todos passando (módulo `auth`) |
| Build | **Quebrado** — ver [ISS-01](./issues.md#iss-01--build-quebrado-por-campo-sellerid-removido) |
| Produção | Arquivos Docker prontos, com problemas de configuração — ver [`issues.md`](./issues.md) |
| CD | Não automatizado |

---

## 6. Stack resumida

Node.js · TypeScript · Express 5 · Prisma 7 · PostgreSQL · Redis (ioredis) · Zod · JWT · Argon2 · Nodemailer · Vitest · Docker · Bitbucket Pipelines.

Detalhes em [`../architecture/overview.md`](../architecture/overview.md) e [`../infrastructure/dependencies.md`](../infrastructure/dependencies.md).

---

## 7. Índice da documentação (RAG)

Esta documentação descreve o projeto para que qualquer IA (ou pessoa) entenda e trabalhe sobre ele. Cada arquivo tem um cabeçalho com escopo, documentos relacionados e fonte da verdade.

| Pasta | Arquivo | Conteúdo |
|---|---|---|
| `project/` | [`overview.md`](./overview.md) | Objetivo, domínio, escopo e índice (este arquivo) |
| | [`issues.md`](./issues.md) | Problemas conhecidos, impacto e solução |
| `domain/` | [`glossary.md`](../domain/glossary.md) | Termos do domínio e nomes usados no código |
| | [`business-rules.md`](../domain/business-rules.md) | Regras de negócio oficiais e decisões de produto |
| | [`roadmap.md`](../domain/roadmap.md) | Fases de evolução do produto e progresso |
| | [`products.md`](../domain/products.md) | Especificação do módulo de produtos |
| | [`services.md`](../domain/services.md) | Especificação do módulo de serviços |
| | [`budgets.md`](../domain/budgets.md) | Especificação do módulo de orçamentos |
| | [`dispatch.md`](../domain/dispatch.md) | Especificação do envio do orçamento: PDF, e-mail, link público, notificações |
| `architecture/` | [`overview.md`](../architecture/overview.md) | Resumo da arquitetura em camadas, stack e componentes |
| | [`folder-structure.md`](../architecture/folder-structure.md) | Organização de pastas e onde colocar código novo |
| | [`request-lifecycle.md`](../architecture/request-lifecycle.md) | Caminho de uma requisição e fluxos de autenticação |
| | [`conventions.md`](../architecture/conventions.md) | Convenções de código e padrões |
| `modules/` | [`auth.md`](../modules/auth.md) | Autenticação, cadastro, sessão e recuperação de senha |
| | [`clients.md`](../modules/clients.md) | CRUD de clientes |
| | [`user.md`](../modules/user.md) | Repositório de usuários e evolução do módulo |
| `api/` | [`endpoints.md`](../api/endpoints.md) | Referência completa dos endpoints |
| | [`authentication.md`](../api/authentication.md) | Tokens, cookies, rotas protegidas e consumo pelo frontend |
| | [`validation.md`](../api/validation.md) | Validação de entrada com Zod |
| | [`error-handling.md`](../api/error-handling.md) | Erros, `ErrorCode` e formato das respostas |
| `database/` | [`schema.md`](../database/schema.md) | Tabelas, colunas e convenções do banco |
| | [`relationships.md`](../database/relationships.md) | Relacionamentos e isolamento por usuário |
| `infrastructure/` | [`dependencies.md`](../infrastructure/dependencies.md) | Runtime, pacotes e scripts |
| | [`environment.md`](../infrastructure/environment.md) | Variáveis, ambientes, Docker, CI e CD |
| | [`redis.md`](../infrastructure/redis.md) | Uso do Redis, chaves e rate limit |
| | [`security.md`](../infrastructure/security.md) | Medidas e diretrizes de segurança |
| `testing/` | [`strategy.md`](../testing/strategy.md) | Estratégia e padrão dos testes |
| | [`test-coverage.md`](../testing/test-coverage.md) | Cobertura atual e lacunas |

### Por onde começar, conforme a tarefa

| Tarefa | Leia |
|---|---|
| Entender o projeto | `project/overview.md` → `architecture/overview.md` |
| Criar um módulo/endpoint | `architecture/conventions.md` → `architecture/folder-structure.md` → `modules/clients.md` |
| Mexer no banco | `database/schema.md` → `database/relationships.md` |
| Mexer em autenticação | `api/authentication.md` → `modules/auth.md` → `infrastructure/redis.md` |
| Escrever testes | `testing/strategy.md` → `testing/test-coverage.md` |
| Deploy/ambiente | `infrastructure/environment.md` |
| Corrigir problemas | `project/issues.md` |
| Regras de negócio / novos conceitos | `domain/glossary.md` → `domain/business-rules.md` |

### Mantendo a documentação

Ao alterar o código, atualize os documentos afetados (e a data de **Última revisão**). Se um documento divergir do código, **o código prevalece**.
