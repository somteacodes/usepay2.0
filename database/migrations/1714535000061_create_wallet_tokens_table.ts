import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'wallet_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('wallet_id').notNullable().unsigned().references('wallets.id')
      table.string('token').notNullable()
      table.enu('status', ['CREATED', 'USED']).notNullable().defaultTo('CREATED')
      table.timestamp('expires_at').notNullable()
      table.timestamp('created_at').defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
