import config from '../config.js'

const handler = async (m, { conn }) => {
  const owners = config.OWNER || []
  if (!owners.length) return m.reply('⚠️ _Owner belum di-set di config._')

  const contacts = owners.map((num, i) => {
    const name = owners.length > 1 ? `${config.OWNER_NAME} ${i + 1}` : config.OWNER_NAME
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:;${name};;;`,
      `FN:${name}`,
      `item1.TEL;waid=${num}:+${num}`,
      'item1.X-ABLabel:Ponsel',
      'END:VCARD',
    ].join('\n')

    return { displayName: name, vcard }
  })

  const contactMessage = contacts.length === 1
    ? { contactMessage: contacts[0] }
    : { contactsArrayMessage: { displayName: `${owners.length} Owner`, contacts } }

  await conn.sendMessage(m.from, contactMessage, { quoted: m })
}

handler.command  = /^owner$/i
handler.tags     = ['main']
handler.help     = ['owner']
handler.owner    = false
handler.premium  = false
handler.limit    = false

export default handler