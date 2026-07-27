import {cpf, cnpj} from 'cpf-cnpj-validator'

export function isValidCnpjCpf(cnpjcpf: string): boolean{
    const cnpjCpfFormated = cnpjcpf.replace(/\D/g, '')

    if (cnpjCpfFormated.length !== 11 && cnpjCpfFormated.length !== 14){
        return false
    }

    if (cnpjCpfFormated.length === 11){
        return cpf.isValid(cnpjCpfFormated)
    }else{
        return cnpj.isValid(cnpjCpfFormated)
    }
}