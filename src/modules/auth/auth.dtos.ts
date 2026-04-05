export interface AuthDTOs{
    ConfirmEmailRequestDTO: {
        email: string
        code: string
    }

    ConfirmEmailResponseDTO: {
        id: number
        email: string
        name: string
        createdAt: Date
    }

    VerifyEmailRequestDTO: {
        name: string
        email: string
        password: string
        confirmPassword: string
    }

    VerifyEmailResponseDTO: {
        email: string
        name: string
    }

    ResendEmailCodeDTO: {
        email: string
    }

    LoginTokensDTO: {
        accessToken: string,
        refreshToken: string
    }

    LoginRequestDTO: {
        email: string,
        password: string
    }

    RefreshTokensDTO: {
        accessToken: string,
        refreshToken: string
    }
}