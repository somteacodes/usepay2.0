import User from '#models/user'
import Wallet from '#models/wallet'
import redis from '@adonisjs/redis/services/main'
import { randomUniqueNumbersInRange, toSentenceCase } from '../utils/common.js'
import {
  containsOnlyAlphabets,
  containsOnlyAlphabetsAndNumbers,
  validatePIN,
  validatePINChallengeLength,
} from '../utils/validator.js'
import hash from '@adonisjs/core/services/hash'
import QuestionService from '#services/question_service'
import { nanoid } from 'nanoid'
import WalletService from '#services/wallet_service'
import { ACCOUNT, MENURESPONSE, USSDMENUOPTIONS } from '../utils/constants.js'

export default class UserService {
  response: string
  questionService: QuestionService
  walletService: WalletService
  uuid: string

  constructor() {
    // initialize the response string to be returned
    this.response = 'END Something went wrong.\n Please try again later.\n'
    this.questionService = new QuestionService()
    this.walletService = new WalletService()
    this.uuid = nanoid(11)
  }
  /**
   * Function to check if a user exists
   * @param phoneNumber : string
   * @returns : Promise<boolean>
   */
  async checkIfUserExists(phoneNumber: string): Promise<boolean> {
    return (await User.findBy('phone_number', phoneNumber)) ? true : false
  }

  /**
   * Function to get a user's wallet
   * @param phoneNumber : string
   * @returns : Promise<Wallet | null | undefined>
   */
  async getUserWallet(phoneNumber: string): Promise<Wallet | null> {
    const user = await User.findBy('phone_number', phoneNumber)
    if (!user) {
      return null
    }
    const userWallet = await user?.related('wallet').query().first()
    if (!userWallet) {
      return null
    } else {
      return userWallet
    }
  }

  /**
   * Function to create a new user account
   * @param request : IUSSDRequest
   * @returns : Promise<string>
   */
  async createAccount(request: IUSSDRequest): Promise<string> {
    const userExists = await this.checkIfUserExists(request.phoneNumber)
    if (userExists) {
      this.response = 'END You are already registered.'
      return this.response
    }
    // Set random questions for the user
    const cachedQuestionsNos = await redis.get(`questions-${request.phoneNumber}`)
    let questionsNos: number[] = []
    if (!cachedQuestionsNos) {
      const questions = await this.questionService.getAllQuestions()
      questionsNos = randomUniqueNumbersInRange(questions.length, 3, false)
      console.log('questionsNos', questionsNos)
      await redis.set(`questions-${request.phoneNumber}`, JSON.stringify(questionsNos))
    } else {
      questionsNos = JSON.parse(cachedQuestionsNos)
    }
    // start registration process
    const response = request.text.split('*')
    if (response.length === 1) {
      return 'CON Enter your first name'
    }
    if (response.length === 2) {
      // validate first name
      if (!containsOnlyAlphabets(response[1])) {
        this.response = 'END Invalid first name. Please try again.'
        return this.response
      }
      this.response = 'CON Enter your last name'
      return this.response
    }
    if (response.length === 3) {
      // validate last name
      if (!containsOnlyAlphabets(response[2])) {
        return 'END Invalid last name. Please try again.'
      }
      return 'CON Create a PIN, must be 6 to 8 digits.'
    }
    if (response.length === 4) {
      // validate pin
      if (!validatePIN(response[3])) {
        return 'END Invalid PIN, PIN should be 6 to 8 digits. Please try again.'
      }
      // get the first security questions
      const firstQuestion = await this.questionService.getQuestionById(questionsNos[0] + 1)
      return `CON ${firstQuestion}`
    }
    if (response.length === 5) {
      if (!containsOnlyAlphabetsAndNumbers(response[4])) {
        this.response = 'END Invalid answer format. Please try again.'
        return this.response
      }
      const secondQuestion = await this.questionService.getQuestionById(questionsNos[1] + 1)
      this.response = `CON ${secondQuestion}`
      return this.response
    }
    if (response.length == 6) {
      if (!containsOnlyAlphabetsAndNumbers(response[5])) {
        this.response = 'END Invalid answer format. Please try again.'
        return this.response
      }
      const thirdQuestion = await this.questionService.getQuestionById(questionsNos[2] + 1)
      this.response = `CON ${thirdQuestion}`
      return this.response
    }
    if (response.length == 7) {
      if (!containsOnlyAlphabetsAndNumbers(response[6])) {
        this.response = 'END Invalid answer format. Please try again.'
        return this.response
      }
      const newUserData = {
        uid: this.uuid,
        firstName: toSentenceCase(response[1]),
        lastName: toSentenceCase(response[2]),
        phoneNumber: request.phoneNumber,
        email: null,
        password: await this.hashPassword(response[3]),
        status: ACCOUNT.ACTIVE,
        securityQuestions: JSON.stringify([
          {
            question: await this.questionService.getQuestionById(questionsNos[0] + 1),
            answer: toSentenceCase(response[4]),
          },
          {
            question: await this.questionService.getQuestionById(questionsNos[1] + 1),
            answer: toSentenceCase(response[5]),
          },
          {
            question: await this.questionService.getQuestionById(questionsNos[2] + 1),
            answer: toSentenceCase(response[6]),
          },
        ]),
        isAdministrator: false,
      }

      const user = await this.createNewUser(newUserData)
      if (!user) {
        this.response = 'END Something went wrong. with creating account Please try again later.'
        return this.response
      }
      await redis.del(`questions-${request.phoneNumber}`)
      this.response = 'END You have successfully registered.'
      return this.response
    }

    return this.response
  }

