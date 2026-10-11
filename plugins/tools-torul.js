import config from '../config.js'
import { sendQuickReplyButton } from '../lib/interactive.js'
import {
  catbox,
  litterbox,
  puticu,
  uguu,
  quax,
} from '../lib/scrape.js'

const EXT_MAP = {
  imageMessage   : 'jpg',
  videoMessage   : 'mp4',
  audioMessage   : 'mp3',
  documentMessage: 'bin',
  stickerMessage : 'webp',
}

const MIME_MAP = {
  imageMessage   : 'image/jpeg',
  videoMessage   : 'video/mp4',
  audioMessage   : 'audio/mpeg',
  documentMessage: 'application/octet-stream',
  stickerMessage : 'image/webp',
}

const UPLOAD_TIMEOUT = 25_000

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

const handler = async (m, { conn }) => {
  const isDirect = EXT_MAP[m.type]
  const isQuoted = m.quoted && EXT_MAP[m.quoted.type]

  if (!isDirect && !isQuoted) {
    return m.reply(
      `*UPLOAD TO URL*\n\n` +
      `Kirim atau reply gambar/video/audio/dokumen/stiker dengan *${m.prefix}${m.command}*\n\n` +
      `> ${config.WM}`
    )
  }

  const source = isQuoted ? m.quoted : m
  const type   = isQuoted ? m.quoted.type : m.type
  const ext    = EXT_MAP[type]
  const mime   = MIME_MAP[type]

  await conn.sendMessage(m.from, { react: { text: '⏳', key: m.key } })
  await m.reply('Mengunggah ke semua uploader, mohon tunggu...')

  try {
    const buffer = await source.download()
    if (!buffer || buffer.length < 10) throw new Error('Gagal download media')

    const uploaders = [
      { nama: 'Catbox',    fn: () => catbox(buffer, ext) },
      { nama: 'Litterbox', fn: () => litterbox(buffer, ext) },
      { nama: 'Put.icu',   fn: () => puticu(buffer, mime) },
      { nama: 'Uguu',      fn: () => uguu(buffer, ext) },
      { nama: 'Qu.ax',     fn: () => quax(buffer, ext) },
    ]

    const settled = await Promise.allSettled(
      uploaders.map(u => withTimeout(u.fn(), UPLOAD_TIMEOUT))
    )

    const berhasil = []
    const gagal    = []

    settled.forEach((res, i) => {
      const nama = uploaders[i].nama
      if (res.status === 'fulfilled' && res.value) {
        berhasil.push({ nama, url: res.value })
      } else {
        gagal.push(nama)
      }
    })

    if (!berhasil.length) {
      throw new Error('Semua uploader gagal, coba lagi nanti')
    }

    let caption =
      `*UPLOAD TO URL*\n\n` +
      `Berhasil: ${berhasil.length}/${uploaders.length}\n`
    if (gagal.length) {
      caption += `Gagal: ${gagal.join(', ')}\n`
    }
    caption += `\n`

    berhasil.forEach((b, i) => {
      caption += `${i + 1}. *${b.nama}*\n`
      caption += `${b.url}\n\n`
    })

    caption += `> ${config.WM}`

    try {
      await sendQuickReplyButton(conn, m.from, {
        text: caption,
        footer: 'Tekan tombol untuk menyalin link',
        buttons: berhasil.map(b => ({
          type: 'cta_copy',
          text: `Salin ${b.nama}`,
          id: `copy_${b.nama.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          copyCode: b.url,
        })),
        quoted: m,
      })
    } catch (e) {
      console.error('[tourl2] Gagal kirim tombol, fallback teks:', e.message)
      await conn.sendMessage(m.from, { text: caption }, { quoted: m })
    }

    await conn.sendMessage(m.from, { react: { text: '✅', key: m.key } })

  } catch (err) {
    console.error('[tourl2] Error:', err.message)
    await conn.sendMessage(m.from, { react: { text: '❌', key: m.key } })
    await m.reply(`Gagal upload.\n\nDetail: ${err.message}`)
  }
}

handler.command = /^tourl$/i
handler.tags    = ['tools']
handler.help    = ['tourl (reply media)']
handler.owner   = false
handler.premium = false
handler.limit   = 1

export default handler