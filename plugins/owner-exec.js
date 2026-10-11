import { exec } from 'child_process'

const handler = async (m, { conn }) => {
  if (!m.isOwner) return

  const { q, reply } = m

  if (!q?.trim()) {
    return reply('⚠️ _Masukkan perintah!_\n\n💬 Contoh: _.exec ls -la_')
  }

  await conn.sendMessage(m.from, { react: { text: '⏳', key: m.key } })

  exec(q.trim(), async (err, stdout, stderr) => {
    const out    = err ? String(err) : (stdout || stderr || '(no output)')
    const result = out.length > 3000 ? out.slice(0, 3000) + '…' : out

    await conn.sendMessage(m.from, { react: { text: err ? '❌' : '✅', key: m.key } })
    await reply('```' + result + '```')
  })
}

handler.command  = /^(exec|\$)$/i
handler.tags     = ['owner']
handler.help     = ['exec <perintah>']
handler.owner    = true
handler.premium  = false
handler.limit    = false
handler.noPrefix = true

export default handler;