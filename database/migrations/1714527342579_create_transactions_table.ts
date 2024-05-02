import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'transactions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('owner_id').notNullable()
      table.integer('sender_id').notNullable()
      table.integer('receiver_id').notNullable()
      // table.integer('receiver_wallet_id')
      table.integer('voucher_id')
      table.string('ref').notNullable()     
      table.decimal('amount',13,4).notNullable()
      table.string('session').notNullable()
      table.enum('status', ['CREDIT', 'DEBIT', 'DEDUCTED']).notNullable().defaultTo('CREDIT')
      table.enu('type',['TRANSFER','VOUCHER']).notNullable().defaultTo("TRANSFER")      
      table.timestamp('created_at')
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}