import moment from 'moment-timezone'
import config from '../config.js'
import { getUser } from '../lib/database/userdb.js'
import { getLimitEntry } from '../lib/db.js'

const handler = async (m, { conn }) => {
  const user = getUser(m.sender)
  const limit = getLimitEntry(m.sender)

  const role = m.isOwner ? 'Owner' : m.isPremium ? 'Premium' : 'Member'
  const maxLimit = m.isOwner ? '∞' : (m.isPremium ? config.PREMIUM_LIMIT : config.FREE_LIMIT) + (limit.bonus || 0)

  const tz = config.TIMEZONE || 'Asia/Jakarta'
  const regDate = user.registered_at
    ? moment(user.registered_at).tz(tz).format('DD MMM YYYY, HH:mm')
    : '-'

  const afkStatus = user.afk_since
    ? `Aktif sejak ${moment(user.afk_since).tz(tz).format('DD MMM, HH:mm')}`
    : 'Tidak AFK'

  const banned = user.banned === 1 ? 'Ya' : 'Tidak'

  const text =
    `*PROFIL PENGGUNA*\n\n` +
    `◦ *Nama*     : ${m.pushName}\n` +
    `◦ *Nomor*    : ${m.senderNum}\n` +
    `◦ *Role*     : ${role}\n` +
    `◦ *Limit*    : ${limit.count}/${maxLimit}\n` +
    `◦ *Balance*  : ${user.balance}\n` +
    `◦ *Level*    : ${user.level}\n` +
    `◦ *Exp*      : ${user.exp}\n` +
    `◦ *AFK*      : ${afkStatus}\n` +
    `◦ *Banned*   : ${banned}\n` +
    `◦ *Terdaftar*: ${regDate}\n\n` +
    `> ${config.WM}`

  await conn.sendMessage(m.from, { text }, { quoted: m })
}

handler.command = /^me$/i
handler.tags    = ['main']
handler.help    = ['me']
handler.owner   = false
handler.premium = false
handler.limit   = false

export default handler