import User from '#models/user'
import Wallet from '#models/wallet'
import WalletToken from '#models/wallet_token'
import UserService from '#services/user_service'
import { customAlphabet, nanoid } from 'nanoid'
import { toCurrencyCase } from '../utils/common.js'
import { MENURESPONSE, WALLETRESPONSE, WALLETTOKEN } from '../utils/constants.js'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import { containsOnlyNumbers } from '../utils/validator.js'
export default class WalletService {
  response: string
  userService: UserService
  // initialize the response string to be returned
  constructor() {
    this.response = 'END Something went wrong.\n Please try again later.\n'
    this.userService = new UserService()
  }

  async handleTransferFunds(request: IUSSDRequest): Promise<string> {
    const user = await User.findBy('phoneNumber', request.phoneNumber)

    if (!user) {
      this.response = 'END You are not registered, Register to continue.'
      return this.response
    }
    const userInput = request.text.split('*')
    if (userInput.length === 1) {
      // 2. Ask for recipient's wallet ID
      this.response = "CON Enter recipient's wallet ID"
      return this.response
    }
    if (userInput.length === 2) {
      // 3. validate wallet token
      const providedWalletID = userInput[1]
      const tokenValidation = await this.validateWalletToken(providedWalletID, user)
      if (tokenValidation !== 'SUCCESS') {
        this.response = tokenValidation
        return this.response
      }
      // 4. Ask for amount to transfer
      this.response = 'CON Enter amount to transfer'
      return this.response
    }
    if (userInput.length === 3 || userInput.length === 4) {
      // START AUTHENTICATION PROCESS
      
      const loginResponse = await this.userService.loginUser({
        pin: userInput[3],
        phoneNumber: request.phoneNumber,
        sessionId: request.sessionId,
        serviceCode: request.serviceCode,
      })
      if (!loginResponse.startsWith('SUCCESS')) {
        this.response = loginResponse
        return this.response
      } else {
        // 5 start transfer between users

        const transferResponse = await this.transferFundsBetweenUsers(
          user,
          Number(userInput[2]),
          userInput[1],
          request.sessionId
        )
        if (transferResponse !== 'SUCCESS') {
          this.response = transferResponse
          return this.response
        } else {
          this.response = `${MENURESPONSE.END} Transfer of ${toCurrencyCase(Number(userInput[2]))} to wallet ID ${userInput[1]} was successful.`
          return this.response
        }
      }
    }
    return this.response
  }

  async handleGenerateVoucher(request: IUSSDRequest): Promise<string> {
    const user = await User.findBy('phoneNumber', request.phoneNumber)

    if (!user) {
      this.response = 'END You are not registered, Register to continue.'
      return this.response
    }
    const userWallet = await this.userService.getUserWallet(request.phoneNumber)
    if (!userWallet) {
      this.response = 'END You do not have a wallet\n. Please register to create one.'
      return this.response
    }
    
    const userInput = request.text.split('*')
    if (userInput.length === 1) {
      this.response = `CON Enter recipient's wallet ID`
      return this.response
    }
    if (userInput.length === 2) {
      // 3. validate wallet token
      const providedWalletID = userInput[1]

      const tokenValidation = await this.validateWalletToken(providedWalletID, user)
      if (tokenValidation !== 'SUCCESS') {
        this.response = tokenValidation
        return this.response
      }
      // 4. Ask for amount to transfer
      this.response = 'CON Enter amount to transfer'
      return this.response
    }
    if (userInput.length === 3|| userInput.length === 4) {
  
      // START AUTHENTICATION PROCESS      
      const loginResponse = await this.userService.loginUser
     ({
        pin: userInput[3],
        phoneNumber: request.phoneNumber,
        sessionId: request.sessionId,
        serviceCode: request.serviceCode,
      })
      if (!loginResponse.startsWith('SUCCESS')) {
        this.response = loginResponse
        return this.response
      } else {
        // TODO start transfer via 
        this.response = `END Your voucher token is ${this.generateVoucherToken()} valid for one transaction only and expires in 10 minutes.`
      }
    }

    return this.response
  }
  /**
   * Function to generate wallet token
   * @param request : IUSSDRequest
   * @returns : Promise<string>
   */
  async handleGenerateWalletToken(request: IUSSDRequest): Promise<string> {
    const userWallet = await this.userService.getUserWallet(request.phoneNumber)
    if (!userWallet) {
      this.response = 'END You do not have a wallet\n. Please register to create one.'
      return this.response
    }
    const token = this.generateWalletToken()
    const walletToken = await WalletToken.create({
      token,
      walletId: userWallet.id,
    })
    if (walletToken) {
      this.response = `END Your wallet token is ${token}, valid for one transaction only and expires in 10 minutes.`
      return this.response
    }

    return this.response
  }

