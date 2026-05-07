/**
 * ResetPasswordPage.jsx — Password reset form
 *
 * Accessed via the emailed link: /reset-password/:token
 * Maps to backend: PUT /api/auth/resetpassword/:resettoken  { password }
 *
 * Flow:
 *   1. User lands here from the reset email link
 *   2. Enters and confirms a new password
 *   3. On success → redirected to /login
 *   4. If token is expired/invalid → shows error with link to request again
 */
import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './AuthPage.css';

function ResetPasswordPage() {
  const { token }    = useParams();
  const navigate     = useNavigate();

  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError,   setPasswordError]   = useState('');
  const [confirmError,    setConfirmError]     = useState('');
  const [serverError,     setServerError]     = useState('');
  const [loading,         setLoading]         = useState(false);
  const [success,         setSuccess]         = useState(false);

  const validate = () => {
    let valid = true;
    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      valid = false;
    } else {
      setPasswordError('');
    }

    if (!confirmPassword) {
      setConfirmError('Please confirm your password.');
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmError('Passwords do not match.');
      valid = false;
    } else {
      setConfirmError('');
    }

    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await api.put(`/api/auth/resetpassword/${token}`, { password });
      setSuccess(true);
      // Redirect to login after 2.5 seconds
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setServerError(err.message || 'Something went wrong. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-card__header">
          <Link to="/" className="auth-card__logo">🎮 GamerHub</Link>
          <h1 className="auth-card__title">Reset Your Password</h1>
          <p className="auth-card__subtitle">
            Choose a strong new password for your account.
          </p>
        </div>

        {serverError && (
          <div className="alert alert-error" role="alert" aria-live="assertive">
            ⚠️ {serverError}
            {serverError.toLowerCase().includes('expired') || serverError.toLowerCase().includes('invalid') ? (
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                <Link to="/forgot-password" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  Request a new reset link →
                </Link>
              </p>
            ) : null}
          </div>
        )}

        {success ? (
          <div className="alert alert-success" role="status">
            ✅ Password reset successfully! Redirecting you to login…
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate aria-label="Reset password form">

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" htmlFor="reset-password">New Password</label>
              <input
                id="reset-password"
                type="password"
                className={`form-input ${passwordError ? 'error' : ''}`}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                autoComplete="new-password"
                aria-required="true"
                aria-describedby={passwordError ? 'reset-password-error' : undefined}
              />
              {passwordError && (
                <span id="reset-password-error" className="field-error" role="alert">
                  {passwordError}
                </span>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="reset-confirm">Confirm New Password</label>
              <input
                id="reset-confirm"
                type="password"
                className={`form-input ${confirmError ? 'error' : ''}`}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(''); }}
                autoComplete="new-password"
                aria-required="true"
                aria-describedby={confirmError ? 'reset-confirm-error' : undefined}
              />
              {confirmError && (
                <span id="reset-confirm-error" className="field-error" role="alert">
                  {confirmError}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-card__submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? 'Resetting…' : 'Reset Password'}
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

export default ResetPasswordPage;
