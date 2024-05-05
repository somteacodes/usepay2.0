import AuthService from '#services/auth_service'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

@inject()
export default class UserAccountStatusMiddleware {
  constructor(protected authService: AuthService) {}

  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Middleware logic goes here (before the next call)
     */
    console.log(ctx.request.body())
    const { sessionId, serviceCode, phoneNumber, text = '' } = ctx.request.body()
    const isAccountBlocked = await this.authService.isAccountBlocked(phoneNumber)
    let menuResponse =
      'END Account is blocked. You have to answer some security questions to unblock it.\n'
    menuResponse += '1. Proceed\n'
    menuResponse += '2. Cancel\n'
    if (isAccountBlocked) {
      if (text && text.startsWith('1')) {
        // start unblocking process
        const unlockResponse = await this.authService.unlockAccount({
          sessionId,
          serviceCode,
          phoneNumber,
          text,
        })
        ctx.response.type('text/plain').send(unlockResponse)
        return
      } else if (text && text.startsWith('2')) {
        // cancel unblocking process
        ctx.response.type('text/plain').send('END Operation cancelled by user.\n')
        return
      }
      ctx.response.type('text/plain').send(menuResponse)
      return
    }

    /**
     * Call next method in the pipeline and return its output
     */
    const output = await next()
    return output
  }
}
