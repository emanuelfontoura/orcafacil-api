import argon2 from "argon2"
import "dotenv/config"

const argonConfigHash = {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1
}

const PEPPER = process.env.PEPPER

export class ArgonHash{
    static async argonHash(valueToHash: string): Promise<string>{
        const hashedValue = await argon2.hash(valueToHash + PEPPER, argonConfigHash)
        return hashedValue
    }

    static async argonVerify(hashedValue: string, normalValue: string): Promise<boolean>{
        const matchValues = await argon2.verify(hashedValue, normalValue + PEPPER)
        return matchValues
    }

    static async argonRehash(normalValue: string, hashedValue: string): Promise<string | null>{
        if(!argon2.needsRehash(hashedValue)) return null
        return await this.argonHash(normalValue)
    }
}