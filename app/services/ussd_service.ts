import { USSDMENUOPTIONS } from '../utils/constants.js'
import UserService from '#services/user_service'
import WalletService from '#services/wallet_service'

export default class USSDService {
  ussdResponse: string
  walletService: WalletService
  userService: UserService

  constructor() {
    this.ussdResponse = 'Something went wrong.\n Please try again later.\n'
    this.walletService = new WalletService()
    this.userService = new UserService()
  }
  public async handleUSSDRequests({
    sessionId,
    serviceCode,
    phoneNumber,
    text = '',
  }: IUSSDRequest) {
    console.log(sessionId, serviceCode, phoneNumber, text)
    // TODO prevent user from dialing like *123*1*1#
    if (!text) {
      this.ussdResponse = await this.mainMenu()
    } else {
      if (text.startsWith(USSDMENUOPTIONS.TRANSFER_FUNDS)) {
        this.ussdResponse = await this.walletService.handleTransferFunds({
          sessionId,
          serviceCode,
          phoneNumber,
          text,
        })
      }
      if (text.startsWith(USSDMENUOPTIONS.CHECK_BALANCE)) {
        this.ussdResponse = await this.walletService.handleCheckWalletBalance({
          sessionId,
          serviceCode,
          phoneNumber,
          text,
        })
      }
      if (text.startsWith(USSDMENUOPTIONS.GENERATE_WALLET_TOKEN)) {
        this.ussdResponse = await this.walletService.handleGenerateWalletToken({
          sessionId,
          serviceCode,
          phoneNumber,
          text,
        })
      }
      if (text.startsWith(USSDMENUOPTIONS.GENERATE_VOUCHER)) {
        this.ussdResponse = await this.walletService.handleGenerateVoucher({
          sessionId,
          serviceCode,
          phoneNumber,
          text,
        })
      }
      if (text.startsWith(USSDMENUOPTIONS.REDEEM_VOUCHER)) {
        this.ussdResponse = await this.walletService.handleRedeemVoucher({
          sessionId,
          serviceCode,
          phoneNumber,
          text,
        })
      }
      if (text.startsWith(USSDMENUOPTIONS.REGISTER)) {
        this.ussdResponse = await this.userService.createAccount({
          sessionId,
          serviceCode,
          phoneNumber,
          text,
        })
      }
       
    }

    return this.ussdResponse
  }

  async mainMenu() {
    let menuResponse = 'CON What would you like to do?\n'
    menuResponse += '1. Transfer Funds\n'
    menuResponse += '2. Check Balance\n'
    menuResponse += '3. Generate Wallet ID\n'
    menuResponse += '4. Generate Voucher\n'
    menuResponse += '5. Redeem Voucher\n'
    menuResponse += '6. Create Account\n'
    return menuResponse
  }
}
