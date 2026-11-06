export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'
export const isSupportedPhoto = (file) => /^image\/(png|jpe?g|webp)$/i.test(file.type)

export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    const release = () => URL.revokeObjectURL(url)
    img.onerror = () => {
      release()
      reject(new Error('Não foi possível carregar a imagem.'))
    }
    img.onload = () => {
      release()
      const ratio = Math.min(1, 4096 / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * ratio))
      canvas.height = Math.max(1, Math.round(img.height * ratio))
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Não foi possível preparar a imagem.'))
        return
      }
      context.drawImage(img, 0, 0, canvas.width, canvas.height)
      const encode = (quality) =>
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao comprimir a imagem.'))
              return
            }
            if (blob.size > MAX_IMAGE_BYTES && quality > 0.31) {
              encode(quality - 0.05)
              return
            }
            if (blob.size > MAX_IMAGE_BYTES) {
              reject(new Error('A imagem continua maior que 10 MB após a compressão.'))
              return
            }
            resolve(
              new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now(),
              }),
            )
          },
          'image/jpeg',
          quality,
        )
      encode(0.95)
    }
    img.src = url
  })
}
