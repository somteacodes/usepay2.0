import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import WalletToken from '#models/wallet_token'
export default class Wallet extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ serializeAs: null })
  declare userId: number

  @column()
  declare balance: number

  @column()
  declare status: 'ACTIVE'| 'INACTIVE'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // relationships
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => WalletToken)
  declare WalletTokens: HasMany<typeof WalletToken>

  // hooks
  @beforeCreate()
  static async setWalletStatus(Wallet: Wallet) {
    Wallet.status = 'ACTIVE'
  }
}
