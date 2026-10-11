import fs      from 'fs'
import path    from 'path'
import moment  from 'moment-timezone'
import config  from '../config.js'
import { getLimitEntry } from '../lib/db.js'
import { getLimitBonus } from '../lib/database/userdb.js'
import { sendQuickReplyButton } from '../lib/interactive.js'

const handler = async (m, { conn, plugins }) => {
  const { sender, senderNum, pushName, isOwner, isPremium } = m

  const tz        = config.TIMEZONE || 'Asia/Jakarta'
  const time      = moment.tz(tz).format('HH.mm.ss')
  const date      = moment.tz(tz).format('DD MMM YYYY')
  const uptime    = process.uptime()
  const h         = Math.floor(uptime / 3600)
  const min       = Math.floor((uptime % 3600) / 60)
  const s         = Math.floor(uptime % 60)
  const uptimeStr = `${h}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  const role       = isOwner ? '👑 Owner' : isPremium ? '⭐ Premium' : '👤 Member'
  const limitEntry = getLimitEntry(sender)
  const maxLimit   = isOwner ? '∞' : isPremium ? config.PREMIUM_LIMIT : config.FREE_LIMIT
  const bonus      = isOwner ? 0 : getLimitBonus(sender)
  const totalMax   = isOwner ? '∞' : (typeof maxLimit === 'number' ? maxLimit + bonus : maxLimit)

  const prefixList = Array.isArray(config.PREFIX) ? config.PREFIX : [config.PREFIX]
  const prefixShow = prefixList.join(' ')
  const prefixMain = prefixList[0]

  const cats = {}
  for (const { plugin } of plugins) {
    if (!plugin.help?.length || !plugin.tags?.length) continue
    const tag = plugin.tags[0]
    cats[tag] = cats[tag] || []
    cats[tag].push(plugin.help[0])
  }
  const totalCmds = Object.values(cats).reduce((a, b) => a + b.length, 0)

  const caption =
    `Hi @${senderNum} 👋\n` +
    `I am an automated system (WhatsApp Bot) that can help to do something, search and get data / information only through WhatsApp.\n\n` +
    `◦ *Library:* Zapo-js\n` +
    `◦ *Function:* Assistant\n\n` +
    `◦ Uptime  : ${uptimeStr}\n` +
    `◦ Tanggal : ${date}\n` +
    `◦ Waktu   : ${time}\n` +
    `◦ Prefix  : [ ${prefixShow} ]\n\n` +
    `◦ *Nama   :* ${pushName}\n` +
    `◦ *Role   :* ${role}\n` +
    `◦ *Limit  :* ${limitEntry.count}/${totalMax}\n` +
    `◦ *Plugin :* ${totalCmds} command\n\n` +
    `> ${config.WM}`

  let imgBuf = null
  try {
    const thumbPath = path.resolve(process.cwd(), 'database', 'thumb.jpg')
    if (fs.existsSync(thumbPath)) imgBuf = fs.readFileSync(thumbPath)
  } catch {}

  try {
    await sendQuickReplyButton(conn, m.from, {
      text: caption,
      image: imgBuf,
      footer: config.WM,
      buttons: [
        { type: 'quick_reply', text: ' All Menu', id: `${prefixMain}allmenu` },
        { type: 'quick_reply', text: ' Owner',    id: `${prefixMain}owner` },
      ],
      mentions: [`${senderNum}@s.whatsapp.net`],
      quoted: m,
    })
  } catch {
    let fallback = caption + '\n\n'
    for (const [cat, cmds] of Object.entries(cats)) {
      fallback += `*[ MENU ${cat.toUpperCase()} ]*\n`
      fallback += cmds.map(c => `◦ ${prefixMain}${c}`).join('\n') + '\n\n'
    }
    await m.reply(fallback.trim())
  }
}

handler.command = /^(menu)$/i
handler.tags    = ['main']
handler.help    = ['menu']
handler.owner   = false
handler.premium = false
handler.limit   = false

export default handler