---
paths:
  - "tests/**"
  - "src/modules/**/*.service.ts"
---
# Testes

Guia completo: `docs/testing/strategy.md`.

- Todo método de service novo tem teste unitário em `tests/unit/{modulo}/{metodo}.unit.test.ts`, um arquivo por método.
- Vitest, com todas as dependências mockadas (`vi.mock` no repository, Redis e utils). Modelo: `tests/unit/clients/`.
- Rode `npm run test:unit:run` e atualize `docs/testing/test-coverage.md`.
