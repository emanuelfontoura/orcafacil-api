import { ClientsRepository } from '@/modules/clients/clients.repository'
import { ClientsService } from '@/modules/clients/clients.service'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ErrorCode } from '@/shared/errors/ErrorCodes'
import { AppError } from '@/shared/errors/AppError'

vi.mock('@/modules/clients/clients.repository')

describe('Unit test - ClientsService - getById', () => {
    const clientId = 10
    const userId = 1

    const storedClient = {
        id: clientId,
        name: 'Cliente Teste',
        cnpjCpf: '12345678909',
        email: 'cliente@gmail.com',
        tellphone: '11999999999',
        userId,
        createdAt: new Date('2026-10-16T12:00:00.000Z'),
        updatedAt: new Date('2026-10-16T12:00:00.000Z')
    }

    beforeEach(() => {
        vi.clearAllMocks()

        vi.mocked(ClientsRepository.searchClientById).mockResolvedValue(storedClient)
    })

    it('deveria retornar o cliente encontrado', async () => {
        const result = await ClientsService.getById(clientId, userId)

        expect(result).toEqual(storedClient)
    })

    it('deveria buscar o cliente pelo id e pelo userId do usuário autenticado', async () => {
        await ClientsService.getById(clientId, userId)

        expect(ClientsRepository.searchClientById).toHaveBeenCalledWith(clientId, userId)
    })

    describe('erros de negócio', () => {
        it('deveria gerar NotFoundError caso o cliente não exista ou pertença a outro usuário', async () => {
            vi.mocked(ClientsRepository.searchClientById).mockResolvedValue(null)

            await expect(ClientsService.getById(clientId, userId)).rejects.toMatchObject({
                statusCode: 404,
                code: ErrorCode.INVALID_CLIENT
            })
        })
    })

    describe('erros de infraestrutura', () => {
        it('deveria propagar o AppError do repositório se a busca falhar', async () => {
            vi.mocked(ClientsRepository.searchClientById).mockRejectedValue(
                new AppError('Erro ao realizar busca de cliente pelo ID', 500, ErrorCode.INTERNAL_SERVER_ERROR)
            )

            await expect(ClientsService.getById(clientId, userId)).rejects.toMatchObject({
                statusCode: 500,
                code: ErrorCode.INTERNAL_SERVER_ERROR
            })
        })
    })
})
