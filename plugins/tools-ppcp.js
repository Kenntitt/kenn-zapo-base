const handler = async (m, { conn }) => {
  await conn.sendMessage(m.from, { react: { text: '⏳', key: m.key } })

  try {
    const res  = await fetch('https://api.deline.web.id/random/ppcouple', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const data = await res.json()

    if (!data?.status || !data?.result) throw new Error('Gagal mendapatkan pasangan.')

    const { cowo, cewe } = data.result

    const [cowoRes, ceweRes] = await Promise.all([
      fetch(cowo, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
      fetch(cewe, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
    ])

    const [cowoBuf, ceweBuf] = await Promise.all([
      cowoRes.arrayBuffer().then(Buffer.from),
      ceweRes.arrayBuffer().then(Buffer.from),
    ])

    await conn.sendMessage(m.from, {
      image  : cowoBuf,
      caption: 'Cowok',
    }, { quoted: m })

    await conn.sendMessage(m.from, {
      image  : ceweBuf,
      caption: 'Cewek',
    }, { quoted: m })

    await conn.sendMessage(m.from, { react: { text: '✅', key: m.key } })

  } catch (err) {
    console.error('[ppcp] Error:', err.message)
    await conn.sendMessage(m.from, { react: { text: '❌', key: m.key } })
    await m.reply('Terjadi kesalahan saat mengambil PP Couple. Coba lagi nanti.')
  }
}

handler.command = /^ppcp$/i
handler.tags    = ['tools']
handler.help    = ['ppcp']
handler.owner   = false
handler.premium = false
handler.limit   = 1

export default handler