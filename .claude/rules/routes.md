---
paths:
  - "src/modules/**/*.route.ts"
  - "src/modules/**/*.schema.ts"
---
# Rotas e schemas

Resumo de `docs/README.md` §2.1 e §3. Em caso de dúvida, o README vale.

- Ordem fixa: `rateLimit(max, janelaSeg, 'modulo/acao') → authenticate → validateSchema(Schema.acao) → Controller.metodo`.
- Toda rota nova tem `rateLimit`. Escolha o limite pela tabela de `docs/README.md` §3 e registre em `docs/api/endpoints.md` e em `docs/modules/{modulo}.md`.
- Rota que lê, cria, altera ou exclui dado de usuário usa `authenticate`. O dono vem de `req.user`, nunca do body.
- Todo body tem schema Zod validando cada campo; o `.max()` de strings acompanha o `@db.VarChar(n)` da coluna.
- Referência de implementação: `src/modules/clients/`.
