import Voucher from '#models/voucher'
import { DateTime } from 'luxon'
import {
  BaseModel,
  beforeCreate,
  column,
  hasMany,
  hasOne,
} from '@adonisjs/lucid/orm'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import Wallet from '#models/wallet'
import Transaction from '#models/transaction'
import { init } from '@paralleldrive/cuid2'

export default class User extends BaseModel {
  @column({ isPrimary: true, serializeAs: null })
  declare id: number

  @column()
  declare uid: string

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare phoneNumber: string

  @column({ serializeAs: null })
  declare password: string

  @column({ serializeAs: null })
  declare email: string

  @column({ serializeAs: null })
  declare isAdministrator: boolean

  @column()
  declare status: 'ACTIVE' | 'BLOCKED' | 'BANNED'

  @column()
  declare securityQuestions: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // relationships
  @hasOne(() => Wallet)
  declare wallet: HasOne<typeof Wallet>

  @hasMany(() => Transaction, {
    foreignKey: 'ownerId',
  })
  declare transactions: HasMany<typeof Transaction>

  @hasMany(() => Voucher, {
    foreignKey: 'ownerId',
  })
  declare vouchers: HasMany<typeof Voucher>

  // hooks
  @beforeCreate()
  static generateUid(user: User) {
    const createId = init({
      length: 16,
    })
    user.uid = createId()
  }

  // @beforeSave()
  // static async hashPassword(user: User) {
  //   if (user.$dirty.password) {
  //     user.password = await hash.make(user.password)
  //   }
  // }
}
