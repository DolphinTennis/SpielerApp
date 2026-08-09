// Shared by link-preview (browser-triggered) and email-inbound (cron-
// triggered) — both need the exact same "given a URL, get title/thumbnail"
// logic, just from different callers.

export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'other'

export interface LinkPreview {
  platform: Platform
  title: string | null
  thumbnail_url: string | null
  embed_html: string | null
}

export function detectPlatform(rawUrl: string): Platform | null {
  let hostname: string
  try {
    hostname = new URL(rawUrl).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
  if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname === 'youtu.be') return 'youtube'
  if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) return 'instagram'
  if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) return 'tiktok'
  return 'other'
}

// Blocks the 'other' branch (which fetches an arbitrary user-supplied URL
// server-side) from being used to probe internal/private network targets.
function isSafeExternalUrl(rawUrl: string): boolean {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  const host = url.hostname.toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost')) return false
  if (
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === '0.0.0.0' ||
    host === '::1'
  ) {
    return false
  }
  return true
}

async function fetchOEmbed(endpoint: string): Promise<{ title: string | null; thumbnail_url: string | null; html: string | null } | null> {
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const data = await res.json()
    return {
      title: data.title || data.author_name || null,
      thumbnail_url: data.thumbnail_url || null,
      html: data.html || null,
    }
  } catch {
    return null
  }
}

// og:title/og:image content attributes commonly come HTML-entity-encoded
// in the raw source (e.g. "Tom &amp; Jerry") — decode the common ones so
// they don't show up literally in the UI.
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function extractMetaTag(html: string, property: string): string | null {
  const direct = html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]*>`, 'i'))?.[0]
  if (direct) {
    const content = direct.match(/content=["']([^"']*)["']/i)
    if (content) return decodeEntities(content[1])
  }
  const reversed = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, 'i'))
  return reversed ? decodeEntities(reversed[1]) : null
}

// Best-effort og:title/og:image scrape of a page, never throws. Used both
// for 'other' links (no oEmbed provider at all) and as a fallback for
// Instagram, whose oEmbed response never includes a title or thumbnail —
// only embed HTML that needs their JS widget to render, which we don't
// load (see the "not part of this phase" note in Beispiele.jsx).
async function scrapePage(rawUrl: string): Promise<{ title: string | null; image: string | null } | null> {
  if (!isSafeExternalUrl(rawUrl)) return null
  try {
    const res = await fetch(rawUrl, {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DolphinTennisBot/1.0)' },
      redirect: 'follow',
    })
    if (!res.ok) return null
    const html = await res.text()
    return { title: extractMetaTag(html, 'og:title'), image: extractMetaTag(html, 'og:image') }
  } catch {
    return null
  }
}

export async function getLinkPreview(rawUrl: string): Promise<LinkPreview> {
  const platform = detectPlatform(rawUrl) || 'other'

  if (platform === 'youtube') {
    const data = await fetchOEmbed(`https://www.youtube.com/oembed?url=${encodeURIComponent(rawUrl)}&format=json`)
    return { platform, title: data?.title ?? null, thumbnail_url: data?.thumbnail_url ?? null, embed_html: data?.html ?? null }
  }
  if (platform === 'tiktok') {
    const data = await fetchOEmbed(`https://www.tiktok.com/oembed?url=${encodeURIComponent(rawUrl)}`)
    return { platform, title: data?.title ?? null, thumbnail_url: data?.thumbnail_url ?? null, embed_html: data?.html ?? null }
  }
  if (platform === 'instagram') {
    const data = await fetchOEmbed(`https://graph.facebook.com/v25.0/instagram_oembed?url=${encodeURIComponent(rawUrl)}`)
    const scraped = !data?.thumbnail_url ? await scrapePage(rawUrl) : null
    return {
      platform,
      title: data?.title ?? scraped?.title ?? null,
      thumbnail_url: data?.thumbnail_url ?? scraped?.image ?? null,
      embed_html: data?.html ?? null,
    }
  }

  // 'other'
  const scraped = await scrapePage(rawUrl)
  return { platform, title: scraped?.title ?? null, thumbnail_url: scraped?.image ?? null, embed_html: null }
}

// Very small extractor for the email-inbound path — first http(s) link in a
// block of plain text.
export function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/i)
  return match ? match[0].replace(/[.,;:!?)]+$/, '') : null
}
