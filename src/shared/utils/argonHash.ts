import argon2 from "argon2"
import "dotenv/config"
import { AppError } from "@/shared/errors/AppError"
import { ErrorCode } from "@/shared/errors/ErrorCodes"

const argonConfigHash = {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1
}

const PEPPER = process.env.PEPPER

export class ArgonHash{
    static async argonHash(value: string): Promise<string>{
        let hashedValue
        try{
            hashedValue = await argon2.hash(value + PEPPER, argonConfigHash)
        }catch(error){
            throw new AppError('Ocorreu um erro ao realizar a criptografia da senha', 500, ErrorCode.INTERNAL_HASH_ERROR)
        }
        return hashedValue
    }

    static async argonVerify(value1: string, value2: string): Promise<boolean>{
        let matchValues
        try{
            matchValues = await argon2.verify(value1, value2 + PEPPER)
        }catch(error){
            throw new AppError('Ocorreu um erro ao validar credenciais de senha', 500, ErrorCode.INTERNAL_HASH_ERROR)
        }
        return matchValues
    }
}