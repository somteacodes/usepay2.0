import { HttpContext } from '@adonisjs/core/http'

export default class UsersController {
  public async index({ request, response }: HttpContext) {
    let { sessionId, serviceCode, phoneNumber, text = '' } = request.body()
    
    return await this.createAccount({ sessionId, serviceCode, phoneNumber, text })
  }

  async createAccount(request: IUSSDRequest) {
    return request;
  }
}
