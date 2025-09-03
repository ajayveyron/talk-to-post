export interface FileValidationResult {
  isValid: boolean
  error?: string
  mediaType?: 'image' | 'video' | 'gif'
}

export function validateAttachmentFile(file: File): FileValidationResult {
  // Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/mov'
  ]

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Unsupported file type. Please use JPG, PNG, GIF, WEBP, MP4, or MOV files.'
    }
  }

  // Determine media type
  let mediaType: 'image' | 'video' | 'gif' = 'image'
  if (file.type.startsWith('video/')) {
    mediaType = 'video'
  } else if (file.type === 'image/gif') {
    mediaType = 'gif'
  }

  // Check file size limits
  const maxImageSize = 5 * 1024 * 1024 // 5MB for images
  const maxVideoSize = 512 * 1024 * 1024 // 512MB for videos
  const maxSize = mediaType === 'video' ? maxVideoSize : maxImageSize

  if (file.size > maxSize) {
    const maxSizeMB = mediaType === 'video' ? 512 : 5
    return {
      isValid: false,
      error: `File too large. Maximum size is ${maxSizeMB}MB for ${mediaType}s.`
    }
  }

  // Additional validation for GIFs
  if (mediaType === 'gif') {
    const maxGifSize = 15 * 1024 * 1024 // 15MB for GIFs
    if (file.size > maxGifSize) {
      return {
        isValid: false,
        error: 'GIF file too large. Maximum size is 15MB for animated GIFs.'
      }
    }
  }

  return {
    isValid: true,
    mediaType
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}