import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ remove: vi.fn() }));
vi.mock('../features/admin/api', () => ({ deletePost: mocks.remove, message: (error: Error) => error.message }));
import { DeletePostDialog } from '../features/admin/DeletePostDialog';
beforeEach(() => { mocks.remove.mockReset(); mocks.remove.mockResolvedValue(undefined); });
function setup() {
  const onClose = vi.fn(); const onDeleted = vi.fn(); const restoreFocus = vi.fn();
  render(<DeletePostDialog id="selected-post" cover="/cover.webp" onClose={onClose} onDeleted={onDeleted} restoreFocus={restoreFocus} />);
  return { onClose, onDeleted };
}
describe('post deletion confirmation', () => {
  it('focuses cancel and never deletes on opening, cancelling or escape', async () => {
    const { onClose } = setup();
    expect(screen.getByRole('dialog', { name: 'delete this post?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'cancel' })).toHaveFocus();
    expect(mocks.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'cancel' }));
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(2); expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('deletes only the selected post after explicit confirmation and blocks a repeat click', async () => {
    let resolve!: () => void; mocks.remove.mockReturnValue(new Promise<void>(done => { resolve = done; }));
    const { onDeleted } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'delete post' }));
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith('selected-post');
    expect(screen.getByRole('button', { name: 'deleting…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'cancel' })).toBeDisabled();
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }));
    resolve(); await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
  });
  it('keeps the dialog open and does not report success after a rejected deletion', async () => {
    mocks.remove.mockRejectedValue(new Error('could not delete this post.'));
    const { onDeleted } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'delete post' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not delete');
    expect(onDeleted).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'delete post' })).toBeEnabled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