  async loginUser(request: ILoginUserDto): Promise<string> {
    const user = await User.findBy('phoneNumber', request.phoneNumber)
    if (!user) {
      this.response = 'END You are not registered, Register to continue.'
      return this.response
    }
    // is User Blocked
    if (user.status === ACCOUNT.BLOCKED) {
      this.response = `${MENURESPONSE.END} Your account has been blocked. Dial ${process.env.SERVICE_CODE?.slice(0, -1)}*${USSDMENUOPTIONS.UNBLOCK_ACCOUNT} to unblock it.`
      return this.response
    }
    /*START PIN CHALLENGE VERIFICATION*/
    // 1. check if random positions have been set for the user
    let cachedChallengePositions = await redis.get(`position-${user.id}`)
    let challengePositions: number[] = []
    const parsedPassword = JSON.parse(user?.password)
    // 2. if not, generate random positions and set in redis
    if (!cachedChallengePositions) {
      challengePositions = this.generateChallenge(parsedPassword.length)
      await redis.set(`position-${user.id}`, JSON.stringify(challengePositions))
    } else {
      challengePositions = JSON.parse(cachedChallengePositions)
    }
    if (!request.pin) {
      this.response = `CON Enter the ${challengePositions.map((position) => this.changeNumberToPositionWord(position)).join(' and ')} characters of your pin`
      return this.response
    }
    // 3. validate the length of the pin
    if (!validatePINChallengeLength(request.pin)) {
      this.response = 'END Invalid characters, try again.'
      return this.response
    }
    // 4. verify the characters
    else {
      let retries = await redis.get(`retries-${request.phoneNumber}`)
      if (retries && parseInt(retries) >= 3) {
        user.status = ACCOUNT.BLOCKED as keyof typeof ACCOUNT
        await user.save()
        this.response =
          'END You have exceeded the maximum number of retries.\n Your account has been locked.\n Unlock it by answeing your security questions.'
        return this.response
      }

      for (let i = 0; i < challengePositions.length; i++) {
        const verifiedChar = await hash.verify(
          parsedPassword[challengePositions[i]],
          request.pin[i]
        )
        if (!verifiedChar) {
          // INCREMENT RETRIES
          if (retries) {
            await redis.set(`retries-${request.phoneNumber}`, parseInt(retries) + 1)
          } else {
            await redis.set(`retries-${request.phoneNumber}`, 1)
          }
          this.response = 'END Incorrect characters, try again.'
          return this.response
        } else {
          await redis.del(`retries-${request.phoneNumber}`)
          await redis.del(`position-${user.id}`)
          console.log('successful login')
          this.response = 'SUCCESS'
          return this.response
        }
      }
    }
    return this.response
  }

