import { prisma } from "@/lib/prisma";
import { AppError } from "@/shared/errors/AppError";
import { ErrorCode } from "@/shared/errors/ErrorCodes";

export class SellersRepository{

    static async searchSellerById(id: number){
        try{
            const seller = await prisma.seller.findUnique({where:{id}})
            return seller
        }catch{
            throw new AppError('Erro ao realizar busca de vendedor pelo ID', 500, ErrorCode.QUERY_DATABASE_ERROR)
        }
    }

}