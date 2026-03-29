import { ZodType } from "zod";
import { Request, Response, NextFunction } from 'express';

export function validateSchema(schema: ZodType<any>){
    return (req: Request, res: Response, next: NextFunction) => {
        try{
            req.body = schema.parse(req.body)
            next()
        }catch(error: any){
            next(error)
        }
    }
}