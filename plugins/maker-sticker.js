import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import config from '../config.js'

async function createSticker(buffer) {
  const sticker = new Sticker(buffer, {
    pack   : config.OWNER_NAME,
    author : config.WM,
    type   : StickerTypes.FULL,
    quality: 70,
  })
  return await sticker.toBuffer()
}

const handler = async (m, { conn }) => {
  const mediaType       = m.type === 'imageMessage' ? 'image' : m.type === 'videoMessage' ? 'video' : null
  const quotedMediaType = m.quoted?.type === 'imageMessage' ? 'image' : m.quoted?.type === 'videoMessage' ? 'video' : null

  if (!mediaType && !quotedMediaType) {
    return m.reply(
      `*STIKER*\n\n` +
      `Kirim gambar/video + caption *${m.prefix}${m.command}*\n` +
      `Atau reply gambar/video dengan *${m.prefix}${m.command}*\n\n` +
      `Gambar → stiker biasa\n` +
      `Video/GIF → stiker animasi\n\n` +
      `> ${config.WM}`
    )
  }

  await conn.sendMessage(m.from, { react: { text: '⏳', key: m.key } })

  try {
    let buffer

    if (quotedMediaType && m.quoted?.content) {
      buffer = await m.quoted.download()
    } else {
      buffer = await m.download()
    }

    const stickerBuffer = await createSticker(buffer)

    await conn.sendMessage(m.from, { react: { text: '✅', key: m.key } })
    await conn.sendMessage(m.from, { sticker: stickerBuffer }, { quoted: m })

  } catch (e) {
    console.error('[stiker] Error:', e.message)
    await conn.sendMessage(m.from, { react: { text: '❌', key: m.key } })
    await m.reply(`Gagal membuat stiker.\n\nDetail: ${e.message}`)
  }
}

handler.command = /^(stiker|s)$/i
handler.tags    = ['maker']
handler.help    = ['stiker']
handler.owner   = false
handler.premium = false
handler.limit   = 1

export default handler