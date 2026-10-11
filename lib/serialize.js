import { getContentType, isGroupJid, downloadMediaMessage } from 'zapo-js'
import config from '../config.js'
import { readDb } from './db.js'

function getPrefix(text) {
  if (!text) return null
  const prefixes = Array.isArray(config.PREFIX) ? config.PREFIX : [config.PREFIX]
  for (const p of prefixes) {
    if (text.startsWith(p)) return p
  }
  return null
}

function unwrapMessage(msg) {
  if (!msg) return msg
  if (msg.viewOnceMessage?.message)            return unwrapMessage(msg.viewOnceMessage.message)
  if (msg.viewOnceMessageV2?.message)          return unwrapMessage(msg.viewOnceMessageV2.message)
  if (msg.ephemeralMessage?.message)           return unwrapMessage(msg.ephemeralMessage.message)
  if (msg.documentWithCaptionMessage?.message) return unwrapMessage(msg.documentWithCaptionMessage.message)
  return msg
}

export function normalizeJid(jid) {
  if (!jid || typeof jid !== 'string') return ''
  const [raw, server] = jid.split('@')
  if (!server) return jid
  const num = raw.split(':')[0]
  if (server === 'lid') return `${num}@s.whatsapp.net`
  return `${num}@${server}`
}

export function jidToNumber(jid) {
  return normalizeJid(jid).split('@')[0]
}

export function isSameUser(a, b) {
  const nA = jidToNumber(a)
  const nB = jidToNumber(b)
  return !!(nA && nB && nA === nB)
}

function resolveLid(jid, altJid) {
  if (!jid || !jid.includes('@lid')) return jid
  if (altJid) return normalizeJid(altJid)
  return normalizeJid(jid)
}

function resolveGroupLid(participantJid, groupJid, store) {
  if (!participantJid || !participantJid.includes('@lid')) return normalizeJid(participantJid)

  const stripDevice = j => (j || '').split(':')[0].split('@')[0]
  const targetLid    = stripDevice(participantJid)

  const meta = store?.groupMetadata?.[groupJid]
  const p = meta?.participants?.find(pp => {
    const pid = stripDevice(pp.id || pp.jid || '')
    return pid === targetLid
  })

  if (p?.phoneNumber) {
    const num = String(p.phoneNumber).replace(/[^0-9]/g, '')
    if (num) return `${num}@s.whatsapp.net`
  }

  return normalizeJid(participantJid)
}

