export function toBaileysGroupMetadata(meta) {
  if (!meta) return meta;
  return {
    ...meta,
    id: meta.jid,
    subject: meta.subject,
    owner: meta.owner,
    desc: meta.desc,
    participants: (meta.participants || []).map(p => ({
      ...p,
      id: p.jid,
      phoneNumber: p.phoneNumber,
      admin: p.isSuperAdmin ? 'superadmin' : (p.isAdmin ? 'admin' : null),
    })),
  };
}

function groupListToBaileysMap(groups) {
  const out = {};
  for (const g of groups || []) {
    if (!g?.jid) continue;
    out[g.jid] = toBaileysGroupMetadata(g);
  }
  return out;
}

export function toRawMessageShape(event) {
  const key = event.key || {};
  return {
    key: {
      remoteJid: key.remoteJid,
      id: key.id,
      fromMe: key.fromMe,
      participant: key.participant,
    },
    participantAlt: key.participantAlt,
    remoteJidAlt: key.remoteJidAlt,
    message: event.message,
    pushName: event.pushName,
    messageTimestamp: event.timestampSeconds,
    _zapoEvent: event,
  };
}

async function unwrapMediaSource(src) {
  if (src == null) return src;
  if (Buffer.isBuffer(src) || src instanceof Uint8Array) return src;
  if (typeof src === 'string') return src;
  if (src.url) {
    const res = await fetch(src.url);
    if (!res.ok) throw new Error(`Gagal download media dari URL: HTTP ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }
  if (src.stream) return src.stream;
  return src;
}

function guessMimetype(source, kind) {
  const buf = Buffer.isBuffer(source) ? source : null;
  if (buf && buf.length >= 12) {
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif';
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp';
    if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) return 'video/mp4';
    if (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) return 'video/webm';
    if (buf[0] === 0x4F && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) return 'audio/ogg; codecs=opus';
    if ((buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) ||
        (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0)) return 'audio/mpeg';
    if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'application/pdf';
  }

  return {
    image: 'image/jpeg',
    video: 'video/mp4',
    audio: 'audio/ogg; codecs=opus',
    sticker: 'image/webp',
    document: 'application/octet-stream',
  }[kind] || 'application/octet-stream';
}

async function translateContent(content, options = {}) {
  const contextInfo = { ...(content.contextInfo || {}), ...(options.contextInfo || {}) };

  const mentions = content.mentions || options.mentions;
  if (mentions?.length) contextInfo.mentionedJids = mentions;

  const sendOptions = { contextInfo: Object.keys(contextInfo).length ? contextInfo : undefined };
  if (options.quoted) sendOptions.quote = options.quoted._zapoEvent || options.quoted;
  if (options.id) sendOptions.id = options.id;

  if (content.contactMessage) {
    return [{
      type: 'contact',
      contactMessage: content.contactMessage,
      contextInfo: sendOptions.contextInfo,
    }, sendOptions];
  }

  if (content.contactsArrayMessage) {
    return [{
      type: 'contacts',
      contactsArrayMessage: content.contactsArrayMessage,
      contextInfo: sendOptions.contextInfo,
    }, sendOptions];
  }

  if (typeof content.text === 'string' && !content.image && !content.video && !content.audio) {
    return [{ type: 'text', text: content.text, contextInfo: sendOptions.contextInfo }, sendOptions];
  }

  if (content.react) {
    return [{
      type: 'reaction',
      emoji: content.react.text || '',
      target: content.react.key,
    }, sendOptions];
  }

  if (content.delete) {
    return [{ type: 'revoke', target: content.delete }, sendOptions];
  }

  if (content.edit) {
    sendOptions.editKey = content.edit;
    return [{ type: 'text', text: content.text, contextInfo: sendOptions.contextInfo }, sendOptions];
  }

  if (content.image) {
    const media = await unwrapMediaSource(content.image);
    return [{
      type: 'image',
      media,
      mimetype: content.mimetype || guessMimetype(media, 'image'),
      caption: content.caption,
      contextInfo: sendOptions.contextInfo,
    }, sendOptions];
  }

  if (content.video) {
    const media = await unwrapMediaSource(content.video);
    return [{
      type: 'video',
      media,
      mimetype: content.mimetype || guessMimetype(media, 'video'),
      caption: content.caption,
      gifPlayback: content.gifPlayback,
      contextInfo: sendOptions.contextInfo,
    }, sendOptions];
  }

  if (content.audio) {
    const media = await unwrapMediaSource(content.audio);
    return [{
      type: 'audio',
      media,
      mimetype: content.mimetype || guessMimetype(media, 'audio'),
      ptt: !!content.ptt,
    }, sendOptions];
  }

  if (content.sticker) {
    const media = await unwrapMediaSource(content.sticker);
    return [{
      type: 'sticker',
      media,
      mimetype: content.mimetype || guessMimetype(media, 'sticker'),
    }, sendOptions];
  }

  if (content.document) {
    const media = await unwrapMediaSource(content.document);
    return [{
      type: 'document',
      media,
      mimetype: content.mimetype || guessMimetype(media, 'document'),
      fileName: content.fileName,
      caption: content.caption,
      contextInfo: sendOptions.contextInfo,
    }, sendOptions];
  }

  return [content, sendOptions];
}

export function createConn(client, store) {
  const conn = {
    rawClient: client,

    get user() {
      const creds = client.getCredentials?.();
      return creds?.meJid ? { id: creds.meJid } : undefined;
    },

    async sendMessage(jid, content, options = {}) {
      const [zapoContent, zapoOptions] = await translateContent(content, options);
      const result = await client.message.send(jid, zapoContent, zapoOptions);
      return {
        ...result,
        key: { remoteJid: jid, id: result?.id, fromMe: true },
      };
    },

    async groupMetadata(jid) {
      const meta = await client.group.queryGroupMetadata(jid);
      return toBaileysGroupMetadata(meta);
    },

    async groupFetchAllParticipating() {
      const groups = await client.group.queryAllGroups();
      return groupListToBaileysMap(groups);
    },

    async groupParticipantsUpdate(jid, participants, action) {
      const fn = {
        add: client.group.addParticipants,
        remove: client.group.removeParticipants,
        promote: client.group.promoteParticipants,
        demote: client.group.demoteParticipants,
      }[action];
      if (!fn) throw new Error(`[waAdapter] Aksi groupParticipantsUpdate tidak dikenal: ${action}`);
      return fn(jid, participants);
    },

    async groupSettingUpdate(jid, setting) {
      const map = {
        announcement: () => client.group.setSetting(jid, 'announcement', true),
        not_announcement: () => client.group.setSetting(jid, 'announcement', false),
        locked: () => client.group.setSetting(jid, 'restrict', true),
        unlocked: () => client.group.setSetting(jid, 'restrict', false),
      };
      const fn = map[setting];
      if (!fn) throw new Error(`[waAdapter] groupSettingUpdate setting tidak dikenal: ${setting}`);
      return fn();
    },

    async groupLeave(jid) {
      return client.group.leaveGroup([jid]);
    },

    async groupInviteCode(jid) {
      return client.group.queryInviteCode(jid);
    },

    async groupRevokeInvite(jid) {
      const result = await client.group.revokeInvite(jid);
      return result?.code ?? result;
    },

    async groupGetInviteInfo(code) {
      const info = await client.group.queryGroupInviteInfo(code);
      return toBaileysGroupMetadata(info);
    },

    async groupAcceptInvite(code) {
      const meta = await client.group.joinGroupViaInvite(code);
      return meta?.jid;
    },

    async sendPresenceUpdate(type, jid) {
      if (type === 'available' || type === 'unavailable') {
        return client.presence.send(type);
      }
      return client.presence.sendChatstate(jid, { state: type });
    },

    async readMessages(keys) {
      return client.message.sendReceipt(
        keys[0]?.remoteJid,
        keys.map(k => k.id),
        { type: 'read' }
      );
    },

    async profilePictureUrl(jid) {
      const result = await client.profile.getProfilePicture(jid);
      return result?.url;
    },

    async updateProfilePicture(jid, buffer) {
      return client.profile.setProfilePicture(buffer, jid);
    },

    async updateMediaMessage() {
      throw new Error('[waAdapter] updateMediaMessage belum didukung di zapo-js');
    },

    async newsletterMetadata(mode, key) {
      if (typeof client.newsletter.fetchMetadata === 'function') {
        return client.newsletter.fetchMetadata(mode, key);
      }
      throw new Error('[waAdapter] newsletterMetadata tidak tersedia di versi ini');
    },

    async requestPairingCode(phone) {
      return client.auth.requestPairingCode(phone);
    },

    async relayMessage(jid, protoMessage, opts = {}) {
      return client.message.send(jid, protoMessage, { id: opts.messageId });
    },

    waUploadToServer: null,

    async uploadMedia(source, options) {
      const resolved = await unwrapMediaSource(source);
      const opts = { ...options };
      if (!opts.mimetype) opts.mimetype = guessMimetype(resolved, opts.type);
      return client.message.upload(resolved, opts);
    },

    signalRepository: {
      lidMapping: {
        async getPNForLID(lidJid) {
          const groups = store?.groupMetadata || {};
          for (const meta of Object.values(groups)) {
            const p = meta?.participants?.find(pp => pp.jid === lidJid || pp.id === lidJid);
            if (p?.phoneNumber) return p.phoneNumber;
          }
          return null;
        },
      },
    },
  };

  return conn;
}