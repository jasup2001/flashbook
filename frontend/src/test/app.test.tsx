import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { App } from '../app/App';

function open(path = '/') {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
}

describe('stage 1 portfolio', () => {
  it('keeps the home page to the original logo and four working navigation links', async () => {
    open();
    expect(screen.getByRole('img', { name: 'jasup2001' })).toHaveAttribute('src', '/media/logo2.png');
    expect(screen.getAllByRole('link')).toHaveLength(4);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(['flashes', 'tattoos', 'waitlist', 'other']);
    await userEvent.click(screen.getByRole('link', { name: 'flashes' }));
    expect(screen.getByRole('heading', { name: 'flashes' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /open design/ })).toHaveLength(51);
  });

  it('serves responsive thumbnails instead of originals in the gallery', () => {
    open('/flashes');
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(51);
    for (const image of images) {
      expect(image.getAttribute('src')).toMatch(/\/thumbs\/.+\.webp$/);
      expect(image).toHaveAttribute('srcset', expect.stringContaining('720w'));
      expect(image).toHaveAttribute('sizes');
    }
    expect(images[4]).toHaveAttribute('loading', 'lazy');
  });

  it('opens HQ on demand, navigates by keyboard and swipe, closes and returns focus', async () => {
    open('/flashes');
    const user = userEvent.setup();
    const opener = screen.getAllByRole('button', { name: /open design/ })[0];
    await user.click(opener);
    const dialog = await screen.findByRole('dialog', { name: 'design preview' });
    expect(within(dialog).getByRole('link', { name: 'open original ↗' })).toHaveAttribute('href', '/media/originals/anament.png');
    fireEvent.load(dialog.querySelector('.viewer__preload')!);
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', '/media/originals/anament.png');
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' });
    expect(within(dialog).getByText('51 / 51')).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(within(dialog).getByText('01 / 51')).toBeInTheDocument();
    const stage = dialog.querySelector('.viewer__stage')!;
    fireEvent.touchStart(stage, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 70, clientY: 100 }] });
    expect(within(dialog).getByText('02 / 51')).toBeInTheDocument();
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('falls back to a thumbnail when the HQ original fails', async () => {
    open('/flashes');
    await userEvent.click(screen.getAllByRole('button', { name: /open design/ })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.error(dialog.querySelector('.viewer__preload')!);
    expect(within(dialog).getByText(/could not load the original/)).toBeInTheDocument();
    expect(within(dialog).getByRole('img').getAttribute('src')).toContain('/thumbs/');
    await userEvent.click(within(dialog).getByRole('button', { name: 'close preview' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([['/tattoos', 'tattoos'], ['/other', 'other'], ['/admin', 'admin'], ['/missing', '404']])('provides the %s placeholder', (path, title) => {
    open(path);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  });

  it('validates the form as a local preview without claiming a submission', async () => {
    open('/waitlist');
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('your instagram nickname'), '@test_artist');
    await user.type(screen.getByLabelText('email'), 'test@example.com');
    await user.type(screen.getByLabelText('your idea'), 'design 01');
    await user.click(screen.getByRole('button', { name: /check form/ }));
    expect(screen.getByRole('status')).toHaveTextContent('nothing has been sent or saved');
    await user.type(screen.getByLabelText('your idea'), '.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
