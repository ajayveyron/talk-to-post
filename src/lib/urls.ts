export function getBaseUrl(): string {
  // For Vercel deployments
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // For local development
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXTAUTH_URL || 'http://127.0.0.1:3000'
  }
  
  // Fallback for other production environments
  return process.env.NEXTAUTH_URL || 'http://127.0.0.1:3000'
}

export function getTwitterRedirectUri(): string {
  return `${getBaseUrl()}/api/auth/twitter/callback`
}
