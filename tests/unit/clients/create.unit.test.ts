import { ClientsRepository } from '@/modules/clients/clients.repository'
import { ClientsService } from '@/modules/clients/clients.service'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ErrorCode } from '@/shared/errors/ErrorCodes'
import { AppError } from '@/shared/errors/AppError'

vi.mock('@/modules/clients/clients.repository')

describe('Unit test - ClientsService - create', () => {
    const defaultData = {
        name: 'Cliente Teste',
        cnpjCpf: '12345678909',
        email: 'cliente@gmail.com',
        tellphone: '11999999999',
        userId: 1
    }

    const createdClient = {
        id: 10,
        ...defaultData,
        createdAt: new Date('2026-10-16T12:00:00.000Z'),
        updatedAt: new Date('2026-10-16T12:00:00.000Z')
    }

    beforeEach(() => {
        vi.clearAllMocks()

        vi.mocked(ClientsRepository.searchClientByCnpjCpf).mockResolvedValue(null)
        vi.mocked(ClientsRepository.create).mockResolvedValue(createdClient)
    })

    it('deveria criar o cliente e retornar os dados cadastrados', async () => {
        const result = await ClientsService.create(defaultData)

        expect(result).toEqual(createdClient)
    })

    it('deveria verificar duplicidade do CPF/CNPJ apenas entre os clientes do usuário', async () => {
        await ClientsService.create(defaultData)

        expect(ClientsRepository.searchClientByCnpjCpf).toHaveBeenCalledWith(defaultData.cnpjCpf, defaultData.userId)
    })

    it('deveria criar o cliente vinculado ao userId recebido', async () => {
        await ClientsService.create(defaultData)

        expect(ClientsRepository.create).toHaveBeenCalledWith(defaultData)
    })

    describe('erros de negócio', () => {
        it('deveria gerar ConflictError caso o CPF/CNPJ já esteja cadastrado para o usuário', async () => {
            vi.mocked(ClientsRepository.searchClientByCnpjCpf).mockResolvedValue(createdClient)

            await expect(ClientsService.create(defaultData)).rejects.toMatchObject({
                statusCode: 409,
                code: ErrorCode.CLIENT_ALREADY_EXISTS
            })

            expect(ClientsRepository.create).not.toHaveBeenCalled()
        })
    })

    describe('erros de infraestrutura', () => {
        it('deveria propagar o AppError do repositório se a criação falhar', async () => {
            vi.mocked(ClientsRepository.create).mockRejectedValue(
                new AppError('Erro ao cadastrar o cliente', 500, ErrorCode.INTERNAL_SERVER_ERROR)
            )

            await expect(ClientsService.create(defaultData)).rejects.toMatchObject({
                statusCode: 500,
                code: ErrorCode.INTERNAL_SERVER_ERROR
            })
        })
    })
})
