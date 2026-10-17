---
paths:
  - "prisma/**"
  - "src/modules/**/*.repository.ts"
---
# Banco (Prisma)

- Fonte da verdade: `prisma/schema.prisma`. Não copie models para docs ou rules.
- `Client.tellphone` tem dois "l" de propósito (nome do banco e da API). Não renomeie.
- Todo model de domínio tem `userId`; toda query de dado de usuário filtra por ele.
- Bugs abertos (`docs/project/issues.md`): ISS-14, `Client.email` é `@unique` global; ISS-21, `Product.price` é `Decimal(5,2)`, máximo 999.99. Remova a linha quando a issue for corrigida.
- Migration nova: atualize `docs/database/schema.md` (inclusive o histórico de migrations) e `docs/database/relationships.md` no mesmo PR.
