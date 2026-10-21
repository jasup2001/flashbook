import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('../features/admin/api', () => ({
  message: (e: Error) => e.message,
  loadPosts: async () => [{ id: 'post', caption: 'a tattoo post', slides: [{ asset_id: 'photo-1', asset: { id: 'photo-1' } }, { asset_id: 'video', asset: { id: 'video' } }, { asset_id: 'photo-2', asset: { id: 'photo-2' } }] }],
  resolveAssets: async () => ['photo-1', 'video', 'photo-2'].map(id => ({ id, kind: id === 'video' ? 'video' : 'image', file_name: `${id}.png`, url: `/test/${id}`, width: 720, height: 960, bytes: 100,
    previews: [{ width: 360, src: `/test/${id}.webp`, bytes: 50 }] })),
}));
import { Tattoos } from '../pages/Tattoos';
describe('published tattoo carousels', () => {
  it('navigates between images and video, wraps and supports a swipe', async () => {
    render(<MemoryRouter><Tattoos /></MemoryRouter>);
    expect(await screen.findByRole('img', { name: 'tattoo photo' })).toHaveAttribute('src', '/test/photo-1.webp');
    await userEvent.click(screen.getByRole('button', { name: 'next slide' }));
    expect(screen.getByLabelText('tattoo video')).toHaveAttribute('src', '/test/video');
    expect(screen.getByLabelText('tattoo video')).toHaveAttribute('preload', 'none');
    await userEvent.click(screen.getByRole('button', { name: 'next slide' }));
    expect(screen.getByRole('img', { name: 'tattoo photo' })).toHaveAttribute('src', '/test/photo-2.webp');
    const carousel = screen.getByRole('region', { name: 'tattoo photos and videos' });
    fireEvent.touchStart(carousel, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(carousel, { changedTouches: [{ clientX: 50, clientY: 100 }] });
    expect(screen.getByRole('img', { name: 'tattoo photo' })).toHaveAttribute('src', '/test/photo-1.webp');
    fireEvent.keyDown(carousel, { key: 'ArrowLeft' });
    expect(screen.getByRole('img', { name: 'tattoo photo' })).toHaveAttribute('src', '/test/photo-2.webp');
  });
});