export async function serialize(raw, conn, store) {
  if (!raw?.message) return null

  const ts  = Number(raw.messageTimestamp)
  const now = Math.floor(Date.now() / 1000)
  if (ts && Math.abs(now - ts) > 600) return null

  if (raw.message?.pollUpdateMessage)     return null
  if (raw.message?.pinInChatMessage)      return null
  if (raw.message?.stickerSyncRmrMessage) return null

  const body = unwrapMessage(raw.message)
  const type = getContentType(body)
  if (!type) return null

  const content = body[type]

  const from    = raw.key.remoteJid
  const isGroup = isGroupJid(from)

  const rawSender = isGroup
    ? (raw.key.participant || raw.participant || '')
    : from

  const altJid    = isGroup ? raw.participantAlt : raw.remoteJidAlt
  const sender    = resolveLid(rawSender, altJid)
  const senderNum = jidToNumber(sender)

  let fullText = ''
  switch (type) {
    case 'conversation':
      fullText = body.conversation || ''; break
    case 'extendedTextMessage':
      fullText = content?.text || ''; break
    case 'imageMessage':
    case 'videoMessage':
    case 'documentMessage':
    case 'audioMessage':
      fullText = content?.caption || ''; break
    case 'buttonsResponseMessage':
      fullText = content?.selectedButtonId || ''; break
    case 'listResponseMessage':
      fullText = content?.singleSelectReply?.selectedRowId || ''; break
    case 'templateButtonReplyMessage':
      fullText = content?.selectedId || ''; break
    case 'interactiveResponseMessage': {
      const rawP = content?.nativeFlowResponseMessage?.paramsJson || ''
      try {
        const parsed = JSON.parse(rawP)
        fullText = parsed?.id || parsed?.body || rawP
      } catch {
        fullText = rawP
      }
      break
    }
    default:
      fullText = ''
  }

  const prefix  = getPrefix(fullText)
  const isCmd   = !!prefix
  const trimmed = fullText.slice(prefix?.length || 0).trim()
  const cmdEnd  = trimmed.search(/\s|$/)
  const command = trimmed.slice(0, cmdEnd).toLowerCase()
  const text    = trimmed.slice(cmdEnd).replace(/^\s/, '')
  const args    = text.trim() ? text.trim().split(/\s+/) : []
  const q       = text

  const ownerList = readDb('owner',   [])
  const premList  = readDb('premium', [])

  const allOwners = [...new Set([
    ...(config.OWNER || []),
    ...ownerList,
  ])]

  const isOwner = allOwners.some(o => {
    const oNum = String(o).replace(/[^0-9]/g, '')
    return oNum === senderNum
  })

  const isPremium = isOwner || premList.some(p => {
    const pNum = String(p).replace(/[^0-9]/g, '')
    return pNum === senderNum
  })

  const isBot = raw.key.fromMe

  let quoted = null
  const ctx = content?.contextInfo
  if (ctx?.quotedMessage) {
    const qRaw     = ctx.quotedMessage
    const qBody    = unwrapMessage(qRaw)
    const qType    = getContentType(qBody) || ''
    const qContent = qBody?.[qType]

    const qSender = resolveGroupLid(ctx.participant || '', from, store)
    const botIdForQuoted = normalizeJid(conn.user?.id || '')

    quoted = {
      type:    qType,
      message: qBody,
      sender:  qSender,
      body:    qBody?.conversation || qBody?.extendedTextMessage?.text || qContent?.caption || '',
      content: qContent || null,
      key: {
        remoteJid:   from,
        fromMe:      !!(qSender && botIdForQuoted && isSameUser(qSender, botIdForQuoted)),
        id:          ctx.stanzaId || '',
        participant: ctx.participant || '',
      },
      download: () => _downloadQuoted(qBody, qType),
    }
  }

  const MEDIA_TYPES = ['imageMessage','videoMessage','audioMessage','documentMessage','stickerMessage']
  const isMedia  = MEDIA_TYPES.includes(type)
  const mimetype = isMedia ? (content?.mimetype || '') : ''

  const download = isMedia
    ? () => _downloadMedia(content, type.replace('Message', ''))
    : null

  const mentionedJid = (ctx?.mentionedJid || []).filter(j => j && typeof j === 'string').map(j => resolveGroupLid(j, from, store))

  let groupMetadata = null
  let isAdmin       = false
  let isBotAdmin    = false

  if (isGroup) {
    try {
      groupMetadata = await conn.groupMetadata(from)

      if (groupMetadata && store?.groupMetadata) {
        store.groupMetadata[from] = groupMetadata
      }
    } catch {
      groupMetadata = store?.groupMetadata?.[from] || null
    }

    if (groupMetadata) {
      const botId = normalizeJid(conn.user?.id || '')

      const matchParticipant = (p, target) => {
        if (!target || typeof target !== 'string') return false
        if (p.id && typeof p.id === 'string' && isSameUser(normalizeJid(p.id), target)) return true
        if (p.phoneNumber && typeof p.phoneNumber === 'string' && isSameUser(normalizeJid(p.phoneNumber), target)) return true
        return false
      }

      isAdmin    = groupMetadata.participants?.some(p =>
        matchParticipant(p, sender) && p.admin
      ) ?? false

      isBotAdmin = groupMetadata.participants?.some(p =>
        matchParticipant(p, botId) && p.admin
      ) ?? false
    }
  }

  const reply = (text, opts = {}) =>
    conn.sendMessage(from, { text: String(text) }, { quoted: raw, ...opts })

  return {
    ...raw,

    type, body, isMedia, mimetype, download,

    from, sender, senderNum,
    isGroup, isBot,

    pushName: raw.pushName || senderNum,
    isOwner, isPremium,

    isAdmin, isBotAdmin, groupMetadata,

    prefix, isCmd, command, args, text, q,

    quoted, mentionedJid,

    reply,
  }
}

async function _downloadMedia(msgContent, mediaType) {
  const protoMessage = { [`${mediaType}Message`]: msgContent }
  const stream = await downloadMediaMessage(protoMessage)
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

async function _downloadQuoted(qBody, qType) {
  return _downloadMedia(qBody[qType], qType.replace('Message', ''))
}