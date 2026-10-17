---
title: "Estratégia e padrões de testes"
description: "Testes unitários de services com Vitest: organização, anatomia do arquivo, mocks, asserções, categorias de cenários e template."
type: testing
tags:
  - "testes"
  - "vitest"
  - "mocks"
  - "unitarios"
  - "template"
modules:
  - "auth"
  - "clients"
sources:
  - "tests/"
  - "vite.config.ts"
  - "bitbucket-pipelines.yml"
related:
  - "testing/test-coverage.md"
  - "architecture/conventions.md"
last_reviewed: 2026-10-15
---

# Testes — Estratégia e Padrões

> **Escopo:** estratégia de testes do `orcafacil-api`: o que é testado e por quê, ferramentas e configuração, organização de arquivos, anatomia de um arquivo de teste, técnicas de mock, asserções, categorias de cenários, execução local e no CI, e um template para novos testes. Baseado nos testes unitários existentes em `tests/unit/auth/`.
> **Documentos relacionados:** [`test-coverage.md`](./test-coverage.md) · [`../architecture/conventions.md`](../architecture/conventions.md#10-testes) · [`../modules/auth.md`](../modules/auth.md) · [`../infrastructure/environment.md`](../infrastructure/environment.md#6-ci--bitbucket-pipelines-bitbucket-pipelinesyml)
> **Fonte da verdade:** `tests/`, `vite.config.ts`, `package.json`, `bitbucket-pipelines.yml`.
> **Última revisão:** 2026-10-15.

---

## 1. Estratégia

| Decisão | Escolha |
|---|---|
| Tipo de teste | **Somente unitários** |
| Alvo | **Services** (camada de regras de negócio) |
| Isolamento | Todas as dependências do service são mockadas: repositórios, Redis, utilitários (hash, geração de código/tokens), `crypto` |
| Infraestrutura real | Nenhuma: os testes não acessam PostgreSQL, Redis, SMTP nem rede |
| Granularidade | **Um arquivo por método do service** |
| Integração e E2E | Não fazem parte do projeto atualmente |

**Por que testar o service:** é onde ficam as regras de negócio (verificações, ordem das operações, chaves e TTLs do Redis, erros lançados). Controllers apenas repassam dados, e repositórios apenas executam queries Prisma — ambos são finos e seguem padrões fixos.

**Histórico:** o projeto já teve testes de integração e E2E para o módulo `auth` (com Supertest e ambiente Docker de testes). Eles foram removidos no commit `bbe25bf` ("removido os testes e2e e ajustado readme") para simplificar o ambiente de desenvolvimento e o pipeline. `supertest` e `@types/supertest` continuam instalados.

---

## 2. Ferramentas e configuração

| Item | Valor |
|---|---|
| Framework | **Vitest 4** (`describe`, `it`, `expect`, `vi`, `beforeEach`) |
| Configuração | `vite.config.ts` — plugin `vite-tsconfig-paths` + alias `@` → `./src` |
| Globals | Não habilitados: as funções são **importadas explicitamente** de `'vitest'` |
| Ambiente | Node (padrão) |
| TypeScript | `tests/` está incluído no `tsconfig.json` (o build usa `tsconfig.build.json`, que exclui os testes) |
| Lint | `eslint.config.mjs` aplica as mesmas regras em `tests/**/*.ts` |
| Cobertura | Não configurada (sem `@vitest/coverage-*` instalado) |

```ts
// vite.config.ts
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
```

### Execução

```bash
npm run test:unit:run          # vitest run ./tests/unit  (execução única)
npx vitest ./tests/unit        # modo watch
npx vitest run tests/unit/auth/login.unit.test.ts   # um arquivo
```

Os testes não precisam de `.env`, banco ou Redis rodando.

### No CI

O Bitbucket Pipelines executa `npm run test:unit:run` em **todo pull request**, depois de `prisma generate` e `prisma migrate deploy` e antes do `build`. Teste falhando reprova o PR.

---

## 3. Organização dos arquivos

```
tests/
└── unit/
    └── {modulo}/
        └── {metodoDoService}.unit.test.ts
```

| Regra | Exemplo |
|---|---|
| Pasta por módulo, espelhando `src/modules/` | `tests/unit/auth/` |
| Nome do arquivo = nome do método testado | `login.unit.test.ts` → `AuthUserService.login` |
| Sufixo `.unit.test.ts` | Identifica o tipo do teste |
| Imports sempre com alias `@/` | `import { AuthUserService } from '@/modules/auth/auth.service'` |

---

## 4. Anatomia de um arquivo de teste

Todo arquivo segue a mesma sequência:

```ts
// 1. Imports: vitest, dependências que serão mockadas, o service testado, erros
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserRepository } from '@/modules/user/user.repository'
import { ArgonHash } from '@/shared/utils/ArgonHash'
import { redis } from '@/lib/redis'
import { AuthUserService } from '@/modules/auth/auth.service'
import { AppError } from '@/shared/errors/AppError'
import { ErrorCode } from '@/shared/errors/ErrorCodes'

// 2. Mocks de módulo (no topo, fora do describe)
vi.mock('@/modules/user/user.repository')
vi.mock('@/shared/utils/ArgonHash')
vi.mock('@/lib/redis')

// 3. Um describe por método: 'Unit test - {Classe} - {método}'
describe('Unit test - AuthUserService - login', () => {

    // 4. Fixtures: constantes com os dados de entrada e valores esperados
    const body = { email: 'teste@gmail.com', password: '12345678' }
    const tokens = { accessToken: '123', refreshToken: '123' }
    const id = 1

    // 5. beforeEach: limpa os mocks e configura o CAMINHO FELIZ
    beforeEach(() => {
        vi.clearAllMocks()

        vi.mocked(UserRepository.returnLoginCredentials).mockResolvedValue({ id, email: body.email, password: body.password })
        vi.mocked(ArgonHash.argonVerify).mockResolvedValue(true)
        vi.mocked(redis.set).mockResolvedValue('OK')
    })

    // 6. Cenário de sucesso
    it('deveria retornar um objeto com o acessToken e o refreshToken', async () => { ... })

    // 7. Cenários de erro: cada it sobrescreve só o mock necessário
    it('deveria retornar UnauthorizedError caso não encontre as credenciais', async () => {
        vi.mocked(UserRepository.returnLoginCredentials).mockResolvedValue(null)
        await expect(AuthUserService.login(body)).rejects.toMatchObject({ statusCode: 401, code: ErrorCode.INVALID_CREDENTIALS })
    })
})
```

### Princípios da anatomia

1. **Caminho feliz no `beforeEach`.** Todos os mocks começam configurados para o fluxo de sucesso.
2. **Cada `it` altera apenas o que o cenário precisa.** Isso deixa explícita a causa de cada falha testada.
3. **`vi.clearAllMocks()` no início do `beforeEach`.** Zera chamadas registradas entre os testes.
4. **Fixtures como `const` no escopo do `describe`.** Reutilizadas na chamada e nas asserções (`body.email`, `id`, `jti`).
5. **Agrupamento opcional com `describe` aninhado** quando há muitos cenários (ver `verifyEmail.unit.test.ts`):
   ```ts
   describe('erros de negócio', () => { ... })
   describe('erros de infraestrutura', () => { ... })
   ```

---

## 5. Nomenclatura

| Elemento | Padrão | Exemplos |
|---|---|---|
| `describe` principal | `'Unit test - {Classe} - {método}'` | `'Unit test - AuthUserService - createNewPassword'` |
| `describe` aninhado | categoria em português, minúsculo | `'erros de negócio'`, `'erros de infraestrutura'` |
| `it` | frase em português iniciando com **"deveria"** | `'deveria criar uma nova senha com sucesso'`, `'deveria falhar caso o redis.set falhe'`, `'deveria NÃO atualizar o hash caso não precise de rehash'` |
| Fixtures | `body`, `defaultData`, `tokens`, `id`, `jti` | — |

O `it` descreve **o resultado esperado e a condição**: `'deveria gerar {Erro} caso {condição}'`.

---

## 6. Técnicas de mock

### 6.1 Automock do módulo inteiro

```ts
vi.mock('@/modules/user/user.repository')
vi.mock('@/shared/utils/ArgonHash')
```

Todas as exportações viram `vi.fn()`; métodos estáticos de classes também. Usado para repositórios e utilitários.

### 6.2 Mock com factory (só o que é usado)

```ts
vi.mock('@/lib/redis', () => {
    return {
        redis: {
            set: vi.fn()
        }
    }
})

vi.mock('@/shared/utils/generateCode', () => {
    return {
        generateCode: vi.fn()
    }
})
```

Usado para o cliente Redis (evita depender da instância real do `ioredis`) e quando se quer declarar explicitamente os métodos disponíveis.

### 6.3 Mock de módulo nativo

```ts
vi.mock('crypto')
vi.mocked(randomUUID).mockReturnValue('3181d0e7-b884-4f0f-b233-324e9ae9e180')
```

Torna valores aleatórios **determinísticos** (`jti`, `tokenUUID`), permitindo verificar chaves exatas do Redis.

### 6.4 Configurando retornos

| Método | Uso | Exemplo |
|---|---|---|
| `vi.mocked(fn)` | Tipar o mock a partir da função original | `vi.mocked(redis.set)` |
| `.mockResolvedValue(v)` | Função assíncrona com sucesso | `mockResolvedValue('OK')`, `mockResolvedValue(null)` |
| `.mockResolvedValue()` | Função `Promise<void>` | `UserRepository.updatePasswordHash` |
| `.mockReturnValue(v)` | Função síncrona | `generateCode` → `'123456'` |
| `.mockRejectedValue(err)` | Simular falha em todas as chamadas | `mockRejectedValue(new AppError('Erro', 500, ErrorCode.UPDATE_DATABASE_ERROR))` |
| `.mockRejectedValueOnce(err)` | Simular falha numa chamada específica (encadeável) | 1º `redis.set` falha; ou 1º ok e 2º falha |
| `{...} as any` | Retorno parcial quando só alguns campos importam | `mockResolvedValue({ id: 1 } as any)` |

Valores do Redis que são JSON são mockados já serializados:

```ts
vi.mocked(redis.get).mockResolvedValue(JSON.stringify({ id: 'user-id', code: '123456', authorized: true, attempts: 1 }))
```

---

## 7. Asserções

### 7.1 Resultado

```ts
const result = await AuthUserService.verifyEmail(defaultData)
expect(result).toEqual({ email: defaultData.email, name: defaultData.name })

await expect(AuthUserService.createNewPassword(body)).resolves.toBeUndefined()   // métodos void
```

### 7.2 Colaboração (o service chamou as dependências corretamente)

```ts
expect(UserRepository.findByEmail).toHaveBeenCalledWith(defaultData.email)
expect(generateTokens).toHaveBeenCalledWith(id, jti)
expect(randomUUID).toHaveBeenCalled()

// ordem e argumentos de chamadas repetidas
expect(ArgonHash.argonHash).toHaveBeenNthCalledWith(1, defaultData.password)
expect(ArgonHash.argonHash).toHaveBeenNthCalledWith(2, '123456')
expect(ArgonHash.argonHash).toHaveBeenCalledTimes(2)

// chave, valor e TTL exatos no Redis
expect(redis.set).toHaveBeenCalledWith(`refresh-token-${jti}`, id, 'EX', 604800)
```

### 7.3 Erros

```ts
await expect(AuthUserService.login(body)).rejects.toMatchObject({
    statusCode: 401,
    code: ErrorCode.INVALID_CREDENTIALS
})

await expect(AuthUserService.createNewPassword(body)).rejects.toThrow('Erro')   // erro não-AppError repassado
```

- Erros são verificados por **`statusCode` e `code`** (`ErrorCode`), não pela mensagem.
- `toMatchObject` permite checar só as propriedades relevantes do `AppError`.

### 7.4 Interrupção do fluxo (*short-circuit*)

Quando uma verificação falha, o teste garante que os passos seguintes **não** foram executados:

```ts
vi.mocked(UserRepository.findByEmail).mockResolvedValue({ id: 1 } as any)

await expect(AuthUserService.verifyEmail(defaultData)).rejects.toMatchObject({ statusCode: 409, code: ErrorCode.USER_ALREADY_EXISTS })

expect(ArgonHash.argonHash).not.toHaveBeenCalled()
expect(redis.set).not.toHaveBeenCalled()
```

---

## 8. Categorias de cenários

Para cada método de service, os testes cobrem:

| Categoria | O que verificar | Exemplo existente |
|---|---|---|
| **Sucesso** | Retorno correto | `'deveria retornar um objeto com o acessToken e o refreshToken'` |
| **Colaboração** | Dependências chamadas com os argumentos certos, na ordem certa, o número certo de vezes (chaves e TTLs do Redis, hash antes de salvar) | `'deveria salvar no Redis com a key e o TTL corretos'` |
| **Ramos condicionais** | Caminhos alternativos sem erro | `'deveria NÃO atualizar o hash caso não precise de rehash'` |
| **Erros de negócio** | Cada `throw` de regra: status, código e interrupção do fluxo | `'deveria gerar ConflictError caso o cooldown do email ainda estiver ativo'` |
| **Erros de infraestrutura** | Falha de **cada** dependência (repositório, Redis, hash, tokens): o erro é propagado ou convertido no `AppError` esperado | `'deveria falhar caso o redis.set falhe'` → `REDIS_SAVE_ERROR` |

Regra prática: **um `it` por `throw` do service + um `it` por dependência que pode falhar + o caminho feliz.**

---

## 9. O que não é testado hoje

| Camada / tipo | Situação | Motivo |
|---|---|---|
| Controllers | Sem testes | Apenas adaptam `req`/`res` |
| Repositórios | Sem testes | Apenas executam Prisma; exigiriam banco real |
| Middlewares (`authenticate`, `rateLimit`, `validateSchema`, `handleError`) | Sem testes | — |
| Schemas Zod | Sem testes diretos | — |
| Utilitários (`ArgonHash`, `generateTokens`, `isValidCnpjCpf`, ...) | Sem testes diretos (são mockados) | — |
| Integração / E2E | Removidos | Simplificar ambiente e pipeline |

Situação detalhada por método em [`test-coverage.md`](./test-coverage.md).

---

## 10. Template para um novo teste

```ts
// tests/unit/{modulo}/{metodo}.unit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { {Modulo}Repository } from '@/modules/{modulo}/{modulo}.repository'
import { {Modulo}Service } from '@/modules/{modulo}/{modulo}.service'
import { AppError } from '@/shared/errors/AppError'
import { ErrorCode } from '@/shared/errors/ErrorCodes'

vi.mock('@/modules/{modulo}/{modulo}.repository')

describe('Unit test - {Modulo}Service - {metodo}', () => {
    const body = { /* entrada válida */ }
    const entity = { id: 1, /* retorno do repositório */ }

    beforeEach(() => {
        vi.clearAllMocks()

        // caminho feliz
        vi.mocked({Modulo}Repository.algumaBusca).mockResolvedValue(null)
        vi.mocked({Modulo}Repository.create).mockResolvedValue(entity as any)
    })

    it('deveria {resultado esperado}', async () => {
        const result = await {Modulo}Service.{metodo}(body)

        expect({Modulo}Repository.create).toHaveBeenCalledWith(body)
        expect(result).toEqual(entity)
    })

    describe('erros de negócio', () => {
        it('deveria gerar ConflictError caso {condição}', async () => {
            vi.mocked({Modulo}Repository.algumaBusca).mockResolvedValue(entity as any)

            await expect({Modulo}Service.{metodo}(body)).rejects.toMatchObject({
                statusCode: 409,
                code: ErrorCode.{CODIGO}
            })
            expect({Modulo}Repository.create).not.toHaveBeenCalled()
        })
    })

    describe('erros de infraestrutura', () => {
        it('deveria falhar caso o {Modulo}Repository.create falhe', async () => {
            vi.mocked({Modulo}Repository.create).mockRejectedValue(new AppError('Erro', 500, ErrorCode.INTERNAL_SERVER_ERROR))

            await expect({Modulo}Service.{metodo}(body)).rejects.toMatchObject({
                statusCode: 500,
                code: ErrorCode.INTERNAL_SERVER_ERROR
            })
        })
    })
})
```

### Checklist

1. Arquivo em `tests/unit/{modulo}/{metodo}.unit.test.ts`.
2. Imports explícitos do `vitest` e com alias `@/`.
3. `vi.mock` de **todas** as dependências do service (repositórios, `@/lib/redis`, utilitários, `crypto` se houver aleatoriedade).
4. `describe('Unit test - {Classe} - {método}')`.
5. `beforeEach` com `vi.clearAllMocks()` + caminho feliz.
6. Cenário de sucesso com verificação de retorno e de colaboração.
7. Um cenário por erro de negócio, verificando `statusCode`, `code` e o que **não** foi chamado.
8. Um cenário por falha de dependência.
9. `it` em português começando com "deveria".
10. Rodar `npm run test:unit:run` e atualizar [`test-coverage.md`](./test-coverage.md).
