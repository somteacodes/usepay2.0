
import Wallet from '#models/wallet'
import WalletToken from '#models/wallet_token'
import User from '#models/user'
import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { init } from '@paralleldrive/cuid2'
import Voucher from '#models/voucher'

export default class Transaction extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare ownerId: number

  @column()
  declare senderId: number

  @column()
  declare receiverId: number

  @column()
  declare receiverWalletId: number

  @column()
  declare tokenId: number

  @column()
  declare ref: string

  @column()
  declare session: string


  @column()
  declare amount: number

  @column()
  declare status: 'CREDIT' | 'DEBIT' | 'DEDUCTED'

  @column()
  declare type: 'TRANSFER' | 'VOUCHER'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /** Relationships */
  @belongsTo(() => User,{
    foreignKey: 'ownerId'
  })
  declare owner: BelongsTo<typeof User>

  // @belongsTo(() => Wallet, {
  //   foreignKey: 'receiverWalletId',
  // })
  // declare receiverWallet: BelongsTo<typeof Wallet>

  // @belongsTo(() => WalletToken)
  // declare walletToken: BelongsTo<typeof WalletToken>

  @belongsTo(() => Voucher)
  declare voucher: BelongsTo<typeof Voucher>

  
}
