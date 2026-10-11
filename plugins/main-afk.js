import config from '../config.js'
import { isAfk, getAfk, setAfk } from '../lib/database/userdb.js'

const handler = async (m, { conn }) => {
  const reason = m.q?.trim() || 'Tanpa alasan'

  if (isAfk(m.sender)) {
    const afk = getAfk(m.sender)
    return m.reply(
      `*KAMU SUDAH AFK*\n\n` +
      `◦ *Alasan* : ${afk.reason}\n` +
      `◦ *Sejak*  : ${new Date(afk.since).toLocaleString('id-ID', { timeZone: config.TIMEZONE })}\n\n` +
      `Kirim pesan apapun untuk keluar dari mode AFK.`
    )
  }

  setAfk(m.sender, reason)

  const text =
    `*AFK AKTIF*\n\n` +
    `◦ *Nama*   : ${m.pushName}\n` +
    `◦ *Alasan* : ${reason}\n\n` +
    `Kamu akan ditandai AFK sampai mengirim pesan lagi.`

  await conn.sendMessage(m.from, { text }, { quoted: m })
}

handler.command = /^afk$/i
handler.tags    = ['main']
handler.help    = ['afk <alasan>']
handler.owner   = false
handler.premium = false
handler.limit   = false

export default handler