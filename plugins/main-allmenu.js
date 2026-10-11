import fs from 'fs';
import path from 'path';
import moment from 'moment-timezone';
import config from '../config.js';
import { getLimitEntry } from '../lib/db.js';
import { getLimitBonus } from '../lib/database/userdb.js';

const handler = async (m, { conn, plugins }) => {
  const { sender, senderNum, pushName, isOwner, isPremium } = m;

  const tz = config.TIMEZONE || 'Asia/Jakarta';
  const time = moment.tz(tz).format('HH.mm.ss');
  const date = moment.tz(tz).format('DD MMM YYYY');
  const uptime = process.uptime();
  const h = Math.floor(uptime / 3600);
  const min = Math.floor((uptime % 3600) / 60);
  const s = Math.floor(uptime % 60);
  const uptimeStr = `${h}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  const role = isOwner ? '👑 Owner' : isPremium ? '⭐ Premium' : '👤 Member';
  const limitEntry = getLimitEntry(sender);
  const maxLimit = isOwner ? '∞' : isPremium ? config.PREMIUM_LIMIT : config.FREE_LIMIT;
  const bonus = isOwner ? 0 : getLimitBonus(sender);
  const totalMax = isOwner ? '∞' : (typeof maxLimit === 'number' ? maxLimit + bonus : maxLimit);

  const cats = {};
  for (const { plugin } of plugins) {
    if (!plugin.help?.length || !plugin.tags?.length) continue;
    const tag = plugin.tags[0];
    cats[tag] = cats[tag] || [];
    cats[tag].push(plugin.help[0]);
  }
  const totalCmds = Object.values(cats).reduce((a, b) => a + b.length, 0);

  let imgBuf = null;
  try {
    const thumbPath = path.resolve(process.cwd(), 'database', 'thumb.jpg');
    if (fs.existsSync(thumbPath)) imgBuf = fs.readFileSync(thumbPath);
  } catch {}

  const prefixList = Array.isArray(config.PREFIX) ? config.PREFIX : [config.PREFIX];
  const prefixShow = prefixList.join(' ');

  let text =
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
    `◦ *Plugin :* ${totalCmds} command\n`;

  for (const [cat, cmds] of Object.entries(cats)) {
    const label = cat.charAt(0).toUpperCase() + cat.slice(1);
    text += `\n*[ MENU ${label.toUpperCase()} ]*\n`;
    text += cmds.map(c => `◦ ${prefixList[0]}${c}`).join('\n') + '\n';
  }

  text += `\n> ${config.WM}`;

  try {
    if (imgBuf) {
      await conn.sendMessage(m.from, {
        image: imgBuf,
        caption: text,
        mentions: [`${senderNum}@s.whatsapp.net`]
      }, { quoted: m });
    } else {
      await conn.sendMessage(m.from, {
        text,
        mentions: [`${senderNum}@s.whatsapp.net`]
      }, { quoted: m });
    }
  } catch {
    await m.reply(text);
  }
};

handler.command = /^allmenu$/i;
handler.tags = ['main'];
handler.help = ['allmenu'];
handler.owner = false;
handler.premium = false;
handler.limit = false;

export default handler;