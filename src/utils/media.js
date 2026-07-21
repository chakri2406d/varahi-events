// Parses a pasted video URL (YouTube, Instagram or a direct video file) into a
// normalised shape the gallery can render. Free — no APIs, just string parsing.
// YouTube thumbnails come from the public img.youtube.com endpoint (no key).
export function parseVideoUrl(raw) {
  const url = String(raw || '').trim()
  if (!url) return null

  // YouTube: watch?v=, youtu.be/, /embed/, /shorts/
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)
  if (m) {
    const id = m[1]
    return {
      provider:  'youtube',
      videoId:   id,
      embedUrl:  `https://www.youtube.com/embed/${id}`,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    }
  }

  // Instagram post / reel / tv
  m = url.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/)
  if (m) {
    return {
      provider:  'instagram',
      embedUrl:  `https://www.instagram.com/${m[1]}/${m[2]}/embed`,
      thumbnail: null,
    }
  }

  // A direct video file URL (mp4/webm/ogg/mov)
  if (/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url)) {
    return { provider: 'file', videoUrl: url, thumbnail: null }
  }

  return { provider: 'unknown' }
}
