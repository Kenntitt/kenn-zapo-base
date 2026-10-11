export async function buildImageHeader(connOrClient, image) {
  const client = connOrClient?.rawClient || connOrClient
  if (!image) return null

  if (typeof image === 'object' && image.url && image.directPath) {
    return image
  }

  const uploaded = await client.message.upload(image, {
    type: 'image',
    mimetype: 'image/jpeg',
  })

  if (!uploaded) return null
  if (uploaded.imageMessage) return uploaded.imageMessage

  return {
    url: uploaded.url,
    directPath: uploaded.directPath,
    mediaKey: uploaded.mediaKey,
    fileSha256: uploaded.fileSha256,
    fileEncSha256: uploaded.fileEncSha256,
    fileLength: uploaded.fileLength,
    mimetype: uploaded.mimetype || 'image/jpeg',
    ...uploaded,
  }
}