  async unlockAccount(request: IUSSDRequest): Promise<string> {
    // so check if the user exists
    const user = await User.findBy('phoneNumber', request.phoneNumber)
    if (!user) {
      this.response = 'END Invalid option selected. Please try again.'
      return this.response
    }
    // check if the user is blocked
    if (user.status === ACCOUNT.ACTIVE) {
      this.response = 'END Your account is not blocked.'
      return this.response
    } else {
      const response = request.text.split('*')
      const securityQuestions = JSON.parse(user.securityQuestions)
      let randomPosition = 0
      if (response.length === 1) {
        // check if random question position has been set
        let selectedQuestion = await redis.get(`selectedQuestion-${request.phoneNumber}`)

        if (!selectedQuestion) {
          randomPosition = Math.floor(Math.random() * securityQuestions.length)
          selectedQuestion = await redis.set(
            `selectedQuestion-${request.phoneNumber}`,
            randomPosition
          )
          const question = securityQuestions[randomPosition]
          this.response = `CON You Need to answer your security questions to unlock your account.\n${question.question}`
          return this.response
        } else {
          randomPosition = parseInt(selectedQuestion)
          const question = securityQuestions[randomPosition]
          this.response = `CON You Need to answer your security questions to unlock your account.\n${question.question}`
          return this.response
        }
      }
      if (response.length === 2) {
        let selectedQuestion = await redis.get(`selectedQuestion-${request.phoneNumber}`)
        if (!selectedQuestion) {
          selectedQuestion = await redis.set(
            `selectedQuestion-${request.phoneNumber}`,
            randomPosition
          )
        }
        const question = securityQuestions[selectedQuestion!]
        if (!containsOnlyAlphabetsAndNumbers(response[1])) {
          this.response = 'END Invalid answer format. Please try again.'
          return this.response
        }
        if (toSentenceCase(response[1]) !== question.answer) {
          this.response = 'END Incorrect answer. Please try again.'
          return this.response
        }
        await redis.del(`retries-${request.phoneNumber}`)
        await redis.del(`selectedQuestion-${request.phoneNumber}`)
        user.status = ACCOUNT.ACTIVE as keyof typeof ACCOUNT
        await user.save()
        this.response = 'END Account unlocked successfully.'
        return this.response
      }
      return this.response
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const charHashes = []
    for (const char of password) {
      charHashes.push(await hash.make(char))
    }
    return JSON.stringify(charHashes)
  }
  private generateChallenge(wordLength: number): number[] {
    const positions: number[] = []
    let attempts = 0
    while (positions.length < 3 && attempts < 10) {
      const position = Math.floor(Math.random() * (wordLength - 1)) + 1 // Exclude the first character for security
      if (!positions.includes(position)) {
        positions.push(position)
      }
      attempts++
    }

    return positions
  }

  private changeNumberToPositionWord(number: number) {
    const words = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth']
    return words[number]
  }

  private async createNewUser(userData: IUserDto) {
    try {
      const user = new User()
      user.firstName = userData.firstName
      user.lastName = userData.lastName
      user.phoneNumber = userData.phoneNumber
      user.password = userData.password
      user.isAdministrator = userData.isAdministrator
      user.securityQuestions = userData.securityQuestions
      await user.save()

      await this.walletService.createNewWallet(user, { balance: 0, status: 'active' })
      return user
    } catch (error) {
      console.log(error)
      return null
    }
  }
}
