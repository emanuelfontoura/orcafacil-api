<div align="center">
  <h1>💰 OrçaFácil API</h1>
  
  <p><em>Sistema inteligente para gestão de orçamentos</em></p>
  
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)]()
  [![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)]()
  [![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)]()
  [![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)]()
  [![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)]()
</div>

## 📖 Sobre o Projeto

O **OrçaFácil** é uma API projetada para agilizar e organizar o processo de criação de orçamentos, facilitando o gerenciamento contínuo de clientes e o acompanhamento de vendas.

</br>

## 🚀 Tecnologias

### Stack Principal
- **[Node.js](https://nodejs.org/)** & **[TypeScript](https://www.typescriptlang.org/)**
- **[Express](https://expressjs.com/)** - Framework web rápido e minimalista
- **[Prisma ORM](https://www.prisma.io/)** - ORM para interações com o banco de dados
- **[Zod](https://zod.dev/)** - Validação de esquemas integradas ao TypeScript
- **[Redis](https://redis.io/)** & **[ioredis](https://github.com/redis/ioredis)** - Armazenamento de cache em memória
- **[Docker](https://www.docker.com/)** - Gerenciamento de ambientes
- **[Vitest](https://vitest.dev/)** - Testes automatizados
- **[Nodemailer](https://nodemailer.com/)** - Envio de emails
- **[JWT](https://jwt.io/) / [Argon2](https://www.npmjs.com/package/argon2)** - Segurança e autenticação
- **Entre outros...**

</br>

## 🏠 Arquitetura
- **Arquitetura em Camadas (Layered Architecture):** Separação clara de responsabilidades (route, controller, service e repository) para garantir que o código seja testável, escalável e de fácil manutenção.

</br>

## 📋 Testes unitários
- O projeto possui uma suíte de testes unitários para validar as principais regras de negócio. Testes de integração e E2E não foram incluídos nesta versão para manter o ambiente de desenvolvimento e a pipeline mais simples.

</br>

## 📚 Documentação
A documentação completa e detalhada da API está disponível via Postman:</br>

https://documenter.getpostman.com/view/53399164/2sBXqDsiVE

</br>

## ⚙️ Como Executar Localmente

### Pré-requisitos

Certifique-se de ter instalado em sua máquina:
- [Node.js](https://nodejs.org/) (v16 ou superior)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/) rodando localmente ou em nuvem
- **OPCIONAL** [Docker](https://www.docker.com/) caso deseje executar o código via Docker

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
4.1. Crie um arquivo `.env.dev` na raiz do projeto contendo as seguintes chaves básicas:

```env
# Banco de dados
DATABASE_URL="postgresql://user:password@localhost:5432/orcafacil"
DATABASE_USER="user"
DATABASE_PASSWORD=password
DATABASE_NAME="orcafacil"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Email (para o Nodemailer)
USER_EMAIL="email@gmail.com"
USER_PASSWORD="senha_de_app"

# PEPPER para o Argon2
PEPPER=gere_um_valor_aleatorio

# JWT Secret Key
JWT_ACCESS_SECRET=gere_uma_chave_secreta_para_access_token
JWT_REFRESH_SECRET=gere_uma_chave_secreta_para_refresh_token
```

4.2. (Opcional) Crie um arquivo `.env.test` na raiz do projeto contendo as seguintes chaves básicas:

```env
# Banco de dados
DATABASE_URL="postgresql://user:password@localhost:5432/orcafacil"
DATABASE_USER="user"
DATABASE_PASSWORD=password
DATABASE_NAME="orcafacil"

# Redis access
REDIS_HOST=localhost
REDIS_PORT=6379
```

5. Execute as migrações do banco de dados para criar as tabelas (Obs: é necessário que o Redis e o PostgreSQL estejam em execução):
```bash
npx prisma migrate dev
```

6. Inicie a aplicação em modo de desenvolvimento (ambiente local):
```bash
npm run dev
```

</br>

## 📜 Scripts

| Comando | Descrição |
|---------|-----------|
| npm run dev | Inicia a API em modo de desenvolvimento |
| npm run test:unit:run | Executa apenas os testes unitários sem Docker |
| npm run lint | Executa o ESLint |
| npm run build | Compila a aplicação |
| npm dev:docker:run | Cria o ambiente de dev no Docker e inicia a API |
| npm test:docker:unit | Cria o ambiente de teste no Docker e executa os testes unitários |

<br/>

*As requisições para a API poderão ser feitas no endereço local (ex: `http://localhost:3000`).*

</br>

## 📝 Licença
Distribuído sob a licença **ISC**.

---

<div align="center">
  Desenvolvido por <a href="https://github.com/emanuelfontoura">Emanuel Fontoura</a>
</div>
