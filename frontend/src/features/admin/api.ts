import type { Database, Json } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import type { Flash } from '../flashes/types';

type Tables = Database['public']['Tables'];
export type Asset = Tables['portfolio_assets']['Row'];
export type Design = Tables['flash_designs']['Row'] & { asset: Asset };
export type Slide = Tables['tattoo_slides']['Row'] & { asset: Asset };
export type Post = Tables['tattoo_posts']['Row'] & { slides: Slide[] };
export type Entry = Tables['waitlist_entries']['Row'];
export type PublicationStatus = 'draft' | 'published' | 'archived';
export const db = () => {
  if (!supabase) throw new Error('the admin connection is not configured.');
  return supabase;
};
export function check(error: { message: string } | null) { if (error) throw new Error(error.message); }
export function message(error: unknown) { return error instanceof Error ? error.message.toLowerCase() : 'something went wrong. please try again.'; }

export async function loadDesigns(published = false): Promise<Design[]> {
  let query = db().from('flash_designs').select('*, asset:portfolio_assets(*)').order('sort_order').order('id');
  if (published) query = query.eq('status', 'published');
  const { data, error } = await query;
  check(error);
  return (data ?? []) as Design[];
}
export async function loadPosts(published = false): Promise<Post[]> {
  let query = db().from('tattoo_posts').select('*, slides:tattoo_slides(*, asset:portfolio_assets(*))').order('sort_order').order('id');
  if (published) query = query.eq('status', 'published');
  const { data, error } = await query;
  check(error);
  return ((data ?? []) as Post[]).map(post => ({ ...post, slides: post.slides.sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id)) }));
}

export type Thumbnail = { width: number; src: string; bytes: number };
export type ResolvedAsset = Asset & { url: string; previews: Thumbnail[] };
export async function resolveAssets(assets: Asset[]): Promise<ResolvedAsset[]> {
  const paths = [...new Set(assets.filter(a => a.source === 'storage').flatMap(a => [a.original, ...(a.thumbnails as Thumbnail[]).map(t => t.src)]))];
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data, error } = await db().storage.from('portfolio-media').createSignedUrls(paths, 600);
    check(error);
    for (const item of data ?? []) {
      if (item.error || !item.signedUrl || !item.path) throw new Error('could not load a media preview.');
      signed.set(item.path, item.signedUrl);
    }
  }
  return assets.map(a => ({ ...a, url: a.source === 'storage' ? signed.get(a.original)! : a.original,
    previews: (a.thumbnails as Thumbnail[]).map(t => ({ ...t, src: a.source === 'storage' ? signed.get(t.src)! : t.src })) }));
}
export async function publicFlashes(): Promise<Flash[]> {
  const designs = await loadDesigns(true);
  const assets = await resolveAssets(designs.map(d => d.asset));
  return designs.map((d, i) => ({ id: d.id, file: d.asset.file_name, number: '', width: d.asset.width,
    height: d.asset.height, original: assets[i].url, bytes: d.asset.bytes, sha256: '', thumbnails: assets[i].previews }));
}
export async function setPublication(table: 'flash_designs' | 'tattoo_posts', id: string, status: PublicationStatus) {
  const { error } = await db().from(table).update({ status }).eq('id', id); check(error);
}
export async function deletePost(id: string) {
  // RLS authorizes the owner. Post slides cascade; reusable media files are retained.
  const { error } = await db().from('tattoo_posts').delete().eq('id', id).select('id').single();
  check(error);
}
export async function reorder(target: 'flashbook' | 'tattoos', ids: string[]) {
  const { error } = await db().rpc('reorder_portfolio', { target, ordered_ids: ids }); check(error);
}
export async function newDesign(assetId: string, position: number) {
  const { error } = await db().from('flash_designs').insert({ asset_id: assetId, sort_order: position, status: 'draft' }); check(error);
}
export async function replaceDesign(id: string, assetId: string) {
  const { error } = await db().from('flash_designs').update({ asset_id: assetId }).eq('id', id); check(error);
}
export async function loadEntries() {
  const { data, error } = await db().from('waitlist_entries').select('*').order('created_at', { ascending: false }).limit(1000);
  check(error); return data ?? [];
}
export async function saveEntry(id: string, status: string, notes: string) {
  const { error } = await db().from('waitlist_entries').update({ status, notes }).eq('id', id); check(error);
}
export async function savePost(id: string | null, caption: string, slides: { asset_id: string; id?: string }[], position: number) {
  // The RPC saves the caption and slide order together, so a failed request cannot empty a live carousel.
  const { data, error } = await db().rpc('save_tattoo_post', {
    post_id: id ?? undefined, post_caption: caption, asset_ids: slides.map(s => s.asset_id), post_position: position,
  }); check(error); return data;
}
export const json = (value: unknown) => value as Json;
