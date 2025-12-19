/**
 * Injects transformation parameters into a Cloudinary URL.
 * 
 * @param {string} url - The original Cloudinary URL.
 * @param {object} options - Transformation options.
 * @param {number} [options.width] - Width in pixels.
 * @param {number} [options.height] - Height in pixels.
 * @param {string} [options.crop] - Crop mode (e.g., 'fill', 'scale').
 * @param {string} [options.quality] - Quality setting (e.g., 'auto').
 * @returns {string} The transformed URL.
 */
export const getCloudinaryUrl = (url, options = {}) => {
    if (!url || !url.includes('/image/upload/')) {
        return url
    }

    const { width, height, crop, quality } = options
    const params = []

    if (width) params.push(`w_${width}`)
    if (height) params.push(`h_${height}`)
    if (crop) params.push(`c_${crop}`)
    if (quality) params.push(`q_${quality}`)

    if (params.length === 0) {
        return url
    }

    const transformationString = params.join(',')
    return url.replace('/image/upload/', `/image/upload/${transformationString}/`)
}
