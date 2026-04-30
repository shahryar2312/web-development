/**
 * LoginPage.jsx — View 2a: User login form
 *
 * Performs full client-side validation before submission:
 *   - Email must be a valid email format
 *   - Password must not be empty
 *
 * On submit, calls AuthContext.login() which maps to:
 *   POST /api/auth/login  { email, password }
 *
 * On success, redirects to the home page.
 * On failure, displays a server-level error alert.
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

function LoginPage() {
  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  // 29.04 Ilia Klodin - added redirect for already logged-in. Beofre navigate() was called in the return of the component, which caused a render loop.
  // which I caught in dev console. Now we check if the user is already logged in on component mount and redirect to home if so.
  useEffect(() => {
    if (isLoggedIn) navigate('/');
  }, [isLoggedIn, navigate]);

  /* ---- Form field state ---- */
  const [formData, setFormData] = useState({
    email:    '',
    password: '',
  });

  /* ---- Per-field validation error messages ---- */
  const [errors, setErrors] = useState({});

  /* ---- Server-level error message (e.g. wrong credentials) ---- */
  const [serverError, setServerError] = useState('');

  /* ---- Loading state while awaiting auth response ---- */
  const [loading, setLoading] = useState(false);

  /* ---- Show/hide password toggle ---- */
  const [showPassword, setShowPassword] = useState(false);

  /**
   * handleChange — Updates formData and clears the field's error on edit.
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field as the user types
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setServerError('');
  };

  /**
   * validate — Client-side validation rules.
   * Returns true if all fields are valid, false otherwise.
   * Mirrors the rules in backend/src/routes/auth.routes.js (loginRules).
   */
  const validate = () => {
    const newErrors = {};

    // Email: required + format check
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    // Password: required
    if (!formData.password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    // Valid if no error keys remain
    return Object.keys(newErrors).length === 0;
  };

  /**
   * handleSubmit — Validates then calls the login function.
   * Maps to: POST /api/auth/login
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return; // Stop if client-side errors exist

    setLoading(true);
    const result = await login(formData.email, formData.password);
    setLoading(false);

    if (result.success) {
      navigate('/'); // Redirect to home on success
    } else {
      // Show the error returned by the server (e.g. "Invalid credentials")
      setServerError(result.error || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* ---- Header ---- */}
        <div className="auth-card__header">
          <Link to="/" className="auth-card__logo">🎮 GamerHub</Link>
          <h1 className="auth-card__title">Welcome back</h1>
          <p className="auth-card__subtitle">Log in to your GamerHub account</p>
        </div>

        {/* ---- Server error alert ---- */}
        {serverError && (
          <div className="alert alert-error" role="alert" aria-live="assertive">
            ⚠️ {serverError}
          </div>
        )}

        {/* ---- Login form ---- */}
        <form onSubmit={handleSubmit} noValidate aria-label="Login form">

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              name="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              aria-required="true"
              aria-describedby={errors.email ? 'login-email-error' : undefined}
            />
            {errors.email && (
              <span id="login-email-error" className="field-error" role="alert">
                {errors.email}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <div className="auth-input-group">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                aria-required="true"
                aria-describedby={errors.password ? 'login-password-error' : undefined}
              />
              <button
                type="button"
                className="auth-input-group__toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && (
              <span id="login-password-error" className="field-error" role="alert">
                {errors.password}
              </span>
            )}
          </div>

          {/* Forgot password link */}
          <div className="auth-card__forgot">
            <Link to="/forgot-password">Forgot your password?</Link>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="btn btn-primary auth-card__submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Logging in…' : 'Log In'}
          </button>
        </form>

        {/* ---- Divider ---- */}
        <hr className="divider" />

        {/* ---- Switch to register ---- */}
        <p className="auth-card__switch">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="auth-card__switch-link">Register for free</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
