import {
  WaClient,
  createStore,
  ConsoleLogger,
} from 'zapo-js';
import { createSqliteStore } from '@zapo-js/store-sqlite';
import NodeWebSocket from 'ws';
import { existsSync, mkdirSync } from 'fs';
import config from '../config.js';
import { createConn } from './waAdapter.js';

globalThis.WebSocket = function PatchedWebSocket(url, protocols, opts) {
  if (typeof protocols === 'object' && protocols !== null && !Array.isArray(protocols)) {
    opts = protocols;
    protocols = undefined;
  }
  opts = Object.assign({
    headers: {
      Origin: 'https://web.whatsapp.com',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  }, opts || {});
  return new NodeWebSocket(url, protocols || [], opts);
};
Object.assign(globalThis.WebSocket, NodeWebSocket);
for (const k of ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']) {
  globalThis.WebSocket[k] = NodeWebSocket[k];
}

for (const dir of ['./session', './database', './tmp']) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export async function createBot() {
  const zapoStore = createStore({
    backends: {
      sqlite: createSqliteStore({ path: `${config.SESSION}/state.sqlite` }),
    },
    providers: {
      auth: 'sqlite',
      signal: 'sqlite',
      preKey: 'sqlite',
      session: 'sqlite',
      identity: 'sqlite',
      senderKey: 'sqlite',
      appState: 'sqlite',
      privacyToken: 'sqlite',
      messages: 'none',
      threads: 'none',
      contacts: 'none',
    },
  });

  const logger = new ConsoleLogger('warn');

  const client = new WaClient(
    { store: zapoStore, sessionId: 'default', markOnlineOnConnect: false },
    logger
  );

  const conn = createConn(client, zapoStore);

  return { client, conn, store: zapoStore };
}

export async function connectClient(client) {
  const usePairing = config.USE_PAIRING_CODE === true;
  let pairingRequested = false;

  async function requestPairing() {
    if (!usePairing) return;
    if (pairingRequested) return;
    pairingRequested = true;

    const phone = config.BOTNUM.replace(/[^0-9]/g, '');
    try {
      const code = await client.auth.requestPairingCode(phone);
      const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
      console.log(`\n🔑 Pairing Code: ${formatted}\n`);
      console.log('Buka WhatsApp > Perangkat Tertaut > Tautkan dengan Nomor Telepon\n');
    } catch (e) {
      pairingRequested = false;
      console.error('[Bot] Gagal request pairing code:', e.message);
    }
  }

  client.on('auth_qr', async ({ qr }) => {
    if (!usePairing) {
      console.log('\n📱 Scan QR Code berikut:\n');
      try {
        const ascii = await (await import('qrcode')).default.toString(qr, {
          type: 'terminal',
          small: true,
        });
        console.log(ascii);
      } catch (e) {
        console.error('[QR] Gagal render:', e.message);
      }
      return;
    }
    await requestPairing();
  });

  client.on('auth_pairing_required', requestPairing);

  client.on('auth_paired', ({ credentials }) => {
    console.log(`✅ Berhasil dipasangkan sebagai ${credentials?.meJid || 'unknown'}`);
  });

  client.on('connection', async (event) => {
    if (event.status === 'connecting') {
      console.log('[Connection] Menghubungkan ke server WhatsApp...');
      return;
    }

    if (event.status === 'close') {
      console.log(`[Connection] Terputus. Reason: ${event.reason} · Code: ${event.code}`);

      if (event.isLogout) {
        console.log('[Connection] Logged out! Hapus folder session dan restart.');
        process.exit(1);
      } else {
        console.log('[Connection] Reconnecting dalam 5 detik...');
        setTimeout(() => connectClient(client), 5000);
      }
      return;
    }

    if (event.status === 'open') {
      const name = client.getCredentials()?.meJid || '?';
      console.log(`[Connection] ✓ Terkoneksi sebagai ${name}`);
    }
  });

  client.on('error', (err) => {
    console.error('⚠️ Error:', err?.message || err);
  });

  console.log('[Bot] Menghubungkan ke WhatsApp...');
  await client.connect();
}