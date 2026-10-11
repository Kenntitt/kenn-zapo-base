const handler = async (m, { conn }) => {
  const query = m.text?.trim()

  if (!query) {
    return m.reply(
      `❌ _Masukkan judul lagu!_\n\n` +
      `📖 *Contoh:* _${m.prefix + m.command} Mangu_`
    )
  }

  await conn.sendMessage(m.from, { react: { text: '🔍', key: m.key } })

  let result
  try {
    const apiUrl = `https://api.nexray.eu.cc/downloader/spotifyplay?q=${encodeURIComponent(query)}`
    const res    = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const data = await res.json()

    if (!data?.status || !data?.result) throw new Error('Lagu tidak ditemukan')
    if (!data.result.download_url)      throw new Error('Link download tidak tersedia')

    result = data.result
  } catch (e) {
    await conn.sendMessage(m.from, { react: { text: '❌', key: m.key } })
    return m.reply(`❌ _${e.message}_`)
  }

  const caption =
    `🎵 *${result.title}*\n` +
    `◧ *Artist*    : ${result.artist}\n` +
    `◧ *Album*     : ${result.album}\n` +
    `◧ *Duration*  : ${result.duration}\n` +
    `◧ *Released*  : ${result.release_at}\n` +
    `◧ *Popularity*: ${'🔥'.repeat(Math.round(result.popularity / 20))} ${result.popularity}/100`

  try {
    const thumbRes = await fetch(result.thumbnail)
    const thumbBuf = Buffer.from(await thumbRes.arrayBuffer())
    await conn.sendMessage(m.from, {
      image  : thumbBuf,
      caption,
    }, { quoted: m })
  } catch {
    await conn.sendMessage(m.from, { text: caption }, { quoted: m })
  }

  let audioBuffer
  try {
    const audioRes = await fetch(result.download_url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    audioBuffer = Buffer.from(await audioRes.arrayBuffer())
    if (audioBuffer.length < 1000) throw new Error('File audio kosong/rusak')
  } catch (e) {
    await conn.sendMessage(m.from, { react: { text: '❌', key: m.key } })
    return m.reply(`❌ _Gagal download: ${e.message}_`)
  }

  await conn.sendMessage(m.from, {
    audio   : audioBuffer,
    mimetype: 'audio/mpeg',
    fileName: `${result.title}.mp3`,
    ptt     : false,
  }, { quoted: m })

  await conn.sendMessage(m.from, { react: { text: '✅', key: m.key } })
}

handler.command = /^splay$/i
handler.tags    = ['download']
handler.help    = ['splay <judul lagu>']
handler.owner   = false
handler.premium = false
handler.limit   = 2

export default handler