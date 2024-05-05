import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
const USSDController = () => import('#controllers/ussds_controller')

router.post('/', [USSDController, 'handleRequest']).use(middleware.userAccountStatus())

router.get('/', async ({ response }) => {
  response.send('Welcome to USSD Gateway')
})
