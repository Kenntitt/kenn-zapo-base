import { readdirSync }  from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import chalk             from 'chalk'
import chokidar          from 'chokidar'
import { serialize }     from './lib/serialize.js'
import { deductLimit, isLimitExceeded, getLimitEntry } from './lib/db.js'
import { getLimitBonus, getUser, updateUser,
         isAfk, unsetAfk, getAfk, getAfkMentions, isBanned } from './lib/database/userdb.js'
import { incrementChat } from './lib/database/chat.js'
import { getGroupSetting, isFeatureBanned, isMemberMuted } from './lib/database/groupdb.js'
import config            from './config.js'
import { isSewa }        from './lib/database/sewadb.js'

function formatDuration(ms) {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  const parts = []
  if (h) parts.push(`${h} jam`)
  if (m) parts.push(`${m} menit`)
  if (s || !parts.length) parts.push(`${s} detik`)
  return parts.join(' ')
}

const __dirname  = dirname(fileURLToPath(import.meta.url))
const PLUGIN_DIR = join(__dirname, 'plugins')

export const plugins = []

async function loadOne(fullPath) {
  const rel = fullPath.replace(PLUGIN_DIR, '').replace(/^[\\/]/, '').replace(/\\/g, '/')
  const url = `./plugins/${rel}?t=${Date.now()}`
  try {
    const mod    = await import(url)
    const plugin = mod.default
    if (typeof plugin !== 'function')        throw new Error('export default bukan function')
    if (!(plugin.command instanceof RegExp)) throw new Error('handler.command bukan RegExp')
    return { plugin, rel }
  } catch (e) {
    console.error(chalk.red(`[Plugin] ✗ ${rel} —`), e.message)
    return null
  }
}

export async function loadPlugins() {
  plugins.length = 0

  const files = readdirSync(PLUGIN_DIR)
    .filter(f => f.endsWith('.js'))
    .map(f => join(PLUGIN_DIR, f))

  let loaded = 0
  for (const fullPath of files) {
    const result = await loadOne(fullPath)
    if (!result) continue
    plugins.push({ regex: result.plugin.command, file: result.rel, plugin: result.plugin })
    loaded++
    console.log(chalk.gray(`[Plugin] ✓ ${result.rel}`))
  }

  console.log(chalk.green(`[Plugin] ${loaded} plugin dimuat\n`))
}

export function startWatcher() {
  const watcher = chokidar.watch(PLUGIN_DIR, {
    ignored:        /(^|[/\\])\..|(\.bak$)/,
    persistent:     true,
    ignoreInitial:  true,
    depth:          1,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval:       100,
    },
  })

  watcher.on('add', async fullPath => {
    if (!fullPath.endsWith('.js')) return
    const result = await loadOne(fullPath)
    if (!result) return

    const idx = plugins.findIndex(p => p.file === result.rel)
    if (idx !== -1) {
      plugins[idx] = { regex: result.plugin.command, file: result.rel, plugin: result.plugin }
      console.log(chalk.cyan(`[HotReload] 🔄 ${result.rel} — diperbarui (${plugins.length} aktif)`))
    } else {
      plugins.push({ regex: result.plugin.command, file: result.rel, plugin: result.plugin })
      console.log(chalk.cyan(`[HotReload] ➕ ${result.rel} — ditambahkan (${plugins.length} aktif)`))
    }
  })

  watcher.on('change', async fullPath => {
    if (!fullPath.endsWith('.js')) return
    const result = await loadOne(fullPath)
    if (!result) return

    const idx = plugins.findIndex(p => p.file === result.rel)
    if (idx !== -1) {
      plugins[idx] = { regex: result.plugin.command, file: result.rel, plugin: result.plugin }
    } else {
      plugins.push({ regex: result.plugin.command, file: result.rel, plugin: result.plugin })
    }
    console.log(chalk.cyan(`[HotReload] 🔄 ${result.rel} — diperbarui (${plugins.length} aktif)`))
  })

  watcher.on('unlink', fullPath => {
    if (!fullPath.endsWith('.js')) return
    const rel = fullPath.replace(PLUGIN_DIR, '').replace(/^[\\/]/, '').replace(/\\/g, '/')
    const idx = plugins.findIndex(p => p.file === rel)
    if (idx !== -1) {
      plugins.splice(idx, 1)
      console.log(chalk.yellow(`[HotReload] 🗑  ${rel} — dihapus (${plugins.length} aktif)`))
    }
  })

  watcher.on('error', err => console.error(chalk.red('[HotReload] Error:'), err.message))

  console.log(chalk.magenta('[HotReload]  Chokidar aktif — plugins/ dipantau\n'))
  return watcher
}

