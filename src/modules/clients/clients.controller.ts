import { Request, Response, NextFunction } from "express"
import { ClientsDTOs } from "./clients.dtos"
import { ApiResponse } from "@/shared/types/apiResponse"
import { ClientsService } from "./clients.service"
import { ClientsSchema } from "./clients.schema"

export class ClientsController{
    constructor(
        private readonly clientsService: ClientsService
    ){}


    async create(req: Request, res: Response<ApiResponse<ClientsDTOs['CreateResponseDTO']>>, next: NextFunction){
        const data: ClientsDTOs['CreateRequestDTO'] = req.body
        try{
            const dataClient = await this.clientsService.create(data)
            return res.status(200).json({
                success: true,
                data: dataClient
            })
        }catch(error){
            next(error)
        }
    }

    async edit(req: Request, res: Response<ApiResponse<ClientsDTOs['EditResponseDTO']>>, next: NextFunction){
        const data: ClientsDTOs['EditRequestDTO'] = req.body
        const { id } = req.params
        try{
            const dataClientEdited = await this.clientsService.edit(Number(id), Number(req.user), data)
            return res.status(200).json({
                success: true,
                data: dataClientEdited
            })
        }catch(error){
            next(error)
        }
    }

    async delete(req: Request, res: Response<ApiResponse<ClientsDTOs['DeleteResponseDTO']>>, next: NextFunction){
        try{
            const { id } = req.params
            const deletedClient = await this.clientsService.delete(Number(id), Number(req.user))
            return res.status(200).json({
                success: true,
                data: deletedClient
            })
        }catch(error){
            next(error)
        }
    }

    async getAll(req: Request, res: Response<ApiResponse<ClientsDTOs['GetAllResponseDTO'][]>>, next: NextFunction){
        try{
            const userId = req.user
            const filters = ClientsSchema.getAllQuery.parse(req.query)
            const filteredClients = await this.clientsService.getAll(Number(userId), filters)
            return res.status(200).json({
                success: true,
                data: filteredClients
            })
        }catch(error){
            next(error)
        }
    }

    async getById(req: Request, res: Response<ApiResponse<ClientsDTOs['GetByIdResponseDTO']>>, next: NextFunction){
        try{
            const { id } = req.params
            const filteredClient = await this.clientsService.getById(Number(id), Number(req.user))
            return res.status(200).json({
                success: true,
                data: filteredClient
            })
        }catch(error){
            next(error)
        }
    }
}