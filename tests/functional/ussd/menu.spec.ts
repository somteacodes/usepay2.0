import { test } from '@japa/runner'

test.group('Ussd menu', () => {
  test('Start Menu', async ({ client }) => {
    let menuResponse = 'CON What would you like to do?\n'
    menuResponse += '1. Transfer Funds\n'
    menuResponse += '2. Check Balance\n'
    menuResponse += '3. Generate Wallet ID\n'
    menuResponse += '4. Generate Voucher\n'
    menuResponse += '5. Redeem Voucher\n'
    menuResponse += '6. Create Account\n'
    const response = await client.post('/')
    response.assertStatus(200)
    response.assertHeader('content-type', 'text/plain; charset=utf-8')
  })
})
