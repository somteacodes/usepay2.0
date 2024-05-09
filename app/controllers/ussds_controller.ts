import type { HttpContext } from '@adonisjs/core/http'
import USSDService from '#services/ussd_service'

export default class UssdsController {
  ussdService: USSDService
  constructor() {
    this.ussdService = new USSDService()
  }
  public async handleRequest({ request }: HttpContext): Promise<string> {
    let { sessionId, serviceCode, phoneNumber, text = '' } = request.body()
    console.log(sessionId, serviceCode, phoneNumber, text)
    // TODO prevent user from dialing like *123*1*1#

    return this.ussdService.handleUSSDRequests({ sessionId, serviceCode, phoneNumber, text })
  }
}
