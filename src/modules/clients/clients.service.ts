import { ClientsDTOs } from "./clients.dtos";

export class ClientsService{

    static async create(data: ClientsDTOs['CreateRequestDTO']): Promise<ClientsDTOs['CreateResponseDTO']>{
        

        return {}
    }

}