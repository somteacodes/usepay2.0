import User from '#models/user'
import Wallet from '#models/wallet'
import WalletToken from '#models/wallet_token'
import UserService from '#services/user_service'
import { customAlphabet, nanoid } from 'nanoid'
import { toCurrencyCase } from '../utils/common.js'
import { MENURESPONSE, VOUCHER, WALLETRESPONSE, WALLETTOKEN } from '../utils/constants.js'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Voucher from '#models/voucher'
import { containsOnlyNumbers } from '../utils/validator.js'
import AuthService from './auth_service.js'
import redis from '@adonisjs/redis/services/main'
export default class WalletService {
  response: string

  // initialize the response string to be returned
  constructor() {
    this.response = 'END Something went wrong.\n Please try again later.\n'
  }

  async handleTransferFunds(request: IUSSDRequest): Promise<string> {
    const user = await User.findBy('phoneNumber', request.phoneNumber)
    let extraCheck = (await redis.get(`extraCheck-${request.phoneNumber}`)) || 0
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
    if (userInput.length === 3 || userInput.length === 4 || extraCheck == 1) {
      // validate amount
      if (!containsOnlyNumbers(userInput[2])) {
        this.response = 'END Invalid amount. Please try again.'
        return this.response
      }
      if (Number(userInput[2]) >= 50000) {
        await redis.set(`extraCheck-${request.phoneNumber}`, 1)
      } else {
        await redis.del(`extraCheck-${request.phoneNumber}`)
      }
      // START AUTHENTICATION PROCESS
      const extraCheckResponse = userInput.length === 5 ? userInput[4] : ''
      const loginResponse = await new AuthService().loginUser(
        {
          pin: userInput[3],
          phoneNumber: request.phoneNumber,
          sessionId: request.sessionId,
          serviceCode: request.serviceCode,
        },
        extraCheck == 1 ? true : false,
        extraCheckResponse
      )
      if (!loginResponse.startsWith('SUCCESS')) {
        this.response = loginResponse
        return this.response
      } else {
        // 5 start transfer between users
        // reset extra check
        if (extraCheck == 1) {
          await redis.del(`extraCheck-${request.phoneNumber}`)
        }
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
    let extraCheck = (await redis.get(`extraCheck-${request.phoneNumber}`)) || 0

    if (!user) {
      this.response = 'END You are not registered, Register to continue.'
      return this.response
    }
    const userWallet = await new UserService().getUserWallet(request.phoneNumber)
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
    if (userInput.length === 3 || userInput.length === 4 || extraCheck == 1) {
      // validate amount
      if (!containsOnlyNumbers(userInput[2])) {
        this.response = 'END Invalid amount. Please try again.'
        return this.response
      }
      if (Number(userInput[2]) >= 50000) {
        await redis.set(`extraCheck-${request.phoneNumber}`, 1)
      } else {
        await redis.del(`extraCheck-${request.phoneNumber}`)
      }
      const extraCheckResponse = userInput.length === 5 ? userInput[4] : ''
      // START AUTHENTICATION PROCESS
      const loginResponse = await new AuthService().loginUser(
        {
          pin: userInput[3],
          phoneNumber: request.phoneNumber,
          sessionId: request.sessionId,
          serviceCode: request.serviceCode,
        },
        extraCheck == 1 ? true : false,
        extraCheckResponse
      )
      if (!loginResponse.startsWith('SUCCESS')) {
        this.response = loginResponse
        return this.response
      } else {
        // TODO voucher generation
        const voucherToken = this.generateVoucherToken()
        const voucherReponse = await this.transferFundsWithVoucher(
          user,
          Number(userInput[2]),
          userInput[1],
          request.sessionId,
          voucherToken
        )
        if (voucherReponse !== 'SUCCESS') {
          this.response = voucherReponse
          return this.response
        } else {
          this.response = `END Voucher of ${toCurrencyCase(Number(userInput[2]))} has been created successfully. Voucher code is ${voucherToken}`
          return this.response
        }
      }
    }

    return this.response
  }

  async handleRedeemVoucher(request: IUSSDRequest): Promise<string> {
    const user = await User.findBy('phoneNumber', request.phoneNumber)

    if (!user) {
      this.response = 'END You are not registered, Register to continue.'
      return this.response
    }
    const userWallet = await new UserService().getUserWallet(request.phoneNumber)
    if (!userWallet) {
      this.response = 'END You do not have a wallet\n. Please register to create one.'
      return this.response
    }
    const userInput = request.text.split('*')
    if (userInput.length == 1) {
      this.response = `CON Enter the voucher code you want to redeem`
      return this.response
    }
    if (userInput.length == 2) {
      const voucher = await Voucher.findBy('voucher', userInput[1])
      if (!voucher) {
        this.response = `END Voucher does not exist. Please try again`
        return this.response
      } else if (voucher.status !== VOUCHER.CREATED) {
        this.response = `END Voucher has been used. Please try again`
        return this.response
      } else if (voucher.receiverId !== user.id) {
        this.response = `END You cannot redeem this voucher. Please try again`
        return this.response
      } else {
        const voucherRemdeemResponse = await this.redeemFundsWithVoucher(
          user,
          request.sessionId,
          userInput[1]
        )
        if (voucherRemdeemResponse !== 'SUCCESS') {
          this.response = voucherRemdeemResponse
          return this.response
        } else {
          this.response = `END Voucher of ${toCurrencyCase(Number(voucher.amount))} has been redeemed successfully.`
        }
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
    const userWallet = await new UserService().getUserWallet(request.phoneNumber)
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
      this.response = `END Your wallet ID is ${token}, valid for one transaction only and expires in 30 minutes`
      return this.response
    }

    return this.response
  }

  /**
   * @param request : IUSSDRequest
   * @returns : string
   */
  async handleCheckWalletBalance(request: IUSSDRequest): Promise<string> {
    const userWallet = await new UserService().getUserWallet(request.phoneNumber)
    if (!userWallet) {
      this.response = 'END You do not have a wallet\n. Please register to create one.'
      return this.response
    }
    const response = request.text.split('*')

    const loginResponse = await new AuthService().loginUser({
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

  private generateWalletToken(): string {
    const numbers = '0123456789'
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const numberToken = customAlphabet(numbers, 8)
    const token = letters[Math.floor(Math.random() * letters.length)] + numberToken()
    return token
  }
  private generateVoucherToken(): string {
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
  /**
   * Function to transfer funds between users
   * @param user : User
   * @param amount : number
   * @param walletToken : string
   * @param session : string
   * @returns : Promise<string>
   */
  private async transferFundsBetweenUsers(
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
        receiverWalletToken?.useTransaction(trx)
        receiverWalletToken!.status = WALLETTOKEN.USED as keyof typeof WALLETTOKEN
        await receiverWalletToken?.save()
      })
   
      // Transaction committed if code reaches here
      console.log('Transaction successful')
      return 'SUCCESS'
    } catch (error) {
      // Transaction rolled back if any query throws an error
      console.error('Transaction failed:', error)
      return 'END Transaction failed with errors. Please try again.'
    }
  }

  private async transferFundsWithVoucher(
    user: User,
    amount: number,
    walletToken: string,
    session: string,
    voucherToken: string
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

    try {
      await db.transaction(async (trx) => {
        userWallet?.useTransaction(trx)
        userWallet!.balance = Number(userWallet!.balance) - amount
        await userWallet?.save()
        const voucherRecord = new Voucher()
        voucherRecord.amount = amount
        voucherRecord.ownerId = user.id
        voucherRecord.receiverId = receiver!.id
        voucherRecord.status = 'CREATED'
        voucherRecord.voucher = voucherToken
        voucherRecord.useTransaction(trx)
        await voucherRecord.save()
        // 3. Add transaction record for sender (within transaction)
        await voucherRecord.related('transaction').create({
          amount,
          ref: transactionRef,
          session,
          type: 'VOUCHER',
          status: 'DEBIT',
          ownerId: user.id,
          receiverId: receiver?.id,
        })
      })
      console.log('Transaction successful')

      return 'SUCCESS'
    } catch (error) {
      console.error('Voucher creation failed:', error)
      return 'END Voucher creation failed with errors. Please try again.'
    }
  }

  private async redeemFundsWithVoucher(user: User, session: string, voucherToken: string) {
    const userWallet = await user.related('wallet').query().first()
    const voucherRecord = await Voucher.findBy('voucher', voucherToken)
    try {
      await db.transaction(async (trx) => {
        userWallet?.useTransaction(trx)
        userWallet!.balance = Number(userWallet!.balance) + Number(voucherRecord?.amount)
        await userWallet?.save()

        voucherRecord!.useTransaction(trx)
        voucherRecord!.status = VOUCHER.USED as keyof typeof VOUCHER
        await voucherRecord!.save()
        // 3. Add transaction record for sender (within transaction)
        await voucherRecord!.related('transaction').create({
          amount: Number(voucherRecord?.amount),
          ref: nanoid(10),
          session,
          type: 'VOUCHER',
          status: 'CREDIT',
          ownerId: voucherRecord?.ownerId,
          receiverId: user.id,
        })
      })
      console.log('redemption successful')

      return 'SUCCESS'
    } catch (error) {
      console.error('Voucher redemption failed:', error)
      return 'END Voucher redemption failed with errors. Please try again.'
    }
  }

  private async validateWalletToken(token: string, user: User): Promise<string> {
    const walletToken = await WalletToken.findBy('token', token)
    if (!walletToken) {
      return 'END Invalid token. Please try again.'
    } else if (
      walletToken.status !== WALLETTOKEN.CREATED ||
      DateTime.fromISO(walletToken.$attributes.expires_at) < DateTime.now()
    ) {
      walletToken.status = WALLETTOKEN.EXPIRED as keyof typeof WALLETTOKEN
      console.log('walletToken', walletToken)
      await walletToken.save()

      return 'END Wallet ID has been used or expired. Please ask for a new one.'
    } else if ((await user.related('wallet').query().first())?.id === walletToken.walletId) {
      return 'END You cannot tranfer funds to your wallet. Please try again.'
    } else {
      return 'SUCCESS'
    }
  }
}
