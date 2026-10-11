import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import sharp                      from 'sharp'
import config                     from '../config.js'

const handler = async (m, { conn }) => {
  const isSticker       = m.type === 'stickerMessage'
  const quotedIsSticker = m.quoted?.type === 'stickerMessage'

  if (!isSticker && !quotedIsSticker) {
    return m.reply(
      `*WATERMARK STIKER*\n\n` +
      `Reply/kirim stiker dengan caption:\n` +
      `◦ *${m.prefix}${m.command} Nama*\n` +
      `◦ *${m.prefix}${m.command} Nama|Author*\n\n` +
      `Contoh: *${m.prefix}${m.command} Tes|KennDev*\n\n` +
      `> ${config.WM}`
    )
  }

  const raw      = m.text?.trim() || ''
  const parts    = raw.split('|').map(s => s.trim())
  const packname = parts[0] || config.PACKNAME || config.OWNER_NAME
  const author   = parts[1] || config.AUTHOR

  await conn.sendMessage(m.from, { react: { text: '⏳', key: m.key } })

  try {
    const buffer = quotedIsSticker
      ? await m.quoted.download()
      : await m.download()

    let isAnimated = false
    try {
      const meta = await sharp(buffer).metadata()
      isAnimated = meta.pages > 1
    } catch {}

    let processed
    try {
      if (isAnimated) {
        processed = await sharp(buffer, { animated: true })
          .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp({ quality: 60, animated: true })
          .toBuffer()
      } else {
        processed = await sharp(buffer)
          .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp({ quality: 60 })
          .toBuffer()
      }
    } catch {
      processed = buffer
    }

    const sticker = new Sticker(processed, {
      pack    : packname,
      author  : author,
      type    : StickerTypes.FULL,
      quality : 60,
    })

    const stickerBuf = await sticker.toBuffer()

    await conn.sendMessage(m.from, { react: { text: '✅', key: m.key } })
    await conn.sendMessage(m.from, { sticker: stickerBuf }, { quoted: m })

  } catch (e) {
    console.error('[wm] Error:', e.message)
    await conn.sendMessage(m.from, { react: { text: '❌', key: m.key } })
    return m.reply(`Gagal ganti watermark.\n\nDetail: ${e.message}`)
  }
}

handler.command = /^wm$/i
handler.tags    = ['tools']
handler.help    = ['wm Nama|Author']
handler.owner   = false
handler.premium = false
handler.limit   = 1

export default handler