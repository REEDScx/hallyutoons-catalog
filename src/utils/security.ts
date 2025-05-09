
/**
 * Security utilities for sanitizing input and output data
 */

/**
 * Sanitizes text to prevent XSS attacks by removing potential HTML/script tags
 */
export function sanitizeText(text: string): string {
  if (typeof text !== 'string') return '';
  return text.replace(/[<>&"']/g, '');
}

/**
 * Sanitizes URL parameters
 */
export function sanitizeUrlParam(param: string): string {
  if (typeof param !== 'string') return '';
  // Remove any characters that could be used for XSS or URL tampering
  return param.replace(/[<>&"'\\]/g, '');
}

/**
 * Validates if an email address format is correct
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Sets secure HTTP headers (to be used in meta tags until we have server-side control)
 */
export function setSecurityMetaTags(): void {
  // Content Security Policy - Adiciona permissões para domínios das imagens dos manhwas
  const cspMeta = document.createElement('meta');
  cspMeta.httpEquiv = 'Content-Security-Policy';
  cspMeta.content = "default-src 'self'; img-src 'self' https://*.unsplash.com https://kitsu.io https://*.kitsu.io https://media.kitsu.app https://*.kitsu.app https://media.kitsu.io https://*.media.kitsu.io data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self' https://kitsu.io https://*.kitsu.io;";
  
  // X-Frame-Options
  const xfoMeta = document.createElement('meta');
  xfoMeta.httpEquiv = 'X-Frame-Options';
  xfoMeta.content = 'SAMEORIGIN';
  
  // X-Content-Type-Options
  const xctoMeta = document.createElement('meta');
  xctoMeta.httpEquiv = 'X-Content-Type-Options';
  xctoMeta.content = 'nosniff';
  
  document.head.appendChild(cspMeta);
  document.head.appendChild(xfoMeta);
  document.head.appendChild(xctoMeta);
}
