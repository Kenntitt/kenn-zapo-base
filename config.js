const config = {
  BOTNAME: 'Kenn bot',
  BOTNUM: '6288987481123',
  PREFIX: ['.', '!', '#'],
  VERSION: '5.0.0',
  AUTHOR: 'KennDev',
  OWNER: ['6288994213122'],
  OWNER_NAME: 'Kenn',
  WM: '© Kenn',
  PACKNAME: 'Kenn',
  IS_BUSINESS: false,
  USE_PAIRING_CODE: true,
  APIKEY: '',
  API_URL: 'https://api.betabotz.eu.org',
  AKSES_KEY: '',
  TIMEZONE: 'Asia/Jakarta',
  SELF: false,
  READMSG: false,
  READSTORY: false,
  AUTOACCEPT: false,
  LIMIT: true,
  FREE_LIMIT: 25,
  PREMIUM_LIMIT: 150,
  STARTING_BALANCE: 1000,
  STARTING_EXP: 0,
  EXP_PER_LEVEL: 500,
  SESSION: './session'
};

config.fkontak = {
  key: { remoteJid: 'status@broadcast', fromMe: false, id: 'Tayak' },
  message: {
    contactMessage: {
      vcard: [
        'BEGIN:VCARD', 'VERSION:3.0', 'N:Dev;Kenn;;;',
        `FN:${config.OWNER_NAME}`,
        `item1.TEL;waid=${config.OWNER[0]}:+${config.OWNER[0]}`,
        'item1.X-ABLabel:Ponsel', 'END:VCARD'
      ].join('\n')
    }
  },
  participant: `${config.OWNER[0]}@s.whatsapp.net`
};

config.fakestatus = (txt = config.BOTNAME) => ({
  key: { remoteJid: '0@s.whatsapp.net', participant: '0@s.whatsapp.net', id: 'Kenn' },
  message: { conversation: txt }
});

export default config;