import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vouchers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('amount').notNullable()
      table.string('voucher').notNullable()
      table.integer('owner_id').notNullable()
      table.integer('receiver_id').notNullable()
      table.enu('status',['CREATED','USED']).notNullable().defaultTo("CREATED")
      table.integer('transaction_id').notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}