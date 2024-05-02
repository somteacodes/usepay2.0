export default class USSDService {
  async mainMenu() {
    let menuResponse = 'CON What would you like to do?\n'
    menuResponse += '1. Transfer Funds\n'
    menuResponse += '2. Check Balance\n'
    menuResponse += '3. Generate Wallet ID\n'
    menuResponse += '4. Generate Voucher\n'
    menuResponse += '5. Redeem Voucher\n'
    menuResponse += '6. Create Account\n'
    return menuResponse
  }
}