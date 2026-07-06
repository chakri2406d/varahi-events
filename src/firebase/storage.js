// No Firebase Storage used — images stored as Base64 in Firestore
// This keeps everything free with no storage bucket needed

export const uploadPaymentProof = async (bookingId, file) => {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error('No file')); return }

    // Check size — Firestore limit is 1MB per document
    // Compress if needed
    if (file.size > 800 * 1024) {
      // Compress image using canvas
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const canvas  = document.createElement('canvas')
        const maxSize = 800
        let { width, height } = img

        if (width > maxSize || height > maxSize) {
          if (width > height) { height = (height / width) * maxSize; width = maxSize }
          else                { width  = (width / height) * maxSize; height = maxSize }
        }

        canvas.width  = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to base64 JPEG at 60% quality
        const base64 = canvas.toDataURL('image/jpeg', 0.6)
        URL.revokeObjectURL(url)
        resolve(base64)
      }
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = url
    } else {
      // Small file — just convert directly
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Read failed'))
      reader.readAsDataURL(file)
    }
  })
}