import User from '#models/user'
import redis from '@adonisjs/redis/services/main'
import { ACCOUNT, MENURESPONSE } from '../utils/constants.js'
import { toSentenceCase } from '../utils/common.js'
import { containsOnlyAlphabetsAndNumbers, validatePINChallengeLength } from '../utils/validator.js'
import hash from '@adonisjs/core/services/hash'
 

export default class AuthService {
  response: string | undefined
  async isAccountBlocked(phoneNumber: string): Promise<boolean> {
    const user = await User.findBy('phone_number', phoneNumber)
    if (!user) {
      return false
    }
    return user?.status === 'BLOCKED'
  }

  async doesAccountExist(phoneNumber: string): Promise<boolean> {
    const user = await User.findBy('phone_number', phoneNumber)
    return !!user
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
      return this.response || 'END Invalid option selected. Please try again.'
    }
  }

  async loginUser(
    request: ILoginUserDto,
    extraCheck: boolean = false,
    extraCheckResponse: string = ''
  ): Promise<string> {
    const user = await User.findBy('phoneNumber', request.phoneNumber)
    if (!user) {
      this.response = 'END You are not registered, Register to continue.'
      return this.response
    }
    // is User Blocked
    if (user.status === ACCOUNT.BLOCKED) {
      this.response = `${MENURESPONSE.END} Your account has been blocked. Dial ${process.env.SERVICE_CODE} to unblock it.`
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
          // is extra check enabled
          if (extraCheck) {
            const securityCheckChallengeResponse = await this.securityCheckChallenge(
              user,
              request.phoneNumber,
              extraCheckResponse
            )
            return securityCheckChallengeResponse
          } else {
            await redis.del(`retries-${request.phoneNumber}`)
            await redis.del(`position-${user.id}`)
            this.response = 'SUCCESS'
            return this.response
          }
        }
      }
    }
    return this.response || 'END Invalid option selected. Please try again.'
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

  private async securityCheckChallenge(
    user: User,
    phoneNumber: string,
    text: string = '',
    message: string = 'CON You Need to answer your security questions  to complete the transfer.\n'
  ): Promise<string> {
    const securityQuestions = JSON.parse(user.securityQuestions)
    let randomPosition = 0
    if (!text) {
      // check if random question position has been set
      let selectedQuestion = await redis.get(`selectedQuestion-${phoneNumber}`)

      if (!selectedQuestion) {
        randomPosition = Math.floor(Math.random() * securityQuestions.length)
        selectedQuestion = await redis.set(`selectedQuestion-${phoneNumber}`, randomPosition)
      } else {
        randomPosition = parseInt(selectedQuestion)
      }
      const question = securityQuestions[randomPosition]
      this.response = `${message}${question.question}`
      return this.response
    } else {
      let selectedQuestion = await redis.get(`selectedQuestion-${phoneNumber}`)
      if (!selectedQuestion) {
        selectedQuestion = await redis.set(`selectedQuestion-${phoneNumber}`, randomPosition)
      }
      const question = securityQuestions[selectedQuestion!]
      if (!containsOnlyAlphabetsAndNumbers(text)) {
        this.response = 'END Invalid answer format. Please try again.'
        return this.response
      }
      if (toSentenceCase(text) !== question.answer) {
        await redis.del(`position-${user.id}`)
        await redis.del(`extraCheck-${phoneNumber}`)
        this.response = 'END Incorrect answer. Please try again.'
        return this.response
      }

      await redis.del(`selectedQuestion-${phoneNumber}`)
      return 'SUCCESS'
    }
  }
}
