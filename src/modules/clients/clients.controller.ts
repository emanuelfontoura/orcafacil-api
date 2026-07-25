import { Request, Response, NextFunction } from "express"
import { ClientsDTOs } from "./clients.dtos"
import { ApiResponse } from "@/shared/types/apiResponse"
import { ClientsService } from "./clients.service"

export class ClientsController{

    static async create(req: Request, res: Response<ApiResponse<ClientsDTOs['CreateResponseDTO']>>, next: NextFunction){
        const data: ClientsDTOs['CreateRequestDTO'] = req.body
        try{
            const dataClient = await ClientsService.create(data)
            res.status(200).json({
                success: true,
                data: dataClient
            })
        }catch(error){
            next(error)
        }
    }

    static async edit(req: Request, res: Response<ApiResponse<ClientsDTOs['']>>, next: NextFunction){

    }
}