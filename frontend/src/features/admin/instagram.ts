import { db } from './api';
import { uploadMedia } from './media';

export type InstagramStatus = { connected: boolean; username?: string; expires_at?: string; expired?: boolean };
type PreparedImport = { ticket: string; permalink: string; slides: { id: string; kind: 'image' | 'video'; hasCover: boolean }[] };
// Use the current user JWT; the publishable key alone never authorizes an import.
export async function instagramRequest<T>(body: object, binary = false): Promise<T> {
  const { data: { session }, error } = await db().auth.getSession();
  if (error || !session) throw new Error('sign in to the admin panel first.');
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instagram-import`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error ?? 'instagram could not complete the request.');
  }
  return (binary ? response.blob() : response.json()) as Promise<T>;
}
export const instagramStatus = () => instagramRequest<InstagramStatus>({ action: 'status' });
export const connectInstagram = (token: string) => instagramRequest<InstagramStatus>({ action: 'connect', token: token.trim() });
function asFile(blob: Blob, id: string) {
  const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' } as Record<string, string>)[blob.type];
  if (!ext) throw new Error('instagram returned an unsupported file.');
  return new File([blob], `instagram-${id}.${ext}`, { type: blob.type });
}
export async function importInstagram(url: string, progress: (value: string) => void) {
  progress('finding your post…');
  const prepared = await instagramRequest<PreparedImport>({ action: 'prepare', url });
  const assets: string[] = [];
  try {
    for (const [index, slide] of prepared.slides.entries()) {
      progress(`importing ${index + 1} / ${prepared.slides.length}…`);
      const blob = await instagramRequest<Blob>({ action: 'download', ticket: prepared.ticket, index }, true);
      const cover = slide.hasCover ? await instagramRequest<Blob>({ action: 'download', ticket: prepared.ticket, index, cover: true }, true) : undefined;
      const asset = await uploadMedia(asFile(blob, slide.id), false, cover ? asFile(cover, `${slide.id}-cover`) : undefined);
      assets.push(asset.id);
    }
    progress('saving your draft…');
    return await instagramRequest<{ id: string }>({ action: 'commit', ticket: prepared.ticket, asset_ids: assets });
  } catch (error) {
    // Successful files remain private and reusable. Never publish an incomplete carousel.
    throw new Error(`${error instanceof Error ? error.message : 'the import failed.'}${assets.length ? ' uploaded files remain in your private library.' : ''}`);
  }
}
