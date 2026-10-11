import config from '../config.js'
import { getAllSewa, getSisaWaktu } from '../lib/database/sewadb.js'

const handler = async (m, { conn }) => {
  const all = getAllSewa()

  if (!all.length) return m.reply('Belum ada grup yang disewa.')

  const now     = Date.now()
  const aktif   = all.filter(v => v.expired_at === 0 || v.expired_at > now)
  const expired = all.filter(v => v.expired_at !== 0 && v.expired_at <= now)

  const getName = async (jid) => {
    try {
      const meta = await conn.groupMetadata(jid)
      return meta.subject || jid.split('@')[0]
    } catch {
      return jid.split('@')[0]
    }
  }

  let text =
    `*LIST SEWA*\n\n` +
    `◦ *Total*   : ${all.length} grup\n` +
    `◦ *Aktif*   : ${aktif.length}\n` +
    `◦ *Expired* : ${expired.length}\n\n`

  if (aktif.length) {
    text += `*AKTIF*\n`
    for (let i = 0; i < aktif.length; i++) {
      const v = aktif[i]
      const name = await getName(v.jid)
      const sisa = getSisaWaktu(v.jid)
      text += `${i + 1}. *${name}*\n`
      text += `    ${v.paket} | ${sisa}\n`
    }
    text += `\n`
  }

  if (expired.length) {
    text += `*EXPIRED*\n`
    for (let i = 0; i < expired.length; i++) {
      const v = expired[i]
      const name = await getName(v.jid)
      text += `${i + 1}. *${name}* — ${v.paket}\n`
    }
    text += `\n`
  }

  text += `> ${config.WM}`

  await conn.sendMessage(m.from, { text }, { quoted: m })
}

handler.command = /^listsewa$/i
handler.tags    = ['owner']
handler.help    = ['listsewa']
handler.owner   = true
handler.premium = false
handler.limit   = false

export default handler