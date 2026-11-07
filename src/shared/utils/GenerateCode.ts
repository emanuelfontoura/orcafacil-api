import crypto from "crypto"

export function generateCode(){
    const code = crypto.randomInt(0, 1000000); // 0 até 999999
    return code.toString().padStart(6, "0");   // garante 6 dígitos
}