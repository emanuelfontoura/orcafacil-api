---
paths:
  - "src/modules/**/*.{controller,service,repository}.ts"
---
# Camadas (controller, service, repository)

Resumo de `docs/README.md` §2.2–2.4. Detalhes em `docs/architecture/conventions.md` §4.

- Controller: tipa os dados com o DTO do módulo, chama o service e responde `res.status(200).json({ success: true, data })`; no `catch`, `next(error)`. Sem regra de negócio, Prisma ou Redis.
- Service: regras de negócio, verificações (existência, duplicidade, permissão, estado) e uso do Redis. Chave Redis sempre com TTL; falha vira `AppError(…, 500, ErrorCode.REDIS_*_ERROR)`. Não conhece `req`/`res`.
- Repository: só Prisma. Cada operação em `try/catch`, convertida em `AppError(…, 500, ErrorCode.<CODIGO>)`. Retorna `null` quando não encontra; quem decide se é erro é o service.
- Erros sempre com as classes de `src/shared/errors` e um `ErrorCode`. `ErrorCode` novo vai em `docs/api/error-handling.md`.
