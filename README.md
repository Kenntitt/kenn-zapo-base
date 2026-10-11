# 🚀 Kenn-Bot-Zapo

<div align="center">

**Base bot WhatsApp modern berbasis [zapo-js](https://zapo.to) dengan sistem plugin modular**

[![Node.js](https://img.shields.io/badge/Node.js-20.9%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/Version-2.0.0-orange?style=flat-square)]()
[![Library](https://img.shields.io/badge/Library-zapo--js-7b5cff?style=flat-square)](https://zapo.to)
[![Author](https://img.shields.io/badge/Author-KennDev-ff2d95?style=flat-square)]()

</div>

---

## 📖 Tentang

**Kenn-Bot-Zapo** adalah base bot WhatsApp yang dibangun di atas library **zapo-js** — library protokol WhatsApp Web modern yang mendukung **multi-device** secara native. Dirancang untuk siapa saja yang ingin membangun bot WhatsApp sendiri tanpa harus memulai dari nol.

Fokus utama:
- ⚡ **Ringan** — dependency minimal, startup cepat
- 🧩 **Modular** — semua fitur dalam bentuk plugin
- 🔥 **Hot-reload** — tambah/ubah plugin tanpa restart
- 🎯 **Sederhana** — konfigurasi minim, langsung jalan

---

## ✨ Fitur

### Inti
- 🔐 **Pairing Code** — Tautkan tanpa perlu scan QR
- 📱 **Multi-Device Native** — Support WA biasa & WA Business
- 🗄️ **SQLite Lokal** — Tanpa setup database eksternal
- 🔄 **Auto Reconnect** — Koneksi pulih otomatis saat putus
- 🎨 **Adapter Baileys-Style** — Plugin style Baileys tetap jalan

### Sistem Plugin
- 📂 **Drop-in Plugin** — Simpan file di `plugins/`, langsung aktif
- 🔥 **Chokidar Hot-Reload** — Ubah file → reload otomatis
- 🏷️ **Metadata Lengkap** — Command, tags, help, permission
- 🎣 **Hook before** — Intercept semua pesan masuk
- 🚫 **No-Prefix Mode** — Command tanpa prefix untuk kasus khusus

### Manajemen User
- 👑 **Role System** — Owner, Premium, Member
- 💰 **Limit & Balance** — Batasan harian + saldo
- 📈 **Level & Exp** — Sistem progression
- 💤 **AFK Mode** — Auto-notif saat di-mention
- 🚫 **Blacklist** — Ban user dari bot

### Manajemen Grup
- 🔒 **Open/Close Group** — Kunci grup via command
- 👋 **Welcome/Leave** — Pesan otomatis member masuk/keluar
- 🔇 **Mute Member** — Bisukan user tertentu
- 🚫 **Ban Feature** — Matikan command tertentu di grup
- 💳 **Sewa Bot** — Sistem sewa dengan auto-kick saat expired

### Plugin Bawaan

| Kategori | Plugin |
|---|---|
| General | menu, ping, me, afk, cekuser |
| Owner | owner, exec, eval, addsewa, delsewa, listsewa, sfp |
| Admin | closegc, opengc, hidetag |
| Download | tiktok, instagram, splay |
| Maker | stiker, wm, iqcpink, makethumb |
| Tools | tourl2, ppcp |

---

## 🚀 Instalasi

### Prasyarat
- Node.js versi 20.9.0 atau lebih baru
- npm / yarn / pnpm

### Langkah

git clone https://github.com/KennDev/kenn-bot-zapo
cd kenn-bot-zapo
npm install
npm start

Edit config.js dulu untuk isi BOTNUM dan OWNER.

### Pairing

Saat bot dijalankan, pairing code 8 digit akan muncul di terminal:

🔑 Pairing Code: XXXX-XXXX

Buka WhatsApp → Perangkat Tertaut → Tautkan dengan Nomor Telepon → masukkan kode.

---

## ⚙️ Konfigurasi

Semua pengaturan ada di config.js:

const config = {
  BOTNAME:      'Kenn-Bot-Zapo',
  BOTNUM:       '628xxxxxxxxxx',
  PREFIX:       ['.', '!', '#'],
  OWNER:        ['628xxxxxxxxxx'],
  OWNER_NAME:   'KennDev',
  WM:           '© Kenn-Bot-Zapo by KennDev',
  USE_PAIRING_CODE: true,
  TIMEZONE:     'Asia/Jakarta',
  SELF:         false,
  LIMIT:        true,
  FREE_LIMIT:   25,
  PREMIUM_LIMIT: 150,
}

---

## 📁 Struktur Proyek

kenn-bot-zapo/
├── database/              SQLite + JSON storage
├── session/               Sesi zapo-js
├── lib/
│   ├── connection.js      Koneksi & pairing
│   ├── waAdapter.js       Adapter Baileys-style
│   ├── serialize.js       Parser pesan masuk
│   ├── interactive.js     Button & interactive message
│   ├── mediaHeader.js     Helper upload media header
│   ├── scrape.js          Scraper & uploader
│   ├── utils.js           Utility functions
│   ├── db.js              Limit database
│   └── database/
│       ├── userdb.js      User database
│       ├── chat.js        Chat counter
│       ├── groupdb.js     Group settings
│       └── sewadb.js      Sewa database
├── plugins/               Semua fitur bot
├── index.js               Entry point
├── main.js                Startup bot
├── handler.js             Core prosesor
├── config.js              Konfigurasi
├── package.json
└── README.md

---

## 🧩 Membuat Plugin

Buat file baru di folder plugins/, contoh plugins/hello.js:

const handler = async (m, { conn, args }) => {
  const name = args[0] || m.pushName
  await m.reply(`Halo ${name}!`)
}

handler.command = /^(hello|hi)$/i
handler.tags    = ['utility']
handler.help    = ['hello <nama>']
handler.owner   = false
handler.premium = false
handler.limit   = false

export default handler

Plugin otomatis dimuat tanpa restart. Kalau file diubah, chokidar akan reload juga.

### Properti Handler

| Properti | Tipe | Deskripsi |
|---|---|---|
| command | RegExp | Pattern untuk match command |
| tags | Array | Kategori plugin (untuk menu) |
| help | Array | Nama command untuk ditampilkan di menu |
| owner | Boolean | true = hanya owner |
| premium | Boolean | true = hanya premium |
| limit | Number/Boolean | Cost limit, false = gratis |
| noPrefix | Boolean | true = tidak butuh prefix |
| before | Function | Hook tiap pesan masuk |

### Konteks m

| Properti | Deskripsi |
|---|---|
| m.from | JID chat asal |
| m.sender | JID pengirim |
| m.senderNum | Nomor pengirim (tanpa JID) |
| m.pushName | Nama profil pengirim |
| m.isOwner / m.isPremium | Status user |
| m.isGroup / m.isBot | Boolean |
| m.isAdmin / m.isBotAdmin | Status admin grup |
| m.type | Tipe pesan (imageMessage, dll.) |
| m.text / m.q | Teks setelah command |
| m.args | Array argumen |
| m.quoted | Objek pesan yang di-reply |
| m.mentionedJid | Array JID yang di-mention |
| m.download() | Download media pesan ini |
| m.reply(text) | Balas pesan |

### Parameter Kedua

{ conn, store, plugins, config, args, command }

---

## 🛠️ Development

npm run dev          Development dengan auto-reload Node.js
npm run start:pm2    Production via PM2

---

## 📚 Dokumentasi Library

- zapo-js — https://zapo.to
- @napi-rs/canvas — https://napi.rs

---

## ⚠️ Disclaimer

Bot ini menggunakan API tidak resmi WhatsApp Web. Gunakan dengan bijak.

- Risiko ban dari WhatsApp ditanggung sendiri
- Dilarang untuk spam, scraping massal, atau aktivitas ilegal
- Penulis tidak bertanggung jawab atas penyalahgunaan

---

## 🤝 Kontribusi

Kontribusi selalu welcome! Ikuti langkah berikut:

1. Fork repository
2. Buat branch baru (git checkout -b fitur-baru)
3. Commit perubahan (git commit -m 'Tambah fitur X')
4. Push ke branch (git push origin fitur-baru)
5. Buat Pull Request

Untuk plugin baru, pastikan mengikuti struktur handler di atas.

---

## 📄 Lisensi

Project ini dilisensikan di bawah MIT License — lihat file LICENSE untuk detail.

---

Dibuat dengan ❤️ oleh KennDev

⭐ Kalau project ini bermanfaat, jangan lupa kasih star!
