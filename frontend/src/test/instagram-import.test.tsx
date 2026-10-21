import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ status: vi.fn(), connect: vi.fn(), import: vi.fn() }));
vi.mock('../features/admin/instagram', () => ({ instagramStatus: mocks.status, connectInstagram: mocks.connect, importInstagram: mocks.import }));
import { InstagramImport } from '../features/admin/InstagramImport';
beforeEach(() => {
  vi.clearAllMocks(); mocks.status.mockResolvedValue({ connected: false });
  mocks.connect.mockResolvedValue({ connected: true, username: 'jasup2001' });
});
describe('instagram admin controls', () => {
  it('keeps import disabled until connected and never preloads a secret', async () => {
    render(<InstagramImport onImported={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('post or reel link'), 'https://www.instagram.com/p/abc/');
    expect(screen.getByRole('button', { name: 'import post' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'connect instagram' }));
    const input = screen.getByLabelText('instagram dashboard token');
    expect(input).toHaveAttribute('type', 'password'); expect(input).toHaveValue('');
    await userEvent.type(input, 'private-setup-token');
    mocks.status.mockResolvedValue({ connected: true, username: 'jasup2001' });
    await userEvent.click(screen.getByRole('button', { name: 'save connection' }));
    await waitFor(() => expect(screen.queryByLabelText('instagram dashboard token')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'import post' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: 'connection settings' }));
    expect(screen.getByLabelText('instagram dashboard token')).toHaveValue('');
  });
  it('reports completion as a draft and refreshes posts only after success', async () => {
    mocks.status.mockResolvedValue({ connected: true, username: 'jasup2001' });
    mocks.import.mockImplementation(async (_url, progress) => { progress('importing 1 / 2…'); return { id: 'new-post' }; });
    const onImported = vi.fn(); render(<InstagramImport onImported={onImported} />);
    await screen.findByText(/@jasup2001 connected/);
    await userEvent.type(screen.getByLabelText('post or reel link'), 'https://www.instagram.com/reel/abc/');
    await userEvent.click(screen.getByRole('button', { name: 'import post' }));
    expect(await screen.findByRole('status')).toHaveTextContent('private draft');
    expect(onImported).toHaveBeenCalledOnce(); expect(screen.getByLabelText('post or reel link')).toHaveValue('');
  });
  it('keeps the link and does not report a published post after a failed import', async () => {
    mocks.status.mockResolvedValue({ connected: true, username: 'jasup2001' });
    mocks.import.mockRejectedValue(new Error('licensed music: upload the original video.'));
    const onImported = vi.fn(); render(<InstagramImport onImported={onImported} />);
    await screen.findByText(/@jasup2001 connected/);
    await userEvent.type(screen.getByLabelText('post or reel link'), 'https://www.instagram.com/reel/abc/');
    await userEvent.click(screen.getByRole('button', { name: 'import post' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('licensed music');
    expect(onImported).not.toHaveBeenCalled(); expect(screen.getByLabelText('post or reel link')).not.toHaveValue('');
  });
});
