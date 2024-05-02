interface IUSSDRequest {
  sessionId: string
  serviceCode: string
  phoneNumber: string
  text: string
}

interface IUserDto {
  firstName: string
  lastName: string
  phoneNumber: string
  email: string | null
  status: string
  password: string
  isAdministrator: boolean
  securityQuestions: string
}

interface ISecurityQuestion {
  question: string
  answer: string
}

interface IWalletDto {
  balance: number
  status: string
}

interface ILoginUserDto {
  pin: string
  phoneNumber: string
  sessionId: string
  serviceCode: string
}

interface IUnlockAccountDto extends IUSSDRequestConstantDto {
  answer: string
}

interface IUSSDRequestConstantDto {
  phoneNumber: string
  sessionId: string
  serviceCode: string
}
