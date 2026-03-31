import { OpenAPIV3 } from "openapi-types"

const swaggerDocument: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: {
        title: 'OrçaFácil API',
        version: '1.0.0',
        description: 'Documentação da API OrçaFácil'
    },
    tags: [
        {
            name: 'Auth',
            description: 'Autenticação de usuários'
        }
    ],
    servers: [
        {
            url: 'http://localhost:3000'
        }
    ],
    paths: {
        '/user/auth/email/verify': {
            post: {
                summary: 'Verificação do email do usuário',
                description: 'Enviar ao email do usuário um código de verificação',
                tags: ['Auth'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    email: {type: 'string', format: 'email', example: 'usuario@gmail.com', maxLength: 255},
                                    name: {type: 'string', example: 'Usuario Name', maxLength: 100, minLength: 1},
                                    password: {type: 'string', example: '123456', minLength: 6},
                                    confirmPassword: {type: 'string', example: '123456', minLength: 6, description: 'Deve ser igual a "password"'}
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Sucesso'
                    },
                    '400': {
                        description: 'Erro'
                    }
                }
            }
        }
    }
}

export default swaggerDocument