import UserService from '#services/user_service'
import WalletService from '#services/wallet_service'
import type { HttpContext } from '@adonisjs/core/http'
import { USSDMENUOPTIONS } from '../utils/constants.js'

export default class UssdsController {
  public async handleRequest({ request, response }: HttpContext) {
    let ussdResponse: string = 'Something went wrong.\n Please try again later.\n'
    let { sessionId, serviceCode, phoneNumber, text = '' } = request.body()
    console.log(sessionId, serviceCode, phoneNumber, text)
    // TODO prevent user from dialing like *123*1*1#
    if (!text) {
      ussdResponse = await this.mainMenu()
    } else {
      if (text.startsWith(USSDMENUOPTIONS.TRANSFER_FUNDS)) {
        const walletService = new WalletService()
        ussdResponse = await walletService.handleTransferFunds({
          sessionId,
          serviceCode,
          phoneNumber,
          text,
        })
      }
      if (text.startsWith(USSDMENUOPTIONS.CHECK_BALANCE)) {
        const walletService = new WalletService()
        ussdResponse = await walletService.handleCheckWalletBalance({
          sessionId,
          serviceCode,
          phoneNumber,
          text,
        })
      }
      if (text.startsWith(USSDMENUOPTIONS.GENERATE_WALLET_TOKEN)) {
        const walletService = new WalletService()
        ussdResponse = await walletService.handleGenerateWalletToken({
          sessionId,
          serviceCode,
          phoneNumber,
          text,
        })
      }
      if (text.startsWith(USSDMENUOPTIONS.GENERATE_VOUCHER)) {
        const walletService = new WalletService()
        ussdResponse = await walletService.handleGenerateVoucher({
          sessionId,
          serviceCode,
          phoneNumber,
          text,
        })
         
      }
      if (text.startsWith(USSDMENUOPTIONS.REDEEM_VOUCHER)) {
        const walletService = new WalletService()
        ussdResponse = await walletService.handleRedeemVoucher({
          sessionId,
          serviceCode,
          phoneNumber,
          text,
        })
      }
      if (text.startsWith(USSDMENUOPTIONS.REGISTER)) {
        const userService = new UserService()
        ussdResponse = await userService.createAccount({
          sessionId,
          serviceCode,
          phoneNumber,
          text,
        })
      }
      if (text.startsWith(USSDMENUOPTIONS.UNBLOCK_ACCOUNT)) {
        const userService = new UserService()
        ussdResponse = await userService.unlockAccount({
          sessionId,
          serviceCode,
          phoneNumber,
          text,
        })
      }
    }
    return ussdResponse
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
