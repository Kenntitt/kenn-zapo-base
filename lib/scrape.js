import { load }    from 'cheerio'
import { LRUCache } from 'lru-cache'
import { createHash } from 'crypto'
import ytsearch    from 'yt-search'

const MINUTE = 60 * 1000
const UA     = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
const delay  = ms => new Promise(r => setTimeout(r, ms))

const YTCache = new LRUCache({
   max: 256,
   ttl: 30 * MINUTE,
   updateAgeOnGet: false,
   updateAgeOnHas: false,
   ttlAutopurge: true
})

let cheerioLoader = load

function isURL(str) {
   return typeof str === 'string' && /^https?:\/\//i.test(str.trim())
}

function bufToBlob(buffer, mime = 'application/octet-stream') {
   return new Blob([buffer], { type: mime })
}

// ── Uploaders ─────────────────────────────────────────────────────────────

export const catbox = async (buffer, ext = 'jpg') => {
   if (!(buffer instanceof Buffer))
      throw new TypeError('Invalid input type, expects buffer')

   const form = new FormData()
   form.append('reqtype', 'fileupload')
   form.append('fileToUpload', bufToBlob(buffer, 'application/octet-stream'), `${Date.now()}.${ext}`)

   const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      headers: {
         Origin: 'https://catbox.moe',
         Referer: 'https://catbox.moe/',
         'User-Agent': UA
      },
      body: form
   })

   const data = (await res.text()).trim()
   if (!isURL(data))
      throw new Error('Invalid response')

   return data
}

export const litterbox = async (buffer, ext = 'jpg') => {
   if (!(buffer instanceof Buffer))
      throw new TypeError('Invalid input type, expects buffer')

   const form = new FormData()
   form.append('reqtype', 'fileupload')
   form.append('time', '72h')
   form.append('fileToUpload', bufToBlob(buffer, 'application/octet-stream'), `${Date.now()}.${ext}`)

   const res = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
      method: 'POST',
      headers: {
         Origin: 'https://litterbox.catbox.moe',
         Referer: 'https://litterbox.catbox.moe/',
         'User-Agent': UA
      },
      body: form
   })

   const data = (await res.text()).trim()
   if (!isURL(data))
      throw new Error('Invalid response')

   return data
}

export const puticu = async (buffer, mime = 'application/octet-stream') => {
   if (!(buffer instanceof Buffer))
      throw new TypeError('Invalid input type, expects buffer')

   const res = await fetch('https://put.icu/upload/', {
      method: 'PUT',
      headers: {
         Accept: 'application/json',
         'Content-Type': mime
      },
      body: buffer
   })

   const json = await res.json()
   const resultUrl = json?.direct_url || json?.url

   if (!resultUrl)
      throw new Error('Invalid response')

   return resultUrl.trim()
}

export const uguu = async (buffer, ext = 'jpg') => {
   if (!(buffer instanceof Buffer))
      throw new TypeError('Invalid input type, expects buffer')

   const form = new FormData()
   form.append('files[]', bufToBlob(buffer, 'application/octet-stream'), `${Date.now()}.${ext}`)

   const res = await fetch('https://uguu.se/upload.php', {
      method: 'POST',
      headers: {
         Origin: 'https://uguu.se',
         Referer: 'https://uguu.se/',
         'User-Agent': UA
      },
      body: form
   })

   const json = await res.json()
   const resultUrl = json?.files?.[0]?.url

   if (!resultUrl)
      throw new Error('Invalid response')

   return resultUrl.trim()
}

export const quax = async (buffer, ext = 'jpg') => {
   if (!(buffer instanceof Buffer))
      throw new TypeError('Invalid input type, expects buffer')

   const form = new FormData()
   form.append('files[]', bufToBlob(buffer, 'application/octet-stream'), `${Date.now()}.${ext}`)

   const res = await fetch('https://qu.ax/upload.php', {
      method: 'POST',
      headers: {
         Origin: 'https://qu.ax',
         Referer: 'https://qu.ax/',
         'User-Agent': UA
      },
      body: form
   })

   const json = await res.json()
   const resultUrl = json?.files?.[0]?.url
   if (!resultUrl)
      throw new Error('Invalid response')

   return resultUrl
}

// ── Instagram Reels/Post ──────────────────────────────────────────────────

export const reelsvideo = async (url) => {
   const timestampMs = Date.now() / 1000 | 0

   const res = await fetch('https://reelsvideo.io/reel/DUU67gXiTwU/?igsh=MTZxdm1yd3pnN3Rvdg==/', {
      method: 'POST',
      headers: {
         Accept: '*/*',
         'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
         'Hx-Request': 'true',
         'Hx-Current-Url': 'https://reelsvideo.io/',
         'Hx-Target': 'target',
         Origin: 'https://reelsvideo.io',
         Referer: 'https://reelsvideo.io/',
         'User-Agent': UA
      },
      body: new URLSearchParams({
         id: url,
         locale: 'en',
         'cf-turnstile-response': '',
         tt: createHash('md5')
            .update(timestampMs + 'X-Fc-Pp-Ty-eZ')
            .digest('hex'),
         ts: timestampMs
      })
   })

   const html = await res.text()
   const $ = cheerioLoader(html)

   const username = $('.bg-white span.text-400-16-18').first().text().trim() || null

   const media = []
   $('a.type_videos').each((_, el) => {
      const href = $(el).attr('href')
      if (href)
         media.push({
            type: 'video',
            url: href
         })
   })

   $('a.type_images').each((_, el) => {
      const href = $(el).attr('href')
      if (href)
         media.push({
            type: 'image',
            url: href
         })
   })

   $('a.type_audio').each((_, el) => {
      const href = $(el).attr('href')
      const id = $(el).attr('data-id')
      if (href && id)
         media.push({
            id,
            type: 'audio',
            url: href
         })
   })

   return {
      username,
      media
   }
}

