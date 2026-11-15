---
paths:
  - "tests/**"
  - "src/modules/**/*.service.ts"
---
# Testes

Guia completo: `docs/testing/strategy.md`.

- Todo método de service novo tem teste unitário em `tests/unit/{modulo}/{metodo}.unit.test.ts`, um arquivo por método.
- Vitest, com as dependências do service substituídas por objetos falsos (`vi.fn()`) injetados no construtor por um `makeSut()`. Modelo: `tests/unit/auth/verifyEmail.unit.test.ts`.
- Rode `npm run test:unit:run` e atualize `docs/testing/test-coverage.md`.
