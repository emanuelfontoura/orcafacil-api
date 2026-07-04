import argon2 from "argon2"
import "dotenv/config"
import { env } from "@/config/env"

export class ArgonHash{

    private static argonConfigHash: argon2.Options = {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1
    }

    private static PEPPER: string = env.PEPPER

    static async argonHash(valueToHash: string): Promise<string>{
        const hashedValue = await argon2.hash(valueToHash + this.PEPPER, this.argonConfigHash)
        return hashedValue
    }

    static async argonVerify(hashedValue: string, normalValue: string): Promise<boolean>{
        const matchValues = await argon2.verify(hashedValue, normalValue + this.PEPPER)
        return matchValues
    }

    static async argonRehash(normalValue: string, hashedValue: string): Promise<string | null>{
        if(!argon2.needsRehash(hashedValue, this.argonConfigHash)) return null
        return await this.argonHash(normalValue)
    }
}