import argon2 from "argon2"

export class ArgonHash{

    private argonConfigHash: argon2.Options = {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1
    }
    private PEPPER: string = process.env.PEPPER!

    async hash(valueToHash: string): Promise<string>{
        const hashedValue = await argon2.hash(valueToHash + this.PEPPER, this.argonConfigHash)
        return hashedValue
    }

    async verify(hashedValue: string, normalValue: string): Promise<boolean>{
        const matchValues = await argon2.verify(hashedValue, normalValue + this.PEPPER)
        return matchValues
    }

    async rehash(normalValue: string, hashedValue: string): Promise<string | null>{
        if(!argon2.needsRehash(hashedValue, this.argonConfigHash)) return null
        return await this.hash(normalValue)
    }
}