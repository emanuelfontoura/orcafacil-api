import { ClientsRepository } from '@/modules/clients/clients.repository'
import { ClientsService } from '@/modules/clients/clients.service'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ErrorCode } from '@/shared/errors/ErrorCodes'
import { AppError } from '@/shared/errors/AppError'

vi.mock('@/modules/clients/clients.repository')

describe('Unit test - ClientsService - edit', () => {
    const clientId = 10
    const userId = 1

    const defaultData = {
        name: 'Cliente Editado',
        cnpjCpf: '12345678909'
    }

    const storedClient = {
        id: clientId,
        name: 'Cliente Teste',
        cnpjCpf: '98765432100',
        email: 'cliente@gmail.com',
        tellphone: '11999999999',
        userId,
        createdAt: new Date('2026-10-16T12:00:00.000Z'),
        updatedAt: new Date('2026-10-16T12:00:00.000Z')
    }

    const editedClient = { ...storedClient, ...defaultData }

    beforeEach(() => {
        vi.clearAllMocks()

        vi.mocked(ClientsRepository.searchClientById).mockResolvedValue(storedClient)
        vi.mocked(ClientsRepository.searchClientByCnpjCpf).mockResolvedValue(null)
        vi.mocked(ClientsRepository.edit).mockResolvedValue(editedClient)
    })

    it('deveria editar o cliente e retornar os dados atualizados', async () => {
        const result = await ClientsService.edit(clientId, userId, defaultData)

        expect(result).toEqual(editedClient)
    })

    it('deveria buscar o cliente pelo id e pelo userId do usuário autenticado', async () => {
        await ClientsService.edit(clientId, userId, defaultData)

        expect(ClientsRepository.searchClientById).toHaveBeenCalledWith(clientId, userId)
    })

    it('deveria verificar duplicidade do CPF/CNPJ apenas entre os clientes do usuário', async () => {
        await ClientsService.edit(clientId, userId, defaultData)

        expect(ClientsRepository.searchClientByCnpjCpf).toHaveBeenCalledWith(defaultData.cnpjCpf, userId)
    })

    it('não deveria verificar duplicidade quando o CPF/CNPJ não for enviado', async () => {
        await ClientsService.edit(clientId, userId, { name: 'Cliente Editado' })

        expect(ClientsRepository.searchClientByCnpjCpf).not.toHaveBeenCalled()
    })

    it('deveria permitir reenviar o próprio CPF/CNPJ do cliente', async () => {
        vi.mocked(ClientsRepository.searchClientByCnpjCpf).mockResolvedValue(storedClient)

        await expect(ClientsService.edit(clientId, userId, defaultData)).resolves.toEqual(editedClient)
    })

    it('deveria editar o cliente filtrando pelo id e pelo userId', async () => {
        await ClientsService.edit(clientId, userId, defaultData)

        expect(ClientsRepository.edit).toHaveBeenCalledWith(clientId, userId, defaultData)
    })

    describe('erros de negócio', () => {
        it('deveria gerar NotFoundError caso o cliente não exista ou pertença a outro usuário', async () => {
            vi.mocked(ClientsRepository.searchClientById).mockResolvedValue(null)

            await expect(ClientsService.edit(clientId, userId, defaultData)).rejects.toMatchObject({
                statusCode: 404,
                code: ErrorCode.INVALID_CLIENT
            })

            expect(ClientsRepository.edit).not.toHaveBeenCalled()
        })

        it('deveria gerar ConflictError caso o CPF/CNPJ pertença a outro cliente do usuário', async () => {
            vi.mocked(ClientsRepository.searchClientByCnpjCpf).mockResolvedValue({ ...storedClient, id: 99 })

            await expect(ClientsService.edit(clientId, userId, defaultData)).rejects.toMatchObject({
                statusCode: 409,
                code: ErrorCode.CLIENT_ALREADY_EXISTS
            })

            expect(ClientsRepository.edit).not.toHaveBeenCalled()
        })
    })

    describe('erros de infraestrutura', () => {
        it('deveria propagar o AppError do repositório se a busca do cliente falhar', async () => {
            vi.mocked(ClientsRepository.searchClientById).mockRejectedValue(
                new AppError('Erro ao realizar busca de cliente pelo ID', 500, ErrorCode.INTERNAL_SERVER_ERROR)
            )

            await expect(ClientsService.edit(clientId, userId, defaultData)).rejects.toMatchObject({
                statusCode: 500,
                code: ErrorCode.INTERNAL_SERVER_ERROR
            })

            expect(ClientsRepository.edit).not.toHaveBeenCalled()
        })

        it('deveria propagar o AppError do repositório se a edição falhar', async () => {
            vi.mocked(ClientsRepository.edit).mockRejectedValue(
                new AppError('Erro interno do servidor.', 500, ErrorCode.INTERNAL_SERVER_ERROR)
            )

            await expect(ClientsService.edit(clientId, userId, defaultData)).rejects.toMatchObject({
                statusCode: 500,
                code: ErrorCode.INTERNAL_SERVER_ERROR
            })
        })
    })
})
