import os from 'os'
import fs from 'fs'
import path from 'path'
import config from '../config.js'

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

function bar(percent, length = 12) {
  const filled = Math.round((percent / 100) * length)
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, length - filled))
}

const handler = async (m, { conn }) => {
  const start   = Date.now()
  await m.reply('🏓 Mengukur...')
  const latency = Date.now() - start

  const mem      = process.memoryUsage()
  const cpus     = os.cpus()
  const loadavg  = os.loadavg()
  const cpuPct   = Math.min(100, (loadavg[0] / cpus.length) * 100)
  const totalMem = os.totalmem()
  const usedMem  = totalMem - os.freemem()
  const ramPct   = (usedMem / totalMem) * 100
  const heapPct  = (mem.heapUsed / mem.heapTotal) * 100

  const gb = b => (b / 1024 / 1024 / 1024).toFixed(2)
  const mb = b => (b / 1024 / 1024).toFixed(2)

  const caption =
    `*SYSTEM STATUS*\n\n` +
    `◦ *Latensi*  : ${latency} ms\n` +
    `◦ *Uptime*   : ${formatUptime(process.uptime())}\n` +
    `◦ *Platform* : ${os.platform()} ${os.arch()}\n` +
    `◦ *Node*     : ${process.version}\n` +
    `◦ *CPU*      : ${cpus.length} core · Load ${loadavg[0].toFixed(2)}\n` +
    `◦ *PID*      : ${process.pid}\n\n` +

    `◦ *CPU*  ${cpuPct.toFixed(1)}%\n` +
    `${bar(cpuPct)}\n\n` +

    `◦ *RAM*  ${gb(usedMem)} / ${gb(totalMem)} GB\n` +
    `${bar(ramPct)}\n\n` +

    `◦ *HEAP* ${mb(mem.heapUsed)} / ${mb(mem.heapTotal)} MB\n` +
    `${bar(heapPct)}\n\n` +

    `> ${config.WM}`

  let imgBuf = null
  try {
    const thumbPath = path.resolve(process.cwd(), 'database', 'thumb.jpg')
    if (fs.existsSync(thumbPath)) imgBuf = fs.readFileSync(thumbPath)
  } catch {}

  if (imgBuf) {
    await conn.sendMessage(m.from, {
      image  : imgBuf,
      caption,
    }, { quoted: m })
  } else {
    await conn.sendMessage(m.from, { text: caption }, { quoted: m })
  }
}

handler.command = /^ping$/i
handler.tags    = ['main']
handler.help    = ['ping']
handler.owner   = false
handler.premium = false
handler.limit   = false

export default handler