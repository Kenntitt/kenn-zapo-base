import config from '../config.js'
import { addSewa, isSewa, getSisaWaktu, getSewaInfo } from '../lib/database/sewadb.js'

function parseGroupCode(input) {
  if (!input) return null
  const match = input.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/)
  if (match) return match[1]
  if (/^[A-Za-z0-9]{10,}$/.test(input)) return input
  return null
}

const handler = async (m, { conn }) => {
  const args = (m.text?.trim() || '').split(/\s+/).filter(Boolean)

  let targetJid = null
  let days      = 30
  let paket     = 'basic'

  const code = parseGroupCode(args[0])

  if (code) {
    try {
      const info = await conn.groupGetInviteInfo(code)
      targetJid  = info.id
      days       = parseInt(args[1]) || 30
      paket      = args[2] || 'basic'
    } catch {
      return m.reply('Link/kode grup tidak valid atau bot bukan member.')
    }
  } else {
    if (!m.isGroup) {
      return m.reply(
        `*ADD SEWA*\n\n` +
        `Gunakan di dalam grup, atau kirim link:\n` +
        `◦ *${m.prefix}${m.command} https://chat.whatsapp.com/xxx <hari> [paket]*\n` +
        `◦ *${m.prefix}${m.command} <hari> [paket]* — dari dalam grup\n\n` +
        `Contoh:\n` +
        `◦ *${m.prefix}${m.command} 30*\n` +
        `◦ *${m.prefix}${m.command} 30 premium*\n` +
        `◦ *${m.prefix}${m.command} 0* — permanent\n\n` +
        `> ${config.WM}`
      )
    }
    targetJid = m.from
    days      = parseInt(args[0]) || 30
    paket     = args[1] || 'basic'
  }

  const isPerm = days <= 0

  const existing = getSewaInfo(targetJid)
  const isRenew  = existing && isSewa(targetJid)

  const entry = addSewa(targetJid, m.sender, isPerm ? 0 : days, paket)
  const sisa  = getSisaWaktu(targetJid)

  await conn.sendMessage(targetJid, {
    text:
      `*${isRenew ? 'SEWA DIPERPANJANG' : 'SEWA AKTIF'}*\n\n` +
      `◦ *Paket*  : ${entry.paket}\n` +
      `◦ *Durasi* : ${isPerm ? 'Permanent' : `${days} hari`}\n` +
      `◦ *Sisa*   : ${sisa}\n\n` +
      `> ${config.WM}`,
  }).catch(() => {})

  if (targetJid !== m.from) {
    await conn.sendMessage(m.from, {
      text:
        `*SEWA BERHASIL*\n\n` +
        `◦ *Group*  : ${targetJid}\n` +
        `◦ *Paket*  : ${entry.paket}\n` +
        `◦ *Durasi* : ${isPerm ? 'Permanent' : `${days} hari`}\n` +
        `◦ *Sisa*   : ${sisa}\n\n` +
        `> ${config.WM}`,
    }, { quoted: m })
  } else {
    await m.reply(
      `*SEWA BERHASIL*\n\n` +
      `◦ *Paket*  : ${entry.paket}\n` +
      `◦ *Durasi* : ${isPerm ? 'Permanent' : `${days} hari`}\n` +
      `◦ *Sisa*   : ${sisa}\n\n` +
      `> ${config.WM}`
    )
  }
}

handler.command = /^(addsewa|sewa)$/i
handler.tags    = ['owner']
handler.help    = ['addsewa <link|hari> [paket]']
handler.owner   = true
handler.premium = false
handler.limit   = false

export default handler