/**
 * src/tests/pages/ResetPasswordPage.test.jsx
 *
 * Unit tests for ResetPasswordPage component.
 * Tests: rendering, validation, API call, success redirect, error states.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import ResetPasswordPage from '../../pages/ResetPasswordPage';

vi.mock('../../services/api', () => ({
  api: { put: vi.fn() },
}));

import { api } from '../../services/api';

// Capture navigate calls via a spy on the rendered Link/navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPage(token = 'validtoken123') {
  return render(
    <MemoryRouter initialEntries={[`/reset-password/${token}`]}>
      <Routes>
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>
  );
}

// Helpers to avoid label ambiguity
const getPasswordInput    = () => screen.getByLabelText('New Password');
const getConfirmInput     = () => screen.getByLabelText('Confirm New Password');
const getSubmitBtn        = () => screen.getByRole('button', { name: /reset password/i });

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('ResetPasswordPage — rendering', () => {
  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText(/Reset Your Password/i)).toBeInTheDocument();
  });

  it('renders the new password input', () => {
    renderPage();
    expect(getPasswordInput()).toBeInTheDocument();
  });

  it('renders the confirm password input', () => {
    renderPage();
    expect(getConfirmInput()).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    renderPage();
    expect(getSubmitBtn()).toBeInTheDocument();
  });

  it('renders a back to login link', () => {
    renderPage();
    expect(screen.getByText(/back to login/i)).toBeInTheDocument();
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('ResetPasswordPage — validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows error when password field is empty on submit', async () => {
    renderPage();
    fireEvent.click(getSubmitBtn());
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  it('shows error when password is shorter than 8 characters', async () => {
    renderPage();
    await userEvent.type(getPasswordInput(), 'short');
    fireEvent.click(getSubmitBtn());
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    renderPage();
    await userEvent.type(getPasswordInput(), 'Password123!');
    await userEvent.type(getConfirmInput(), 'DifferentPass!');
    fireEvent.click(getSubmitBtn());
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('shows confirm-required error when confirm field is empty', async () => {
    renderPage();
    await userEvent.type(getPasswordInput(), 'Password123!');
    fireEvent.click(getSubmitBtn());
    expect(await screen.findByText(/confirm your password/i)).toBeInTheDocument();
  });
});

// ─── API interaction ──────────────────────────────────────────────────────────

describe('ResetPasswordPage — API interaction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.put with the token and new password on valid submit', async () => {
    api.put.mockResolvedValue({});
    renderPage('mytesttoken');

    await userEvent.type(getPasswordInput(), 'NewPassword123!');
    await userEvent.type(getConfirmInput(), 'NewPassword123!');
    fireEvent.click(getSubmitBtn());

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/api/auth/resetpassword/mytesttoken',
        { password: 'NewPassword123!' }
      );
    });
  });

  it('shows success message after successful submission', async () => {
    api.put.mockResolvedValue({});
    renderPage();

    await userEvent.type(getPasswordInput(), 'Password123!');
    await userEvent.type(getConfirmInput(), 'Password123!');
    fireEvent.click(getSubmitBtn());

    expect(await screen.findByText(/password reset successfully/i)).toBeInTheDocument();
  });

  it('calls navigate to /login after a 2500ms delay on success', async () => {
    api.put.mockResolvedValue({});
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPage();

    // Use fireEvent instead of userEvent while fake timers are active
    fireEvent.change(getPasswordInput(),  { target: { value: 'Password123!' } });
    fireEvent.change(getConfirmInput(), { target: { value: 'Password123!' } });
    fireEvent.click(getSubmitBtn());

    await waitFor(() => screen.getByText(/password reset successfully/i));

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/login');
    vi.useRealTimers();
  });

  it('shows a server error when api.put rejects', async () => {
    api.put.mockRejectedValue(new Error('Invalid or expired token'));
    renderPage();

    await userEvent.type(getPasswordInput(), 'Password123!');
    await userEvent.type(getConfirmInput(), 'Password123!');

    await act(async () => {
      fireEvent.click(getSubmitBtn());
    });

    expect(await screen.findByText(/invalid or expired token/i)).toBeInTheDocument();
  });

  it('disables the submit button while the request is in flight', async () => {
    // Resolve after a tick so we can see the loading state
    let resolve;
    api.put.mockReturnValue(new Promise(r => { resolve = r; }));
    renderPage();

    await userEvent.type(getPasswordInput(), 'Password123!');
    await userEvent.type(getConfirmInput(), 'Password123!');
    fireEvent.click(getSubmitBtn());

    // Button text changes to "Resetting…" and becomes disabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resetting/i })).toBeDisabled();
    });

    // Clean up
    resolve({});
  });
});