export async function handleMessage(conn, rawMsg, store) {
  try {
    const m = await serialize(rawMsg, conn, store)
    if (!m) return

    if (m.pushName && m.sender && !getUser(m.sender).name) {
      updateUser(m.sender, { name: m.pushName })
    }

    if (m.from === 'status@broadcast') return
    if (m.isBot) return

    const blPluginCmds = ['blacklist', 'bl', 'unblacklist', 'unbl', 'blacklistlist', 'bllist']
    if (!m.isOwner && isBanned(m.sender) && !blPluginCmds.includes(m.command?.toLowerCase())) {
      return
    }

    if (m.isGroup) { incrementChat(m.from, m.sender) }

    for (const { plugin } of plugins) {
      if (typeof plugin.before !== 'function') continue
      try { await plugin.before(m, { conn, store, plugins }) } catch (e) {
        console.error(`[before] Error di plugin:`, e.message)
      }
    }

    if (m.isGroup && !m.isOwner && !m.isAdmin && getGroupSetting(m.from, 'antitagsw')) {
      if (m.type === 'groupStatusMentionMessage') {
        if (m.isBotAdmin) {
          await conn.sendMessage(m.from, { delete: m.key }).catch(() => {})
        }
        await conn.sendMessage(m.from, {
          text:
            `📵 *Anti Tag Status WA*\n\n` +
            `@${m.sender.split('@')[0]} dilarang men-tag/mention *Status WA* ke grup ini!` +
            (m.isBotAdmin ? '\n_Notifikasi status telah dihapus._' : ''),
          mentions: [m.sender],
        }).catch(() => {})
        return
      }
    }

    if (config.READMSG) {
      await conn.readMessages([m.key]).catch(() => {})
    }

    if (isAfk(m.sender) && m.command?.toLowerCase() !== 'afk') {
      const afkData = getAfk(m.sender)
      unsetAfk(m.sender)
      await conn.sendMessage(m.from, {
        text:
          `✅ *${m.pushName} kembali aktif!*\n\n` +
          `📝 Alasan AFK: _${afkData.reason}_\n` +
          `🕒 Durasi AFK: _${formatDuration(Date.now() - afkData.since)}_`,
        mentions: [m.sender],
      }).catch(() => {})
    }

    if (m.mentionedJid?.length) {
      const afkMentions = getAfkMentions(m.mentionedJid)
      for (const { jid, data } of afkMentions) {
        await conn.sendMessage(m.from, {
          text:
            `😴 *${jid.split('@')[0]} sedang AFK!*\n\n` +
            `📝 Alasan: _${data.reason}_\n` +
            `🕒 Sudah AFK: _${formatDuration(Date.now() - data.since)}_`,
          mentions: [jid],
        }, { quoted: m }).catch(() => {})
      }
    }

    if (config.SELF && !m.isOwner) return

    const fullInput = m.command || ''

    if (!m.isCmd) {
      if (!m.isOwner) {
        const hasNoPrefix = plugins.some(({ regex, plugin }) =>
          plugin.noPrefix && regex.test(fullInput)
        )
        if (!hasNoPrefix) return
      }
      if (!fullInput && m.type !== 'stickerMessage') return
      if (m.isGroup && !m.isOwner && !isSewa(m.from)) return

      for (const { regex, plugin } of plugins) {
        if (!plugin.noPrefix) continue
        if (!regex.test(fullInput)) continue
        if (plugin.owner && !m.isOwner) continue
        if (plugin.premium && !m.isPremium) continue
        try { await plugin(m, { conn, store, plugins }) } catch {}
      }
      return
    }

    if (!fullInput) return

    const matched = plugins.find(({ regex, plugin }) => {
      if (plugin.noPrefix) return false
      return regex.test(fullInput)
    })
    if (!matched) return

    const { plugin } = matched

    if (m.isGroup && !m.isOwner && !isSewa(m.from)) return

    if (plugin.owner && !m.isOwner) {
      return m.reply(`❌ Perintah *${m.prefix}${m.command}* hanya untuk *Owner Bot*!`)
    }

    if (plugin.premium && !m.isPremium) {
      return m.reply(
        `╭━━━〔 ⭐ PREMIUM 〕━━━⬣\n` +
        `┃\n` +
        `┃  Perintah ini khusus pengguna\n` +
        `┃  *Premium*. Hubungi owner untuk\n` +
        `┃  upgrade akun kamu!\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━⬣`
      )
    }

    const limitCost = typeof plugin.limit === 'number' ? plugin.limit : plugin.limit ? 1 : 0

    if (config.LIMIT && limitCost > 0 && !m.isOwner) {
      const maxLimit  = m.isPremium ? config.PREMIUM_LIMIT : config.FREE_LIMIT
      if (isLimitExceeded(m.sender, maxLimit)) {
        const entry    = getLimitEntry(m.sender)
        const bonus    = getLimitBonus(m.sender)
        const totalMax = maxLimit + bonus
        return m.reply(
          `╭━━━〔 ❌ LIMIT HABIS 〕━━━⬣\n` +
          `┃\n` +
          `┃  Limit harianmu sudah habis!\n` +
          `┃  Terpakai : ${entry.count}/${totalMax}\n` +
          `┃  Reset    : Setiap hari 00:00\n` +
          `┃\n` +
          `╰━━━━━━━━━━━━━━━⬣`
        )
      }
    }

    const now     = new Date()
    const ts      = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')} ` +
                    `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
    const msgSize = JSON.stringify(rawMsg).length
    const chatName = m.isGroup
      ? (store?.contacts?.[m.from]?.name || store?.contacts?.[m.from]?.notify || m.from.split('@')[0])
      : (m.pushName || m.senderNum)
    const senderJid = m.sender.split('@')[0]

    console.log([
      chalk.bgCyan.black(` ${m.type} `),
      chalk.gray('─'.repeat(30) + '...'),
      '',
      chalk.gray('□') + ' ' + chalk.bold.white(chatName.toUpperCase()),
      chalk.gray('⏱') + ' ' + chalk.bgYellow.black(` ${ts} `),
      chalk.gray('📋'),
      chalk.green(`📊${msgSize} [${Math.ceil(msgSize/1024)} B]`),
      chalk.blue(`👤 ${m.senderNum}`) + ' ' + chalk.gray(`~${m.pushName || m.senderNum}`),
      chalk.yellow(`✏️ ${m.prefix || ''}${m.command}`),
      chalk.gray(`👥 ${senderJid} ~${senderJid}`),
      chalk.bgCyan.black(` ${m.type} `),
      '',
    ].join('\n'))

    if (m.isGroup && isMemberMuted(m.from, m.senderNum)) {
      await m.reply('🔇 _Kamu di-mute oleh admin, tidak bisa menggunakan bot di grup ini._')
      return
    }

    if (m.isGroup && isFeatureBanned(m.from, m.command)) {
      await m.reply(`🚫 _Fitur *${m.prefix}${m.command}* dinonaktifkan di grup ini._`)
      return
    }

    await plugin(m, { conn, store, plugins })

    if (config.LIMIT && limitCost > 0 && !m.isOwner) {
      deductLimit(m.sender, limitCost)
    }

  } catch (err) {
    console.error(chalk.red('[Handler] Error:'), err.message)
    try {
      const m = await serialize(rawMsg, conn, store)
      if (m?.reply) m.reply(`❌ Error:\n\`\`\`${err.message}\`\`\``)
    } catch {}
  }
}