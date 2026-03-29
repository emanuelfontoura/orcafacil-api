type ZodIssue = {
    field: string,
    message: string
}

export type ApiResponse<T> = { 
    success: true, data: T 
} | {
    success: false, error: string, code?: string, details?: ZodIssue[]
}