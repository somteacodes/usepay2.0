import User from '#models/user'
import redis from '@adonisjs/redis/services/main'
import { ACCOUNT } from '../utils/constants.js'
import { toSentenceCase } from '../utils/common.js'
import { containsOnlyAlphabetsAndNumbers } from '../utils/validator.js'

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
}
