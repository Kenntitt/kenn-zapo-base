import config from '../config.js'

async function fetchBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

const handler = async (m, { conn }) => {
  const url = m.q?.trim() || ''

  if (!url) return m.reply(
    `*INSTAGRAM DOWNLOADER*\n\n` +
    `Kirim link Instagram.\n\n` +
    `Contoh:\n` +
    `◦ *${m.prefix}${m.command} https://www.instagram.com/reel/xxx*\n\n` +
    `> ${config.WM}`
  )

  if (!/instagram\.com/i.test(url)) {
    return m.reply('URL harus dari instagram.com.')
  }

  await conn.sendMessage(m.from, { react: { text: '⏳', key: m.key } })
  await m.reply('Mengambil media...')

  let result
  try {
    const apiUrl = `https://api.nexray.eu.cc/downloader/instagram?url=${encodeURIComponent(url)}`
    const res    = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const data = await res.json()

    if (!data?.status || !Array.isArray(data?.result) || !data.result.length) {
      throw new Error('Konten tidak ditemukan')
    }
    result = data.result
  } catch (e) {
    await conn.sendMessage(m.from, { react: { text: '❌', key: m.key } })
    return m.reply(`Gagal ambil data: ${e.message}`)
  }

  const caption =
    `*Instagram*\n\n` +
    `> ${config.WM}`

  for (const item of result) {
    try {
      const buffer = await fetchBuffer(item.url)

      if (item.type === 'video') {
        await conn.sendMessage(m.from, {
          video   : buffer,
          mimetype: 'video/mp4',
          caption,
        }, { quoted: m })
      } else {
        await conn.sendMessage(m.from, {
          image  : buffer,
          caption,
        }, { quoted: m })
      }
    } catch (e) {
      await m.reply(`Gagal kirim media: ${e.message}`)
    }
  }

  await conn.sendMessage(m.from, { react: { text: '✅', key: m.key } })
}

handler.command = /^(ig|instagram|insta)$/i
handler.tags    = ['download']
handler.help    = ['ig <url>']
handler.owner   = false
handler.premium = false
handler.limit   = 1

export default handler