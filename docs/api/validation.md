---
title: "Validação de entrada"
description: "Zod, middleware validateSchema, validação de query, regras reutilizáveis, CPF/CNPJ, schemas por rota e formato do erro 400."
type: api
tags:
  - "validacao"
  - "zod"
  - "schemas"
  - "cnpj-cpf"
modules:
  - "auth"
  - "clients"
sources:
  - "src/middlewares/validate.ts"
  - "src/modules/auth/auth.schema.ts"
  - "src/modules/clients/clients.schema.ts"
  - "src/shared/utils/IsValidCnpjCpf.ts"
related:
  - "api/error-handling.md"
  - "architecture/conventions.md"
last_reviewed: 2026-10-16
---

# API — Validação

> **Escopo:** como a API valida dados de entrada: biblioteca, middleware `validateSchema`, validação de query string, schemas de cada rota, regras reutilizáveis (CPF/CNPJ, e-mail, senha, código, UUID), formato do erro de validação e camadas de validação além do Zod.
> **Documentos relacionados:** [`endpoints.md`](./endpoints.md) · [`error-handling.md`](./error-handling.md#5-formato-das-respostas-de-erro) · [`../architecture/conventions.md`](../architecture/conventions.md#45-schema-zod) · [`../database/schema.md`](../database/schema.md)
> **Fonte da verdade:** `src/middlewares/validate.ts`, `src/modules/*/*.schema.ts`, `src/shared/utils/IsValidCnpjCpf.ts`.
> **Última revisão:** 2026-10-16.

---

## 1. Visão geral

| Item | Escolha |
|---|---|
| Biblioteca | **Zod 4** (`import { z } from 'zod'`) |
| Onde ficam os schemas | `src/modules/{modulo}/{modulo}.schema.ts` — um objeto por módulo |
| Body | Validado pelo middleware `validateSchema(schema)` na rota |
| Query string | Validada no controller com `Schema.parse(req.query)` |
| Params (`:id`) | Não validados por schema; convertidos com `Number(req.params.id)` no controller |
| Cookies | Validados pela lógica de autenticação (JWT), não por Zod |
| Erro | `ZodError` → `handleError` → **400** com `details` por campo |

A validação acontece em camadas:

```
1. Zod (formato)           → 400 Erro de validação
2. Service (regra de negócio) → 409 / 401 / 404 (ex.: CPF/CNPJ já cadastrado)
3. Banco (constraints)      → unique, NOT NULL, tamanho de VARCHAR, FKs
```

---

## 2. Middleware `validateSchema`

Arquivo: `src/middlewares/validate.ts`.

```ts
export function validateSchema(schema: ZodType<any>){
    return (req, res, next) => {
        try{
            req.body = schema.parse(req.body)
            next()
        }catch(error: any){
            next(error)
        }
    }
}
```

Comportamento:

- É uma **factory**: recebe o schema e devolve o middleware.
- Valida **somente `req.body`**.
- **Substitui `req.body` pelo resultado do parse.** Como `z.object` descarta chaves não declaradas, o controller recebe apenas os campos do schema (campos extras enviados pelo cliente são ignorados silenciosamente).
- Em caso de falha, repassa o `ZodError` ao `handleError`.
- Posição na cadeia: `rateLimit` → `authenticate` → **`validateSchema`** → controller.

```ts
ClientsRoutes.post('/create', rateLimit(100, 60, 'clients/create'), authenticate, validateSchema(ClientsSchema.create), ClientsController.create)
```

### Validação de query string

Como o middleware só valida o body, a query é validada dentro do controller, e o erro segue pelo mesmo caminho:

```ts
static async getAll(req, res, next){
    try{
        const userId = req.user
        const filters = ClientsSchema.getAllQuery.parse(req.query)   // ZodError → catch → next(error) → 400
        ...
    }catch(error){
        next(error)
    }
}
```

---

## 3. Regras reutilizáveis

| Dado | Regra Zod | Observação |
|---|---|---|
| CPF/CNPJ | `z.string().refine(isValidCnpjCpf, { message: 'CPF ou CNPJ inválido' })` | Ver seção 4. |
| E-mail | `z.email().max(255)` | 255 = tamanho da coluna. |
| Senha | `z.string().min(8).max(128)` | Usada em cadastro, login e nova senha. |
| Confirmação de senha | `.refine(d => d.password === d.confirmPassword, { message: 'As senhas não coincidem', path: ['confirmPassword'] })` | `path` aponta o erro para o campo de confirmação. |
| Código de verificação | `z.string().min(6).max(6).regex(/^\d+$/, 'O código precisa ter 6 dígitos')` | Sempre string (preserva zeros à esquerda). |
| UUID | `z.uuid()` | `tokenUUID` da recuperação de senha. |
| Nome | `z.string().min(1).max(100)` (auth) / `.max(255)` (clients) | — |
| Opcional e anulável | `.nullable().optional()` | Aceita ausente, `undefined` ou `null`. |
| Edição parcial | todos os campos `.optional()` + `.refine(d => Object.keys(d).length > 0, …)` | Exige pelo menos um campo. |

---

## 4. CPF/CNPJ — `isValidCnpjCpf`

Arquivo: `src/shared/utils/IsValidCnpjCpf.ts` (usa a biblioteca `cpf-cnpj-validator`).

```ts
export function isValidCnpjCpf(cnpjcpf: string): boolean{
    const cnpjCpfFormated = cnpjcpf.replace(/\D/g, '')          // remove tudo que não é dígito
    if (cnpjCpfFormated.length !== 11 && cnpjCpfFormated.length !== 14) return false
    return cnpjCpfFormated.length === 11
        ? cpf.isValid(cnpjCpfFormated)                          // CPF: 11 dígitos
        : cnpj.isValid(cnpjCpfFormated)                         // CNPJ: 14 dígitos
}
```

- Aceita o documento com ou sem máscara (`123.456.789-09` ou `12345678909`) para fins de validação.
- Valida os **dígitos verificadores**, não apenas o tamanho.
- É usado como `refine`; o valor que segue para o service é o **mesmo enviado pelo cliente** (a função não transforma o dado).
- Recomenda-se ao cliente enviar **apenas dígitos**, que é o formato compatível com a coluna `VARCHAR(14)`.

---

## 5. Schemas por rota

### 5.1 Módulo `auth` — `authSchemas` (`auth.schema.ts`)

| Rota | Schema | Campos e regras |
|---|---|---|
| `POST /user/auth/email/verify` | `verifyEmailSchema` | `name` 1–100 · `cnpjCpf` válido · `email` ≤255 · `password` 8–128 · `confirmPassword` 8–128 · senhas iguais |
| `POST /user/auth/email/confirm` | `confirmEmailSchema` | `email` · `code` 6 dígitos |
| `POST /user/auth/email/resend-email-code` | `resendCodeEmailSchema` | `email` |
| `POST /user/auth/login` | `loginSchema` | `email` · `password` 8–128 |
| `POST /user/auth/refresh-token` | — | sem body (usa cookie) |
| `POST /user/auth/password-recovery/send-code` | `sendCodeRecoverySchema` | `email` |
| `POST /user/auth/password-recovery/confirm-code` | `confirmCodeRecoverySchema` | `tokenUUID` UUID · `code` 6 dígitos |
| `POST /user/auth/password-recovery/new-password` | `createNewPasswordSchema` | `tokenUUID` UUID · `newPassword` 8–128 · `confirmNewPassword` 8–128 · senhas iguais |
| `POST /user/auth/logout` | — | sem body (usa cookie) |

### 5.2 Módulo `clients` — `ClientsSchema` (`clients.schema.ts`)

| Rota | Schema | Campos e regras |
|---|---|---|
| `POST /clients/create` | `create` (body) | `name` 1–255 obrigatório · `cnpjCpf` válido obrigatório · `tellphone` string opcional/nulo · `email` ≤255 opcional/nulo · sem `userId` (vem de `req.user`) |
| `PATCH /clients/edit/:id` | `edit` (body) | `name` 1–255 · `cnpjCpf` válido · `tellphone` · `email` (todos opcionais) · sem `userId` · ao menos um campo |
| `GET /clients` | `getAllQuery` (query) | `name` 1–255 · `cnpjCpf` válido · `tellphone` min 1 · `email` (todos opcionais) |
| `DELETE /clients/delete/:id` | — | apenas `:id` |
| `GET /clients/:id` | — | apenas `:id` |

---

## 6. Formato do erro de validação

Produzido pelo `handleError` a partir de `error.issues` do Zod:

```json
{
  "success": false,
  "error": "Erro de validação",
  "details": [
    { "field": "cnpjCpf", "message": "CPF ou CNPJ inválido" },
    { "field": "confirmPassword", "message": "As senhas não coincidem" }
  ]
}
```

- Status **400**.
- `field` = `issue.path.join('.')` (campos aninhados aparecem como `a.b`; erros no objeto raiz têm `field` vazio — ex.: o `refine` "pelo menos um campo" do `edit`).
- `message` = mensagem customizada do schema ou a mensagem padrão do Zod (em inglês) quando não há customização.
- Todos os problemas do body são retornados juntos, não só o primeiro.

---

## 7. Tipos derivados dos schemas

Os DTOs de entrada são inferidos dos schemas, garantindo que tipo e validação não divirjam:

```ts
// clients.dtos.ts
CreateRequestDTO: z.infer<typeof ClientsSchema.create>
EditRequestDTO:   z.infer<typeof ClientsSchema.edit>
GetAllQueryDTO:   z.infer<typeof ClientsSchema.getAllQuery>
```

---

## 8. Validações fora do Zod

| Validação | Onde | Resposta |
|---|---|---|
| E-mail já cadastrado | `AuthUserService.verifyEmail` | 409 `USER_ALREADY_EXISTS` |
| CPF/CNPJ de cliente já existe para o usuário (em outro cliente, na edição) | `ClientsService.create` / `edit` | 409 `CLIENT_ALREADY_EXISTS` |
| Cliente existe e pertence ao usuário | `ClientsService.edit` / `delete` / `getById` | 404 `INVALID_ID_CLIENT` |
| Código de verificação confere | `AuthUserService` (Argon2) | 401 `INVALID_CODE` |
| Unicidade, NOT NULL, tamanho e FKs | PostgreSQL (constraints) | 500 (erro do Prisma convertido no repositório) |

---

## 9. Como adicionar validação a uma rota nova

1. Criar o schema no objeto do módulo (`{modulo}.schema.ts`), reutilizando as regras da seção 3.
2. Manter os limites (`max`) iguais aos tamanhos das colunas no banco.
3. Para body: adicionar `validateSchema(Schema.acao)` na rota, depois do `authenticate`.
4. Para query: `Schema.acaoQuery.parse(req.query)` dentro do `try` do controller.
5. Inferir o DTO com `z.infer<typeof Schema.acao>` em `{modulo}.dtos.ts`.
6. Escrever mensagens customizadas em português para regras de negócio (`refine`, `regex`).
