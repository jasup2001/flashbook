import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
const mocks = vi.hoisted(() => ({ session: null as { user: { id: string } } | null, allowed: false,
  rpc: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), reset: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: {
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    getSession: async () => ({ data: { session: mocks.session }, error: null }),
    signInWithPassword: mocks.signIn, signOut: mocks.signOut, resetPasswordForEmail: mocks.reset,
  }, rpc: mocks.rpc,
} }));
vi.mock('../features/admin/FlashbookManager', () => ({ FlashbookManager: () => <p>private flashbook controls</p> }));
vi.mock('../features/admin/TattoosManager', () => ({ TattoosManager: () => <p>private tattoos controls</p> }));
vi.mock('../features/admin/WaitlistManager', () => ({ WaitlistManager: () => <p>private waitlist controls</p> }));
import Admin from '../pages/Admin';

beforeEach(() => { mocks.session = null; mocks.allowed = false; mocks.rpc.mockReset(); mocks.signIn.mockReset(); mocks.rpc.mockImplementation(async () => ({ data: mocks.allowed, error: null })); });
describe('admin authentication', () => {
  it('shows sign in and keeps management controls hidden while signed out', async () => {
    render(<Admin />);
    expect(await screen.findByRole('button', { name: 'sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'admin sections' })).not.toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('denies a signed-in account without the database role', async () => {
    mocks.session = { user: { id: 'ordinary-user' } }; render(<Admin />);
    expect(await screen.findByRole('alert')).toHaveTextContent('does not have admin access');
    expect(screen.queryByText('private flashbook controls')).not.toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledWith('is_portfolio_admin');
  });
  it('opens the three sections only after the database confirms admin access', async () => {
    mocks.session = { user: { id: 'owner' } }; mocks.allowed = true; render(<Admin />);
    expect(await screen.findByText('private flashbook controls')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'tattoos' }));
    expect(screen.getByText('private tattoos controls')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'waitlist' }));
    expect(screen.getByText('private waitlist controls')).toBeInTheDocument();
  });
  it('reports a rejected login without showing private content', async () => {
    mocks.signIn.mockResolvedValue({ error: { message: 'invalid login credentials' } }); render(<Admin />);
    await userEvent.type(await screen.findByLabelText('email'), 'owner@example.com');
    await userEvent.type(screen.getByLabelText('password'), 'invalid-password');
    await userEvent.click(screen.getByRole('button', { name: 'sign in' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('could not sign in'));
    expect(screen.queryByText('private flashbook controls')).not.toBeInTheDocument();
  });
});
