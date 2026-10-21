import { check, db, json } from './api';

const MAX_IMAGE = 20 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;
export async function validateMedia(file: File, imagesOnly = false) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const text = new TextDecoder('latin1').decode(bytes);
  const kind = bytes[0] === 0x89 && text.slice(1, 4) === 'PNG' ? 'image/png'
    : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? 'image/jpeg'
    : text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP' ? 'image/webp'
    : text.slice(4, 8) === 'ftyp' ? 'video/mp4'
    : bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3 ? 'video/webm' : '';
  if (!kind || (imagesOnly && !kind.startsWith('image/')) || file.type !== kind) throw new Error('choose a png, jpg or webp image' + (imagesOnly ? '.' : ', or an mp4 or webm video.'));
  if (!file.size || file.size > (kind.startsWith('image/') ? MAX_IMAGE : MAX_VIDEO)) throw new Error('the limit is 20 mb per image and 50 mb per video.');
  return kind;
}
function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('could not create a thumbnail.')), 'image/webp', .78));
}
async function videoFrame(file: File) {
  const video = document.createElement('video');
  const url = URL.createObjectURL(file);
  video.preload = 'auto'; video.muted = true; video.playsInline = true;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('could not read this video.')), 15000);
      video.onloadeddata = () => { clearTimeout(timer); resolve(); };
      video.onerror = () => { clearTimeout(timer); reject(new Error('this video format cannot be previewed by your browser.')); };
      video.src = url;
    });
    return { source: video, width: video.videoWidth, height: video.videoHeight, cleanup: () => { video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); } };
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}
export async function uploadMedia(file: File, imagesOnly = false, poster?: File) {
  const mime = await validateMedia(file, imagesOnly);
  const isImage = mime.startsWith('image/');
  if (poster) await validateMedia(poster, true);
  // Preserve Instagram's chosen reel cover while retaining the original video file.
  const bitmap = isImage || poster ? await createImageBitmap(isImage ? file : poster!) : null;
  const frame = bitmap ? { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close() } : await videoFrame(file);
  if (!frame.width || !frame.height || frame.width * frame.height > 100_000_000) { frame.cleanup(); throw new Error('this image or video is too large to process.'); }
  const id = crypto.randomUUID();
  const extension = mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1];
  const original = `${id}/original.${extension}`;
  const uploaded: string[] = [];
  const bucket = db().storage.from('portfolio-media');
  try {
    const thumbnails = [];
    for (const width of [360, 720, 1200].filter(w => w <= Math.max(360, frame.width))) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(width, frame.width); canvas.height = Math.round(frame.height * canvas.width / frame.width);
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('image processing is unavailable.');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(frame.source, 0, 0, canvas.width, canvas.height);
      const blob = await canvasBlob(canvas); const src = `${id}/${canvas.width}.webp`;
      const { error } = await bucket.upload(src, blob, { contentType: 'image/webp', upsert: false }); check(error);
      uploaded.push(src); thumbnails.push({ width: canvas.width, src, bytes: blob.size });
    }
    const { error } = await bucket.upload(original, file, { contentType: mime, upsert: false }); check(error); uploaded.push(original);
    const { data, error: rowError } = await db().from('portfolio_assets').insert({ id, file_name: file.name.slice(0, 200), kind: isImage ? 'image' : 'video', source: 'storage',
      original, thumbnails: json(thumbnails), width: frame.width, height: frame.height, bytes: file.size }).select().single();
    check(rowError); return data!;
  } catch (error) { if (uploaded.length) await bucket.remove(uploaded); throw error; }
  finally { frame.cleanup(); }
}
