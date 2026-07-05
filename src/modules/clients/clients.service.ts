import { ConflictError } from "@/shared/errors/ConflictError";
import { ClientsDTOs } from "./clients.dtos";
import { ClientsRepository } from "./clients.repository";
import { ErrorCode } from "@/shared/errors/ErrorCodes";

export class ClientsService{

    static async create(data: ClientsDTOs['CreateRequestDTO']): Promise<ClientsDTOs['CreateResponseDTO']>{
        const client = await ClientsRepository.searchClientByEmail(data.email)
        if (client) throw new ConflictError('Cliente já cadastrado.', ErrorCode.CLIENT_ALREADY_EXISTS)
        
        return {id: 1, createdAt: new Date, updatedAt: new Date, email: '', name: '', sellerId: 1, tellphone: ''}
    }

}