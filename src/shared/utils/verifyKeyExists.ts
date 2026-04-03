import { redis } from "../../lib/redis";
import { AppError } from "../errors/AppError";
import { ErrorCode } from "../errors/ErrorCodes";

export async function verifyKeyExists(key: string): Promise<boolean>{
    try{
        const exists = await redis.exists(key)
        if(exists) return true
        return false
    }catch(error){
        throw new AppError('Erro ao verificar existência da chave do email', 500, ErrorCode.REDIS_SAVE_ERROR)
    }
}