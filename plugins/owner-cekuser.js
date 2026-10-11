import moment from 'moment-timezone'
import config from '../config.js'
import { getUser } from '../lib/database/userdb.js'
import { getLimitEntry } from '../lib/db.js'

function normalizeNumber(input) {
  let num = String(input).replace(/[^0-9]/g, '')
  if (!num) return null
  if (num.startsWith('0')) num = '62' + num.slice(1)
  if (num.startsWith('8')) num = '62' + num
  return num
}

const handler = async (m, { conn }) => {
  let targetJid = null

  if (m.mentionedJid?.length) {
    targetJid = m.mentionedJid[0]
  } else if (m.quoted?.sender) {
    targetJid = m.quoted.sender
  } else if (m.q?.trim()) {
    const num = normalizeNumber(m.q)
    if (num) targetJid = `${num}@s.whatsapp.net`
  } else {
    targetJid = m.sender
  }

  if (!targetJid) {
    return m.reply(
      `*CEK USER*\n\n` +
      `◦ *.cekuser* — cek profil sendiri\n` +
      `◦ *.cekuser @user* — mention user\n` +
      `◦ *.cekuser 628xxx* — pakai nomor\n` +
      `◦ Reply pesan + *.cekuser* — cek pengirim pesan`
    )
  }

  const number = targetJid.split('@')[0].split(':')[0]

  let user
  try {
    user = getUser(targetJid)
  } catch {
    return m.reply('Gagal ambil data user.')
  }

  if (!user) return m.reply('Data user tidak ditemukan.')

  const limit = getLimitEntry(targetJid)
  const isSelf = targetJid === m.sender
  const isTargetOwner = config.OWNER.some(o => String(o).replace(/\D/g, '') === number)

  const role = isTargetOwner ? 'Owner' : user.premium === 1 ? 'Premium' : 'Member'
  const maxLimit = isTargetOwner ? '∞' : (user.premium === 1 ? config.PREMIUM_LIMIT : config.FREE_LIMIT) + (limit.bonus || 0)

  const tz = config.TIMEZONE || 'Asia/Jakarta'
  const regDate = user.registered_at
    ? moment(user.registered_at).tz(tz).format('DD MMM YYYY, HH:mm')
    : '-'
  const updDate = user.updated_at
    ? moment(user.updated_at).tz(tz).format('DD MMM YYYY, HH:mm')
    : '-'

  const afkStatus = user.afk_since
    ? `${user.afk_reason || 'Tanpa alasan'} (sejak ${moment(user.afk_since).tz(tz).format('DD MMM, HH:mm')})`
    : 'Tidak AFK'

  const text =
    `*PROFIL USER*${isSelf ? ' (KAMU)' : ''}\n\n` +
    `◦ *Nama*     : ${user.name || '-'}\n` +
    `◦ *Nomor*    : ${number}\n` +
    `◦ *JID*      : ${targetJid}\n` +
    `◦ *Role*     : ${role}\n` +
    `◦ *Limit*    : ${limit.count}/${maxLimit}\n` +
    `◦ *Balance*  : ${user.balance}\n` +
    `◦ *Level*    : ${user.level}\n` +
    `◦ *Exp*      : ${user.exp}\n` +
    `◦ *AFK*      : ${afkStatus}\n` +
    `◦ *Banned*   : ${user.banned === 1 ? 'Ya' : 'Tidak'}\n` +
    `◦ *Terdaftar*: ${regDate}\n` +
    `◦ *Update*   : ${updDate}\n\n` +
    `> ${config.WM}`

  await conn.sendMessage(m.from, { text, mentions: [targetJid] }, { quoted: m })
}

handler.command = /^cekuser$/i
handler.tags    = ['owner']
handler.help    = ['cekuser <@tag|nomor>']
handler.owner   = true
handler.premium = false
handler.limit   = false

export default handler