// Official Instagram API with Instagram Login; read-only scope instagram_business_basic.
export const GRAPH_VERSION = 'v26.0';
export class InstagramError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function instagramLink(input: unknown) {
  if (typeof input !== 'string' || input.length > 2048) throw new InstagramError('paste an instagram post or reel link.');
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new InstagramError('paste an instagram post or reel link.'); }
  const match = url.pathname.match(/^\/(?:[A-Za-z0-9_.]+\/)?(p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/);
  if (url.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(url.hostname)
    || url.username || url.password || url.port || !match) throw new InstagramError('paste an instagram post or reel link.');
  return { shortcode: match[2], url: `https://www.instagram.com/${match[1]}/${match[2]}/` };
}
export function mediaUrl(input: unknown) {
  if (typeof input !== 'string') throw new InstagramError('instagram did not provide a downloadable file. videos with licensed music may need a manual upload.');
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
    !['cdninstagram.com', 'fbcdn.net'].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    throw new InstagramError('instagram returned an unsupported media address.');
  }
  return url.href;
}
export type InstagramMedia = { id: string; media_type: string; media_url?: string; thumbnail_url?: string; permalink?: string;
  timestamp?: string; children?: { data: InstagramMedia[]; paging?: { next?: string } } };
type Page = { data: InstagramMedia[]; paging?: { next?: string; cursors?: { after?: string } } };
export type ImportSlide = { id: string; kind: 'image' | 'video'; url: string; cover?: string };
export type ImportManifest = { owner: string; expires: number; id: string; permalink: string; timestamp: string; slides: ImportSlide[] };
export async function graph<T>(token: string, path: string, params: Record<string, string> = {}, fetcher: typeof fetch = fetch): Promise<T> {
  const url = new URL(`https://graph.instagram.com/${GRAPH_VERSION}/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  // The credential is sent only to Meta, never included in a URL, browser response or log.
  const response = await fetcher(url, { headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(20000) });
  const body = await response.json();
  if (!response.ok || body.error) throw new InstagramError(body.error?.code === 190
    ? 'instagram access has expired. reconnect your account.' : 'instagram could not complete this request. check the account connection and try again.', 502);
  return body as T;
}
export async function ownPost(token: string, userId: string, input: unknown, fetcher: typeof fetch = fetch) {
  const wanted = instagramLink(input); let after = '';
  // Rebuild pagination URLs ourselves: never follow a supplied next URL with the token.
  for (let page = 0; page < 25; page++) {
    const result = await graph<Page>(token, `${userId}/media`, { fields: 'id,permalink', limit: '100', ...(after ? { after } : {}) }, fetcher);
    const match = result.data?.find(item => item.permalink && instagramLink(item.permalink).shortcode === wanted.shortcode);
    if (match) {
      return graph<InstagramMedia>(token, match.id, { fields: 'id,media_type,media_url,thumbnail_url,permalink,timestamp,children.limit(20){id,media_type,media_url,thumbnail_url}' }, fetcher);
    }
    if (!result.paging?.next || !result.paging.cursors?.after) break;
    after = result.paging.cursors.after;
  }
  throw new InstagramError('this post was not found in @jasup2001’s latest 2500 posts. use a link to your own published post or reel.');
}
export function manifestFor(media: InstagramMedia, owner: string): ImportManifest {
  if (!/^\d+$/.test(media.id) || !media.permalink || !media.timestamp || !Number.isFinite(Date.parse(media.timestamp))) throw new InstagramError('instagram returned incomplete post information.');
  const children = media.media_type === 'CAROUSEL_ALBUM' ? media.children?.data : [media];
  if (!children?.length || children.length > 20 || media.children?.paging?.next) throw new InstagramError('a post must contain 1 to 20 available slides.');
  const slides: ImportSlide[] = children.map(item => {
    if (!/^\d+$/.test(item.id) || !['IMAGE', 'VIDEO'].includes(item.media_type)) throw new InstagramError('this media type cannot be imported.');
    return { id: item.id, kind: item.media_type === 'VIDEO' ? 'video' : 'image', url: mediaUrl(item.media_url),
      ...(item.media_type === 'VIDEO' && item.thumbnail_url ? { cover: mediaUrl(item.thumbnail_url) } : {}) };
  });
  return { owner, expires: Date.now() + 30 * 60 * 1000, id: media.id, permalink: instagramLink(media.permalink).url, timestamp: media.timestamp, slides };
}
const encode = (bytes: Uint8Array) => btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const decode = (value: string) => Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
async function signingKey(secret: string) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(`instagram-import:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function signManifest(manifest: ImportManifest, secret: string) {
  const payload = encode(new TextEncoder().encode(JSON.stringify(manifest)));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), new TextEncoder().encode(payload));
  return `${payload}.${encode(new Uint8Array(signature))}`;
}
export async function verifyManifest(ticket: unknown, owner: string, secret: string): Promise<ImportManifest> {
  try {
    if (typeof ticket !== 'string' || ticket.length > 60000) throw new Error();
    const [payload, signature, extra] = ticket.split('.');
    if (extra || !payload || !signature || !await crypto.subtle.verify('HMAC', await signingKey(secret), decode(signature), new TextEncoder().encode(payload))) throw new Error();
    const value = JSON.parse(new TextDecoder().decode(decode(payload))) as ImportManifest;
    if (value.owner !== owner || !Number.isFinite(value.expires) || value.expires < Date.now() || value.expires > Date.now() + 31 * 60000) throw new Error();
    return value;
  } catch { throw new InstagramError('this import has expired or is invalid. paste the link again.'); }
}
export async function downloadMedia(slide: ImportSlide, cover = false, fetcher: typeof fetch = fetch) {
  if (cover && !slide.cover) throw new InstagramError('this video has no cover.');
  let address = mediaUrl(cover ? slide.cover : slide.url);
  for (let redirects = 0; redirects <= 3; redirects++) {
    // No bearer token is sent to a media CDN.
    const response = await fetcher(address, { redirect: 'manual', signal: AbortSignal.timeout(90000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel(); address = mediaUrl(new URL(response.headers.get('location') ?? '', address).href); continue;
    }
    if (!response.ok || !response.body) throw new InstagramError('the instagram file is unavailable. paste the link again or upload the original file.');
    const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
    const image = cover || slide.kind === 'image';
    const allowed = image ? ['image/jpeg', 'image/png', 'image/webp'] : ['video/mp4', 'video/webm'];
    const limit = (image ? 20 : 50) * 1024 * 1024;
    if (!allowed.includes(type)) { await response.body.cancel(); throw new InstagramError('instagram returned an unsupported file format.'); }
    if (Number(response.headers.get('content-length')) > limit) { await response.body.cancel(); throw new InstagramError(`this file exceeds the ${image ? 20 : 50} mb limit. upload a smaller original.`); }
    let bytes = 0;
    const stream = response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({ transform(chunk, controller) {
      bytes += chunk.byteLength;
      if (bytes > limit) throw new InstagramError('the instagram file exceeds the upload limit.');
      controller.enqueue(chunk);
    } }));
    return { stream, type };
  }
  throw new InstagramError('instagram returned too many media redirects.');
}
