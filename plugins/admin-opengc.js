import config from '../config.js'

const handler = async (m, { conn }) => {
  if (!m.isGroup)               return m.reply('Hanya bisa digunakan di grup.')
  if (!m.isAdmin && !m.isOwner) return m.reply('Hanya untuk admin grup.')
  if (!m.isBotAdmin)            return m.reply('Bot harus jadi admin.')

  try {
    await conn.groupSettingUpdate(m.from, 'not_announcement')
    await conn.sendMessage(m.from, {
      text: `*GRUP DIBUKA*\n\nSemua member bisa mengirim pesan.\n\n> ${config.WM}`,
    }, { quoted: m })
  } catch (e) {
    await m.reply(`Gagal membuka grup: ${e.message}`)
  }
}

handler.command = /^(opengc|open|buka)$/i
handler.tags    = ['admin']
handler.help    = ['opengc']
handler.owner   = false
handler.premium = false
handler.limit   = false

export default handler