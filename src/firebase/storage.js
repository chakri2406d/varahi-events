// No Firebase Storage used — images stored as Base64 in Firestore
// This keeps everything free with no storage bucket needed

// Firestore's limit is 1,048,576 bytes per DOCUMENT, and base64 inflates a
// file by ~33%. Leave headroom for the rest of the booking fields, so the
// final base64 string must stay comfortably under that — ~900,000 chars.
const MAX_BASE64_LENGTH = 900_000

// Draw `img` onto a canvas capped at `maxSize` on the longest side and
// return a base64 JPEG at the given quality.
const drawToBase64 = (img, maxSize, quality) => {
  const canvas = document.createElement('canvas')
  let { width, height } = img

  if (width > maxSize || height > maxSize) {
    if (width > height) { height = (height / width) * maxSize; width = maxSize }
    else                { width  = (width / height) * maxSize; height = maxSize }
  }

  canvas.width  = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, width, height)

  return canvas.toDataURL('image/jpeg', quality)
}

export const uploadPaymentProof = async (bookingId, file) => {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error('No file')); return }

    // Always run the image through the canvas resize/compress path — even a
    // small, low-quality file can have huge pixel dimensions (e.g. a PNG
    // screenshot), so we normalise everything to a resized JPEG.
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      // Try progressively smaller size/quality combos until the resulting
      // base64 string fits under Firestore's limit.
      const attempts = [
        { maxSize: 800, quality: 0.6 },
        { maxSize: 800, quality: 0.5 },
        { maxSize: 800, quality: 0.4 },
        { maxSize: 800, quality: 0.3 },
        { maxSize: 640, quality: 0.4 },
        { maxSize: 640, quality: 0.3 },
        { maxSize: 480, quality: 0.3 },
      ]

      let base64 = null
      for (const { maxSize, quality } of attempts) {
        base64 = drawToBase64(img, maxSize, quality)
        if (base64.length <= MAX_BASE64_LENGTH) break
      }

      URL.revokeObjectURL(url)

      if (!base64 || base64.length > MAX_BASE64_LENGTH) {
        reject(new Error('Image is too large even after compression. Please upload a smaller screenshot.'))
        return
      }

      resolve(base64)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image load failed'))
    }
    img.src = url
  })
}
