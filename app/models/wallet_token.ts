import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, beforeSave, belongsTo, column, hasOne } from '@adonisjs/lucid/orm'
import Wallet from '#models/wallet'
import Transaction from '#models/transaction'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'

export default class WalletToken extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare token: string

  @column()
  declare status: 'CREATED' | 'USED'|'EXPIRED'

  @column()
  declare walletId: number

  @column.dateTime()
  declare expires_at: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // relationships
  @belongsTo(() => Wallet)
  declare wallet: BelongsTo<typeof Wallet>

  @hasOne(() => Transaction)
  declare transaction: HasOne<typeof Transaction>

  // hooks

  @beforeCreate()
  static generateExpirationTime(WalletToken: WalletToken) {
    if (!WalletToken.expires_at) {
      WalletToken.expires_at = DateTime.now().plus({ minutes: 10 })
    }
  }
  @beforeCreate()
  static async setWalletTokenStatus(WalletToken: WalletToken) {
    WalletToken.status = 'CREATED'
  }
}
