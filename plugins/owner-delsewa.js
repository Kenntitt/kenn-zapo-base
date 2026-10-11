import config from '../config.js'
import { removeSewa, getSewaInfo } from '../lib/database/sewadb.js'

function parseGroupCode(input) {
  if (!input) return null
  const match = input.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/)
  if (match) return match[1]
  if (/^[A-Za-z0-9]{10,}$/.test(input)) return input
  return null
}

const handler = async (m, { conn }) => {
  const arg  = m.text?.trim() || ''
  const code = parseGroupCode(arg)

  let targetJid = null

  if (code) {
    try {
      const info = await conn.groupGetInviteInfo(code)
      targetJid  = info.id
    } catch {
      return m.reply('Link/kode grup tidak valid.')
    }
  } else if (m.isGroup) {
    targetJid = m.from
  } else {
    return m.reply(
      `*DEL SEWA*\n\n` +
      `Gunakan di dalam grup, atau kirim link:\n` +
      `◦ *${m.prefix}${m.command} https://chat.whatsapp.com/xxx*\n\n` +
      `> ${config.WM}`
    )
  }

  const info = getSewaInfo(targetJid)
  if (!info) {
    return m.reply('Grup tidak terdaftar di sewa.')
  }

  removeSewa(targetJid)

  await conn.sendMessage(targetJid, {
    text:
      `*SEWA DIHAPUS*\n\n` +
      `Sewa bot di grup ini telah dihapus oleh owner.\n` +
      `Hubungi owner untuk aktivasi kembali.\n\n` +
      `> ${config.WM}`,
  }).catch(() => {})

  await conn.groupLeave(targetJid).catch(() => {})

  if (targetJid !== m.from) {
    await conn.sendMessage(m.from, {
      text:
        `*SEWA DIHAPUS*\n\n` +
        `◦ *Group* : ${targetJid.split('@')[0]}\n` +
        `◦ *Paket* : ${info.paket}\n` +
        `◦ *Status*: Bot sudah keluar dari grup\n\n` +
        `> ${config.WM}`,
    }, { quoted: m })
  } else {
    await m.reply(
      `*SEWA DIHAPUS*\n\n` +
      `◦ *Paket* : ${info.paket}\n` +
      `◦ *Status*: Bot sudah keluar dari grup\n\n` +
      `> ${config.WM}`
    )
  }
}

handler.command = /^(delsewa|hapussewa)$/i
handler.tags    = ['owner']
handler.help    = ['delsewa [link/kode]']
handler.owner   = true
handler.premium = false
handler.limit   = false

export default handler