import fs from 'fs'
import path from 'path'

const PLUGIN_DIR = path.resolve(process.cwd(), 'plugins')

const handler = async (m) => {
  if (!m.q) {
    throw `Nama file mana?\n\nCara pakai:\n.sfp <namafile.js>\n\nContoh:\n.sfp storyanime.js`
  }
  if (!m.quoted?.body) {
    throw `Balas pesan kode plugin dulu!`
  }

  const rawName = m.q.trim()
  const filename = rawName.endsWith('.js') ? rawName : rawName + '.js'

  if (!/^[a-zA-Z0-9_\-]+\.js$/.test(filename)) {
    throw `❌ Nama file tidak valid!\nHanya boleh huruf, angka, underscore, dan dash.`
  }

  if (!fs.existsSync(PLUGIN_DIR)) {
    fs.mkdirSync(PLUGIN_DIR, { recursive: true })
  }

  const kode = m.quoted.body.trim()

  if (!kode.includes('export default')) {
    throw `❌ Kode plugin tidak valid!\nHarus mengandung *export default*.`
  }

  const fullPath = path.join(PLUGIN_DIR, filename)
  const isUpdate = fs.existsSync(fullPath)

  fs.writeFileSync(fullPath, kode)

  await m.reply(
    `╭━━━〔 *💾 PLUGIN DISIMPAN* 〕━━━⬣\n` +
    `┃\n` +
    `┃ 📁 File   : *${filename}*\n` +
    `┃ 📂 Folder : *plugins/*\n` +
    `┃ 🔄 Status : *${isUpdate ? 'Diperbarui' : 'Baru'}*\n` +
    `┃ 📦 Size   : *${(Buffer.byteLength(kode) / 1024).toFixed(2)} KB*\n` +
    `┃\n` +
    `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
    `_Plugin otomatis di-reload oleh chokidar._`
  )
}

handler.command = /^(sfp)$/i
handler.tags    = ['owner']
handler.help    = ['sfp <file.js>']
handler.owner   = true
handler.premium = false
handler.limit   = false

export default handler;