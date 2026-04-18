<div align="center">
  <h1>💰 OrçaFácil API</br>
    (em desenvolvimento)
  </h1>
  
  <p><em>Sistema inteligente para gestão de orçamentos</em></p>
  
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)]()
  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)]()
  [![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)]()
  [![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)]()
  [![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)]()
</div>

<p align="center"><strong>Desenvolvido sem uso de de vibecoding ou nocoding</strong></p> 

## 📖 Sobre o Projeto

O **OrçaFácil** é uma API projetada para agilizar e organizar o processo de criação de orçamentos, facilitando o gerenciamento contínuo de clientes e o acompanhamento de vendas. Com uma arquitetura moderna, garante segurança, escalabilidade e performance no controle das operações comerciais.

</br>

## 🚀 Tecnologias

### Stack Principal
- **[Node.js](https://nodejs.org/)** & **[TypeScript](https://www.typescriptlang.org/)**
- **[Express](https://expressjs.com/)** - Framework web rápido e minimalista
- **[Prisma ORM](https://www.prisma.io/)** - ORM para interações seguras e tipadas com o banco de dados
- **[Zod](https://zod.dev/)** - Declaração e validação de esquemas integradas ao TypeScript
- **[Redis](https://redis.io/)** & **[ioredis](https://github.com/redis/ioredis)** - Armazenamento de cache em memória
- **[Nodemailer](https://nodemailer.com/)** - Envio de emails e transações
- **[JWT](https://jwt.io/) / [Bcrypt](https://www.npmjs.com/package/bcrypt)** - Segurança e autenticação
- **Entre outros...**

</br>

## 🏠 Arquitetura
- **Arquitetura em Camadas (Layered Architecture):** Separação clara de responsabilidades (route, controller, service e repository) para garantir que o código seja testável, escalável e de fácil manutenção.

</br>

## 📚 Documentação
A documentação detalhada da API está disponível via Postman:</br>

https://documenter.getpostman.com/view/53399164/2sBXqDsiVE

Em breve documentação será migrada para Swagger. O objetivo é criar uma API auto-documentável com Express + Zod.

</br>

## ⚙️ Como Executar Localmente

### Pré-requisitos

Certifique-se de ter instalado em sua máquina:
- [Node.js](https://nodejs.org/) (v16 ou superior)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/) ou [pnpm](https://pnpm.io/)
- Um banco de dados relacional (ex: PostgreSQL ou MySQL)
- Servidor [Redis](https://redis.io/) rodando localmente ou em nuvem

### Configuração do Ambiente

1. Faça o clone do repositório:
```bash
git clone https://github.com/emanuelfontoura/orcafacil-api.git
```

2. Acesse a pasta do projeto:
```bash
cd orcafacil-api
```

3. Instale as dependências:
```bash
npm install
```

4. Configure as Variáveis de Ambiente:
Crie um arquivo `.env` na raiz do projeto contendo as seguintes chaves básicas:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/orcafacil"
# ou mysql://user:password@localhost:3306/orcafacil

REDIS_URL="redis://localhost:6379"
JWT_SECRET="sua_chave_secreta"
```

5. Execute as migrações do banco de dados para criar as tabelas:
```bash
npx prisma migrate dev
```

6. Inicie a aplicação em modo de desenvolvimento:
```bash
npm run dev
```

<br/>

*As requisições para a API poderão ser feitas no endereço local (ex: `http://localhost:3000`).*

</br>

## 📝 Licença
Distribuído sob a licença **ISC**.

---

<div align="center">
  Desenvolvido com ❤️ por <a href="https://github.com/emanuelfontoura">Emanuel Fontoura</a>
</div>
