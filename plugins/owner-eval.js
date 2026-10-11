import util from 'util'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import config from '../config.js'

const require = createRequire(import.meta.url)

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

const handler = async (m, { conn, store, plugins }) => {
  if (!m.isOwner) return

  const code = m.text?.trim()
  if (!code) return m.reply('⚠️ _Masukkan kode yang mau di-eval._')

  const body = code.startsWith('return') || code.includes('\n')
    ? code
    : `return (${code})`

  try {
    const fn = new AsyncFunction(
      'm', 'conn', 'store', 'plugins', 'config',
      'fs', 'path', 'util', 'require', 'fetch', 'Buffer', 'process',
      body
    )

    const result = await fn(
      m, conn, store, plugins, config,
      fs, path, util, require, fetch, Buffer, process
    )

    const out = util.inspect(result, { depth: null })
    await m.reply(out.length > 3000 ? out.slice(0, 3000) + '…' : out)
  } catch (e) {
    await m.reply(String(e))
  }
}

handler.help     = ['eval <code>']
handler.tags     = ['owner']
handler.command  = /^(eval|=>)$/i
handler.owner    = true
handler.premium  = false
handler.limit    = false
handler.noPrefix = true

export default handler