  /**
   * @param request : IUSSDRequest
   * @returns : string
   */
  async handleCheckWalletBalance(request: IUSSDRequest): Promise<string> {
    const userWallet = await this.userService.getUserWallet(request.phoneNumber)
    if (!userWallet) {
      this.response = 'END You do not have a wallet\n. Please register to create one.'
      return this.response
    }
    const response = request.text.split('*')

    const loginResponse = await this.userService.loginUser({
      pin: response[1],
      phoneNumber: request.phoneNumber,
      sessionId: request.sessionId,
      serviceCode: request.serviceCode,
    })
    if (!loginResponse.startsWith('SUCCESS')) {
      this.response = loginResponse
      return this.response
    }
    this.response = `${MENURESPONSE.END} ${WALLETRESPONSE.BALLANCE_IS} ${toCurrencyCase(Number(userWallet.balance))}`
    return this.response
  }

  generateWalletToken(): string {
    const numbers = '0123456789'
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numberToken = customAlphabet(numbers, 8)
    const token = letters[Math.floor(Math.random() * letters.length)] + numberToken()
    return token
  }
  generateVoucherToken(): string {
    const numbers = '0123456789'
    const numberToken = customAlphabet(numbers, 12)
    const token = numberToken()
    return token
  }

  async createNewWallet(user: User, request: IWalletDto): Promise<Wallet> {
    const wallet = new Wallet()
    wallet.balance = request.balance
    wallet.userId = user.id
    await wallet.save()
    return wallet
  }
  async transferFundsBetweenUsers(
    user: User,
    amount: number,
    walletToken: string,
    session: string
  ): Promise<string> {
    // 0 check if user has enough balance
    const userWallet = await user.related('wallet').query().first()
    if ((userWallet?.balance || 0) < amount) {
      return 'END Insufficient funds. Please try again.'
    }
    const receiverWalletToken = await WalletToken.findBy('token', walletToken)
    const receiverWallet = await receiverWalletToken?.related('wallet').query().first()
    const receiver = await receiverWallet?.related('user').query().first()
    const transactionRef = nanoid(10)
    let transactionComplete = false
    // 1. Begin database transaction
    try {
      await db.transaction(async (trx) => {
        // 2. Deduct from sender
        userWallet?.useTransaction(trx)
        userWallet!.balance = Number(userWallet!.balance) - amount
        await userWallet?.save()
        // 3. Add transaction record for sender (within transaction)
        await user.related('transactions').create(
          {
            amount,
            ref: transactionRef,
            session,
            type: 'TRANSFER',
            status: 'DEBIT',
            senderId: user.id,
            receiverId: receiver?.id,
          },
          { client: trx }
        )
        // 4. Credit receiver
        receiverWallet?.useTransaction(trx)
        receiverWallet!.balance = Number(receiverWallet!.balance) + amount
        // receiverWallet!.$attributes.balance  = receiverWallet!.$attributes.balance + amount
        console.log('adding to receiver wallet', receiverWallet!.$attributes.balance, amount)
        console.log('receiver total amount should be', Number(receiverWallet!.balance) + amount)
        await receiverWallet?.save()
        // 6.5. Add transaction record for receiver (within transaction)
        await receiver?.related('transactions').create(
          {
            amount,
            ref: transactionRef,
            session,
            status: 'CREDIT',
            type: 'TRANSFER',
            senderId: user.id,
            receiverId: receiver?.id,
          },
          { client: trx }
        )
        // Transaction committed if code reaches here
        console.log('Transaction successful')
        transactionComplete = true
        return 'SUCCESS'
      })
    } catch (error) {
      // Transaction rolled back if any query throws an error
      console.error('Transaction failed:', error)
      return 'END Transaction failed with errors. Please try again.'
    }

    return transactionComplete ? 'SUCCESS' : 'END Transaction failed. Please try again.'
  }
  async validateWalletToken(token: string, user: User): Promise<string> {
    const walletToken = await WalletToken.findBy('token', token)
    if (!walletToken) {
      return 'END Invalid token. Please try again.'
    } else if (
      walletToken.status !== WALLETTOKEN.CREATED ||
      DateTime.fromISO(walletToken.$attributes.expires_at) < DateTime.now()
    ) {
      walletToken.status = WALLETTOKEN.EXPIRED as keyof typeof WALLETTOKEN
      await walletToken.save()
      return 'END Wallet ID has been used or expired. Please ask for a new one.'
    } else if ((await user.related('wallet').query().first())?.id === walletToken.walletId) {
      return 'END You cannot tranfer funds to your wallet. Please try again.'
    } else {
      return 'SUCCESS'
    }
  }
}
