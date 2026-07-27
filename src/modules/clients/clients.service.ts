import { ConflictError } from "@/shared/errors/ConflictError";
import { ClientsDTOs } from "./clients.dtos";
import { ClientsRepository } from "./clients.repository";
import { ErrorCode } from "@/shared/errors/ErrorCodes";
import { SellersRepository } from "../sellers/sellers.repository";
import { UserRepository } from "../user/user.repository";

export class ClientsService{

    static async create(data: ClientsDTOs['CreateRequestDTO']): Promise<ClientsDTOs['CreateResponseDTO']>{
        const oldClient = await ClientsRepository.searchClientByCnpjCpf(data.cnpjCpf, data.userId)
        if (oldClient) throw new ConflictError('Cliente já cadastrado.', ErrorCode.CLIENT_ALREADY_EXISTS)
        
        if(data.sellerId){
            if(! await SellersRepository.searchSellerById(data.sellerId)){
                throw new ConflictError('Vendedor não encontrado', ErrorCode.SELLER_NOT_EXISTS)
            }
        }

        const newClient = await ClientsRepository.create(data)

        return newClient
    }

    static async edit(id: number, data: ClientsDTOs['EditRequestDTO']): Promise<ClientsDTOs['EditResponseDTO']>{

        const user = await UserRepository.findById(data.userId)
        if(!user){
            throw new ConflictError('Usuário inválido.', ErrorCode.INVALID_USER)
        }

        if (data.cnpjCpf){
            const oldClient = await ClientsRepository.searchClientByCnpjCpf(data.cnpjCpf, data.userId)
            if (oldClient){
                throw new ConflictError('Cliente já cadastrado', ErrorCode.CLIENT_ALREADY_EXISTS)
            }
        }

        if(data.sellerId){
            if(! await SellersRepository.searchSellerById(data.sellerId)){
                throw new ConflictError('Vendedor não encontrado', ErrorCode.SELLER_NOT_EXISTS)
            }
        }

        const editedClient = await ClientsRepository.edit(id, data)

        return editedClient
    }

}