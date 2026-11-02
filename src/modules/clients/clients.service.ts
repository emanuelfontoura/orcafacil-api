import { ConflictError } from "@/shared/errors/ConflictError";
import { ClientsDTOs } from "./clients.dtos";
import { ClientsRepository } from "./clients.repository";
import { ErrorCode } from "@/shared/errors/ErrorCodes";
import { NotFoundError } from "@/shared/errors/NotFoundError";

export class ClientsService{
    constructor(
        private readonly ClientsRepository: ClientsRepository
    ){}


    async create(data: ClientsDTOs['CreateRequestDTO']): Promise<ClientsDTOs['CreateResponseDTO']>{
        const oldClient = await this.ClientsRepository.searchClientByCnpjCpf(data.cnpjCpf, data.userId)
        if (oldClient) throw new ConflictError('Cliente já cadastrado.', ErrorCode.CLIENT_ALREADY_EXISTS)

        const newClient = await this.ClientsRepository.create(data)

        return newClient
    }

    async edit(id: number, userId: number, data: ClientsDTOs['EditRequestDTO']): Promise<ClientsDTOs['EditResponseDTO']>{
        const client = await this.ClientsRepository.searchClientById(id, userId)
        if (!client) throw new NotFoundError('Cliente não encontrado.', ErrorCode.INVALID_CLIENT)

        if (data.cnpjCpf){
            const oldClient = await this.ClientsRepository.searchClientByCnpjCpf(data.cnpjCpf, userId)
            if (oldClient && oldClient.id !== id){
                throw new ConflictError('Cliente já cadastrado.', ErrorCode.CLIENT_ALREADY_EXISTS)
            }
        }

        const editedClient = await this.ClientsRepository.edit(id, userId, data)

        return editedClient
    }

    async delete(id: number, userId: number): Promise<ClientsDTOs['DeleteResponseDTO']>{
        const client = await this.ClientsRepository.searchClientById(id, userId)
        if (!client) throw new NotFoundError('Cliente não encontrado.', ErrorCode.INVALID_CLIENT)
        const deletedClient = await this.ClientsRepository.delete(id, userId)
        return deletedClient
    }

    async getAll(userId: number, filters?: ClientsDTOs['GetAllQueryDTO']): Promise<ClientsDTOs['GetAllResponseDTO'][]>{
        const filteredClients = await this.ClientsRepository.getAll(userId, filters)
        return filteredClients
    }

    async getById(id: number, userId: number): Promise<ClientsDTOs['GetByIdResponseDTO']>{
        const client = await this.ClientsRepository.searchClientById(id, userId)
        if(!client) throw new NotFoundError('Cliente não encontrado.', ErrorCode.INVALID_CLIENT)
        return client
    }

}