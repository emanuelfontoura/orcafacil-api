# orcafacil-api

Backend do OrçaFácil (gestão de orçamentos e clientes): API REST em Node.js, TypeScript, Express 5, Prisma, PostgreSQL e Redis. A documentação completa (RAG) está em `docs/`; o índice e as regras obrigatórias estão em `docs/README.md`.

- Antes de alterar código, leia os documentos indicados na tabela "Por onde começar" (`docs/README.md` §4).
- As regras por camada (rotas, controller/service/repository, banco, testes, docs) carregam sozinhas de `.claude/rules/` quando você mexe nos arquivos correspondentes.
- Pronto significa: `npm run test:unit:run`, `npm run build` e `npm run lint` passam, o checklist de `docs/README.md` §6 foi cumprido e o RAG foi atualizado (§5).
- Se o RAG divergir do código, o código prevalece; corrija o RAG.
- Problemas conhecidos estão em `docs/project/issues.md`; consulte antes de mexer em uma área afetada.
