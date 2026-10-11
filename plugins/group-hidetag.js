import config from '../config.js'

const MEDIA_TYPES = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage']

const handler = async (m, { conn }) => {
  if (!m.isGroup) return m.reply('⚠️ _Hanya bisa digunakan di grup._')

  if (!m.isAdmin && !m.isOwner) return m.reply('⚠️ _Hanya untuk Admin Grup._')

  let participants
  try {
    const meta = await conn.groupMetadata(m.from)
    participants = meta.participants
  } catch {
    return m.reply('❌ _Gagal mengambil info grup._')
  }

  const mentions  = participants.map(p => p.id)
  const typedText = m.text?.trim() || ''

  const isQuotedMedia = m.quoted && MEDIA_TYPES.includes(m.quoted.type)
  const isDirectMedia = MEDIA_TYPES.includes(m.type)

  if (isQuotedMedia || isDirectMedia) {
    try {
      const buffer   = isQuotedMedia ? await m.quoted.download() : await m.download()
      const realType = isQuotedMedia ? m.quoted.type : m.type

      if (realType === 'videoMessage') {
        return conn.sendMessage(m.from, { video: buffer, caption: typedText, mentions })
      }
      if (realType === 'audioMessage') {
        return conn.sendMessage(m.from, { audio: buffer, mimetype: 'audio/mpeg', mentions })
      }
      if (realType === 'stickerMessage') {
        return conn.sendMessage(m.from, { sticker: buffer, mentions })
      }
      return conn.sendMessage(m.from, { image: buffer, caption: typedText, mentions })

    } catch {}
  }

  const quotedText = m.quoted?.body || ''
  const finalText  = [quotedText, typedText].filter(Boolean).join('\n') || '\u200B'

  return conn.sendMessage(m.from, { text: finalText, mentions })
}

handler.command = /^(h|hidetag)$/i
handler.tags    = ['group']
handler.help    = ['h <pesan>', 'hidetag <pesan>']
handler.owner   = false
handler.premium = false
handler.limit   = false

export default handler