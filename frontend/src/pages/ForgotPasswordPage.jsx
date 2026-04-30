/**
 * 28.04 Ilia Klodin: we were missing one seemingly obvious thing - a forgot pwd page
 * here users can request a pwd reset link via email *
 * should map to backend: POST /api/auth/forgotpassword  { email }
 * The server sends a reset link to the email if an account exists.
 * the response is intentionally vague ("if an account exists...") to
 * avoid leaking which emails are registered.
 *
 * After requesting, the user follows the emailed link to /reset-password/:token
 * which maps to: PUT /api/auth/resetpassword/:resettoken  { password }
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './AuthPage.css';

function ForgotPasswordPage() {
  const [email,       setEmail]       = useState('');
  const [emailError,  setEmailError]  = useState('');
  const [loading,     setLoading]     = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    if (!email.trim()) {
      setEmailError('Email is required.');
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setLoading(true);
    // --- for backend integration later on, NEEDS PROPER INTEGRATION TESTING !!!! ---
    /* 
     * const res = await fetch('/api/auth/forgotpassword', {
     *   method: 'POST',
     *   headers: { 'Content-Type': 'application/json' },
     *   body: JSON.stringify({ email }),
     * });
     * if (!res.ok) {
     *   const data = await res.json();
     *   setServerError(data.message || 'Something went wrong. Please try again.');
     *   setLoading(false);
     *   return;
     * }
     */

    // Mock: simulate a short delay then show success
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-card__header">
          <Link to="/" className="auth-card__logo">🎮 GamerHub</Link>
          <h1 className="auth-card__title">Forgot your password?</h1>
          <p className="auth-card__subtitle">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {serverError && (
          <div className="alert alert-error" role="alert" aria-live="assertive">
            ⚠️ {serverError}
          </div>
        )}

        {submitted ? (
          <div className="alert alert-success" role="status">
            ✅ If an account with that email exists, a password reset link has been sent.
            Check your inbox (and spam folder).
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate aria-label="Forgot password form">
            <div className="form-group">
              <label className="form-label" htmlFor="forgot-email">Email address</label>
              <input
                id="forgot-email"
                type="email"
                className={`form-input ${emailError ? 'error' : ''}`}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                autoComplete="email"
                aria-required="true"
                aria-describedby={emailError ? 'forgot-email-error' : undefined}
              />
              {emailError && (
                <span id="forgot-email-error" className="field-error" role="alert">
                  {emailError}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-card__submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <hr className="divider" />

        <p className="auth-card__switch">
          <Link to="/login" className="auth-card__switch-link">← Back to Login</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
