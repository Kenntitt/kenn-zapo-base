import fs    from 'fs'
import path  from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

const API_URL = 'https://www.tikwm.com/api/'
const delay   = ms => new Promise(r => setTimeout(r, ms))

const HEADERS = {
  'User-Agent'     : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept'         : 'application/json, text/plain, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer'        : 'https://www.tikwm.com/',
}

function getTmpPath(ext) {
  const tmpDir = path.resolve(process.cwd(), 'tmp')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
  return path.join(tmpDir, `tt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`)
}

async function downloadToFile(url, ext) {
  const filePath = getTmpPath(ext)
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status} saat download ${url}`)
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(filePath))
  const buffer = fs.readFileSync(filePath)
  return { buffer, filePath }
}

async function getBuffer(url) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status} saat fetch ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

function fmt(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function cleanUrl(input) {
  let url = (input || '').trim()
  if (url.startsWith('ps://'))   url = 'htt' + url
  if (url.startsWith('ttp://'))  url = 'h' + url
  if (url.startsWith('ttps://')) url = 'h' + url
  url = url.replace(/[\u200B-\u200D\uFEFF]/g, '')
  return url
}

const handler = async (m, { conn }) => {
  const input = cleanUrl(m.text)

  if (!input || !input.includes('tiktok.com')) {
    return m.reply(
      `⚠️ Masukkan link TikTok yang valid!\n\n` +
      `📌 Contoh:\n` +
      `*${m.prefix}${m.command} https://vt.tiktok.com/xxxxx*`
    )
  }

  await conn.sendMessage(m.from, { react: { text: '⏳', key: m.key } })
  await m.reply('_⏳ Sedang mengunduh TikTok..._')

  let videoPath = null
  let audioPath = null

  try {
    const apiUrl = `${API_URL}?url=${encodeURIComponent(input)}`
    const res    = await fetch(apiUrl, { headers: HEADERS })
    const json   = await res.json()

    if (json?.code !== 0 || !json?.data) {
      throw new Error(json?.msg || 'API gagal mengambil konten')
    }

    const d = json.data

    const title    = d.title || ''
    const author   = d.author?.nickname || d.author?.unique_id || ''
    const duration = d.duration ? `${d.duration}s` : ''
    const likes    = fmt(d.digg_count)
    const views    = fmt(d.play_count)
    const comments = fmt(d.comment_count)
    const shares   = fmt(d.share_count)
    const audioUrl = d.music

    const caption =
      `🎵 *TikTok Downloader*\n\n` +
      (title    ? `📝 ${title}\n`    : '') +
      (author   ? `👤 ${author}\n`   : '') +
      (duration ? `⏱️ ${duration}\n` : '') +
      `\n❤️ ${likes}  👁️ ${views}  💬 ${comments}  🔗 ${shares}`

    const images = d.images

    if (Array.isArray(images) && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        try {
          const imgBuffer = await getBuffer(images[i])
          await conn.sendMessage(m.from, {
            image  : imgBuffer,
            caption: i === 0 ? caption : `🖼️ ${i + 1}/${images.length}`,
          }, { quoted: m })
          await delay(700)
        } catch {}
      }

      if (audioUrl) {
        try {
          const { buffer: audioBuf, filePath: aPath } = await downloadToFile(audioUrl, 'mp3')
          audioPath = aPath
          await conn.sendMessage(m.from, {
            audio   : audioBuf,
            mimetype: 'audio/mpeg',
            ptt     : false,
          }, { quoted: m })
        } catch {}
      }

    } else {
      const videoUrl = d.play
      if (!videoUrl) throw new Error('URL video tidak ditemukan di respons API')

      const { buffer: videoBuf, filePath: vPath } = await downloadToFile(videoUrl, 'mp4')
      videoPath = vPath

      if (!videoBuf || videoBuf.length < 100) throw new Error('Gagal mengunduh video (file kosong)')

      await conn.sendMessage(m.from, {
        video   : videoBuf,
        mimetype: 'video/mp4',
        caption,
      }, { quoted: m })

      if (audioUrl) {
        try {
          const { buffer: audioBuf, filePath: aPath } = await downloadToFile(audioUrl, 'mp3')
          audioPath = aPath
          await conn.sendMessage(m.from, {
            audio   : audioBuf,
            mimetype: 'audio/mpeg',
            ptt     : false,
          }, { quoted: m })
        } catch {}
      }
    }

    await conn.sendMessage(m.from, { react: { text: '✅', key: m.key } })

  } catch (err) {
    console.error('[tiktok] Error:', err.message)
    await conn.sendMessage(m.from, { react: { text: '❌', key: m.key } })
    await m.reply(`❌ Gagal download TikTok!\n_Detail: ${err.message}_`)

  } finally {
    if (videoPath) fs.unlink(videoPath, () => {})
    if (audioPath) fs.unlink(audioPath, () => {})
  }
}

handler.command = /^(tiktok|tt)$/i
handler.tags    = ['download']
handler.help    = ['tiktok <url>']
handler.owner   = false
handler.premium = false
handler.limit   = 1

export default handler