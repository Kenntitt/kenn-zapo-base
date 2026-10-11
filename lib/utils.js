import config from '../config.js';

export function normalizeJid(jid) {
  if (!jid) return null;
  if (jid.endsWith('@lid')) return null;
  return jid.replace(/:\d+@/, '@');
}

export function resolveSenderJid(raw) {
  const candidates = [
    raw.participantAlt,
    raw.key?.participant,
    raw.key?.remoteJid,
  ];
  for (const c of candidates) {
    if (!c) continue;
    if (c.endsWith('@lid')) continue;
    return c.replace(/:\d+@/, '@');
  }
  return null;
}

export function resolveChatJid(raw) {
  const c = raw.remoteJidAlt || raw.key?.remoteJid;
  if (!c) return null;
  if (c.endsWith('@lid')) return null;
  return c.replace(/:\d+@/, '@');
}

export function isOwner(jid) {
  if (!jid) return false;
  const number = jid.split('@')[0];
  return config.OWNER.some(owner => number.includes(owner.replace(/\D/g, '')));
}

export function jidToNumber(jid) {
  if (!jid) return null;
  return jid.split('@')[0].split(':')[0];
}

export function extractText(event) {
  const msg = event.message || {};
  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    ''
  );
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}