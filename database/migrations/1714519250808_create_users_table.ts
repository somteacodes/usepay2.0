import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('uid', 255).notNullable()
      table.string('first_name').notNullable()
      table.string('last_name').notNullable()
      table.string('phone_number',100).notNullable()
      table.string('email').nullable()
      table.boolean('is_administrator').defaultTo(false)
      table.text('password').notNullable()
      table.json('security_questions').notNullable()
      table.enum('status', ['ACTIVE', 'BLOCKED','BANNED']).defaultTo('ACTIVE')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}