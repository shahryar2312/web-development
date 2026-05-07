/**
 * src/tests/pages/ForgotPasswordPage.test.jsx
 *
 * Unit tests for ForgotPasswordPage component.
 * Tests: form rendering, validation, API call, success state.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ForgotPasswordPage from '../../pages/ForgotPasswordPage';

vi.mock('../../services/api', () => ({
  api: { post: vi.fn() },
}));

import { api } from '../../services/api';

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>
  );
}

describe('ForgotPasswordPage — rendering', () => {
  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText(/Forgot your password/i)).toBeInTheDocument();
  });

  it('renders the email input', () => {
    renderPage();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('renders a link back to login', () => {
    renderPage();
    expect(screen.getByText(/back to login/i)).toBeInTheDocument();
  });
});

describe('ForgotPasswordPage — validation', () => {
  it('shows an error when submitted with an empty email', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });

  it('shows an error when submitted with an invalid email format', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/email address/i), 'notanemail');
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });

  it('clears the validation error when the user starts typing', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    await screen.findByText(/email is required/i);

    await userEvent.type(screen.getByLabelText(/email address/i), 'a');
    expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
  });
});

describe('ForgotPasswordPage — API interaction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls api.post with the entered email on submit', async () => {
    api.post.mockResolvedValue({});
    renderPage();

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/auth/forgotpassword',
        { email: 'user@example.com' }
      );
    });
  });

  it('shows a success message after a successful submission', async () => {
    api.post.mockResolvedValue({});
    renderPage();

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/email exists.*reset link/i)).toBeInTheDocument();
  });

  it('shows a server error message when the API call fails', async () => {
    api.post.mockRejectedValue(new Error('Server error'));
    renderPage();

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByText(/server error/i)).toBeInTheDocument();
  });

  it('disables the submit button while loading', async () => {
    // Never resolves so button stays in loading state
    api.post.mockReturnValue(new Promise(() => {}));
    renderPage();

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    const btn = screen.getByRole('button', { name: /sending/i });
    expect(btn).toBeDisabled();
  });
});
