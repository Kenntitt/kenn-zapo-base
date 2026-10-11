import { buildImageHeader } from './mediaHeader.js'

function getClient(connOrClient) {
  return connOrClient?.rawClient || connOrClient
}

async function sendProto(connOrClient, jid, protoName, protoValue, opts = {}) {
  const client = getClient(connOrClient)
  if (!client?.message?.send) {
    throw new Error('interactive: client.message.send tidak tersedia')
  }

  const sendOpts = {}
  if (opts.quoted) sendOpts.quote = opts.quoted._zapoEvent || opts.quoted
  if (opts.mentions?.length) sendOpts.contextInfo = { mentionedJids: opts.mentions }
  if (opts.extraOptions) Object.assign(sendOpts, opts.extraOptions)

  const attempts = [
    { type: protoName.replace(/Message$/, '').replace(/^[A-Z]/, c => c.toLowerCase()), [protoName]: protoValue },
    { [protoName]: protoValue },
  ]

  let lastErr = null
  for (const payload of attempts) {
    try {
      return await client.message.send(jid, payload, sendOpts)
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr || new Error('interactive: semua payload gagal dikirim')
}

function toNativeFlowButton(b) {
  if (b.type === 'cta_url') {
    return { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: b.text, url: b.url }) }
  }
  if (b.type === 'cta_copy') {
    return { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id || 'copy', copy_code: b.copyCode }) }
  }
  if (b.type === 'cta_call') {
    return { name: 'cta_call', buttonParamsJson: JSON.stringify({ display_text: b.text, phone_number: b.phoneNumber }) }
  }
  if (b.type === 'cta_catalog') {
    return { name: 'cta_catalog', buttonParamsJson: JSON.stringify({ business_phone_number: b.phoneNumber }) }
  }
  if (b.type === 'send_location') {
    return { name: 'send_location', buttonParamsJson: JSON.stringify({}) }
  }
  return { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id || b.text }) }
}

export async function sendListButton(connOrClient, jid, opts) {
  const {
    text, caption, image, footer, buttonText, sections,
    mentions = [], quoted = null,
  } = opts

  const bodyText = caption ?? text ?? ''
  const header   = image ? await buildImageHeader(getClient(connOrClient), image) : null

  const interactiveMessage = {
    ...(header ? { header: { hasMediaAttachment: true, imageMessage: header } } : {}),
    body: { text: bodyText },
    ...(footer ? { footer: { text: footer } } : {}),
    nativeFlowMessage: {
      buttons: [{
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
          title: buttonText,
          sections: sections.map(sec => ({
            title: sec.title,
            rows: (sec.rows || []).map(r => ({
              header: '',
              title: r.title,
              description: r.description || '',
              id: r.id,
            })),
          })),
        }),
      }],
    },
    ...(mentions.length ? { contextInfo: { mentionedJid: mentions } } : {}),
  }

  return sendProto(connOrClient, jid, 'interactiveMessage', interactiveMessage, { quoted })
}

export const sendNativeFlow = sendListButton

export async function sendQuickReplyButton(connOrClient, jid, opts) {
  const { text, footer, buttons, image = null, mentions = [], quoted = null } = opts
  const header = image ? await buildImageHeader(getClient(connOrClient), image) : null

  const interactiveMessage = {
    ...(header ? { header: { hasMediaAttachment: true, imageMessage: header } } : {}),
    body: { text },
    ...(footer ? { footer: { text: footer } } : {}),
    nativeFlowMessage: { buttons: buttons.map(toNativeFlowButton) },
    ...(mentions.length ? { contextInfo: { mentionedJid: mentions } } : {}),
  }

  return sendProto(connOrClient, jid, 'interactiveMessage', interactiveMessage, { quoted })
}

export async function sendCtaButton(connOrClient, jid, opts) {
  const { text, title, footer, buttons, quoted = null } = opts

  const interactiveMessage = {
    header: { title: title || '', hasMediaAttachment: false },
    body: { text },
    ...(footer ? { footer: { text: footer } } : {}),
    nativeFlowMessage: { buttons: buttons.map(toNativeFlowButton) },
  }

  return sendProto(connOrClient, jid, 'interactiveMessage', interactiveMessage, { quoted })
}

export async function sendFakeLinkPreview(connOrClient, jid, opts) {
  const {
    text, title, body, thumbnail, thumbnailUrl = '',
    sourceUrl, mediaType = 1, quoted = null,
  } = opts

  const client = getClient(connOrClient)
  const sendOpts = {}
  if (quoted) sendOpts.quote = quoted._zapoEvent || quoted

  return client.message.send(jid, {
    type: 'text',
    text,
    contextInfo: {
      externalAdReply: {
        title,
        body,
        thumbnail,
        thumbnailUrl,
        sourceUrl,
        mediaType,
        renderLargerThumbnail: false,
        showAdAttribution: false,
      },
    },
  }, sendOpts)
}

export async function sendProductCard(connOrClient, jid, opts) {
  const {
    title, body, footer, price, currency = 'IDR',
    image, businessOwnerJid, quoted = null,
  } = opts

  const client = getClient(connOrClient)
  const productImage = image ? await buildImageHeader(client, image) : null

  const productMessage = {
    product: {
      productImage,
      title,
      description: body || '',
      currencyCode: currency,
      priceAmount1000: Math.round((price || 0) * 1000),
    },
    businessOwnerJid: businessOwnerJid || client.getCredentials?.()?.meJid,
    body: body || '',
    footer: footer || '',
  }

  return sendProto(connOrClient, jid, 'productMessage', productMessage, { quoted })
}

export async function sendPollButton(connOrClient, jid, opts) {
  const { name, values, selectableCount = 1, quoted = null } = opts

  const client = getClient(connOrClient)
  const sendOpts = {}
  if (quoted) sendOpts.quote = quoted._zapoEvent || quoted

  return client.message.send(jid, {
    type: 'poll',
    poll: { name, values, selectableCount },
  }, sendOpts)
}

export async function sendCarouselButton(connOrClient, jid, opts) {
  const { text, footer, cards, quoted = null } = opts
  const client = getClient(connOrClient)

  const cardList = await Promise.all(cards.map(async card => {
    const header = card.image ? await buildImageHeader(client, card.image) : null
    return {
      ...(header
        ? { header: { hasMediaAttachment: true, imageMessage: header } }
        : { header: { title: card.title || '', hasMediaAttachment: false } }
      ),
      body: { text: card.body || '' },
      nativeFlowMessage: {
        buttons: (card.buttons || []).map(toNativeFlowButton),
      },
    }
  }))

  const interactiveMessage = {
    body: { text },
    ...(footer ? { footer: { text: footer } } : {}),
    carouselMessage: { cards: cardList },
  }

  return sendProto(connOrClient, jid, 'interactiveMessage', interactiveMessage, { quoted })
}