// ── Musik / Sticker search ────────────────────────────────────────────────

export const meloboom = async (query) => {
   const res = await fetch(`https://meloboom.com/en/search/${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': UA }
   })
   const html = await res.text()
   const $ = cheerioLoader(html)

   const result = []
   $('#__next > main > section > div.jsx-2244708474.container > div > div > div > div:nth-child(4) > div > div > div > ul > li').each((a, b) => {
      result.push({
         title: $(b).find('h4').text(),
         source: 'https://meloboom.com/'+$(b).find('a').attr('href'),
         audio: $(b).find('audio').attr('src')
      })
   })

   if (!result.length)
      throw new Error('Failed to get data')

   return result
}

export const getStickerPack = Object.freeze({
   search: async (query) => {
      const res = await fetch('https://getstickerpack.com/api/v1/stickerdb/search', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            query,
            page: Math.floor(Math.random() * 3) + 1
         })
      })

      const json = await res.json()
      const data = json?.data

      if (!data?.length)
         throw new Error('Failed to get data')

      return data
   },
   detail: async (slug) => {
      const res = await fetch('https://getstickerpack.com/api/v1/stickerdb/stickers/' + slug)

      const json = await res.json()
      const data = json?.data

      if (!data?.images?.length)
         throw new Error('Failed to get data')

      return data
   }
})

export const stickerLy = async (query) => {
   const res = await fetch('https://api.sticker.ly/v4/stickerPack/smartSearch', {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
         'User-Agent': 'androidapp.stickerly/3.17.0 (Linux; Android 10; Redmi Note 8 Build/QKQ1.200114.002; wv; in-ID)'
      },
      body: JSON.stringify({
         keyword: query,
         enabledKeywordSearch: true,
         filter: {
            extendSearchResult: false,
            sortBy: 'RECOMMENDED',
            languages: ['ALL'],
            minStickerCount: 5,
            searchBy: 'ALL',
            stickerType: 'ALL'
         }
      })
   })

   const json = await res.json()
   const stickerPacks = json?.result?.stickerPacks

   if (!stickerPacks?.length)
      throw new Error('Failed to get data')

   return stickerPacks
}

// ── TikTok (tikwm) ────────────────────────────────────────────────────────

export const tikwm = async (url) => {
   const res = await fetch('https://www.tikwm.com/api/', {
      method: 'POST',
      headers: {
         'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
         Origin: 'https://www.tikwm.com',
         Referer: 'https://www.tikwm.com/',
         'User-Agent': UA,
         'X-Requested-With': 'XMLHttpRequest'
      },
      body: new URLSearchParams({
         url,
         hd: 1
      })
   })

   const json = await res.json()
   if (json.code != 0)
      throw new Error('Failed to get data')

   return json.data
}

// ── YouTube (ytdl via y2mp3, yt-search) ──────────────────────────────────

export const ytdl = async (url, output = { type: 'audio', format: 'mp3', quality: '128kbps' }, maxAttempts = 10) => {
   const body = JSON.stringify({ url, output })
   const keyCache = url + body

   const cachedResponse = YTCache.get(keyCache)
   if (cachedResponse)
      return cachedResponse

   const headers = {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Content-Type': 'application/json',
      Origin: 'https://snakeloader.com',
      Referer: 'https://snakeloader.com/',
      'User-Agent': UA
   }

   const startRes = await fetch('https://ytdl.y2mp3.co/api/v2/download', {
      method: 'POST',
      headers,
      body
   })

   const startJson = await startRes.json()
   const statusUrl = startJson?.statusUrl
   if (!statusUrl)
      throw new Error('Failed to start download job')

   let attempts = 0
   while (attempts < maxAttempts) {
      attempts++

      const res = await fetch(statusUrl, { headers })
      const json = await res.json()
      const downloadUrl = json?.downloadUrl
      if (downloadUrl) {
         YTCache.set(keyCache, downloadUrl)
         return downloadUrl
      }

      await delay(10000)
   }

   throw new Error('Failed to get data (reached max retries)')
}

export const yts = async (query) => {
   const cachedResponse = YTCache.get(query)
   if (cachedResponse)
      return cachedResponse

   const data = await ytsearch(query)
   if (!data.all?.length)
      throw new Error('Failed to get data')

   YTCache.set(query, data)
   return data
}