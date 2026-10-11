import { createBot, connectClient } from './lib/connection.js';
import { loadPlugins, startWatcher, handleMessage } from './handler.js';
import { toRawMessageShape } from './lib/waAdapter.js';
import config from './config.js';

export async function startBot() {
  console.log(`\n🚀 Memulai *${config.BOTNAME}* v${config.VERSION}...\n`);

  console.log('📂 Memuat plugin...');
  await loadPlugins();
  startWatcher();

  const { client, conn, store } = await createBot();

  client.on('message', async (event) => {
    try {
      if (!event.message) return;
      if (event.key?.remoteJid === 'status@broadcast') return;
      if (event.message?.protocolMessage) return;
      if (event.message?.reactionMessage) return;

      const raw = toRawMessageShape(event);
      await handleMessage(conn, raw, store);
    } catch (err) {
      console.error('❌ Error handling message:', err);
    }
  });

  await connectClient(client);

  return { client, conn, store };
}