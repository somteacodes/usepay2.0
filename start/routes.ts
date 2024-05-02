import router from '@adonisjs/core/services/router'
const UsersController = () => import('#controllers/users_controller')
const USSDController = () => import('#controllers/ussds_controller')

router.post('/', [USSDController, 'handleRequest'])
