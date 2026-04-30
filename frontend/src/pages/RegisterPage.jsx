/**
 * RegisterPage.jsx — View 2b: New user registration form
 *
 * Client-side validation rules (mirror the backend registerRules):
 *   - Username: 3–30 chars, letters/numbers/underscores/hyphens only
 *   - Email: valid email format
 *   - Password: min 8 chars, at least 1 uppercase, 1 lowercase, 1 digit
 *   - Confirm Password: must match password field
 *
 * On submit, calls AuthContext.register() which maps to:
 *   POST /api/auth/register  { username, email, password }
 *
 * On success, redirects to the home page.
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

function RegisterPage() {
  const { register, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  // 29.04 Ilia Klodin - added redirect for already logged-in. Beofre navigate() was called in the return of the component, which caused a render loop.
  // which I caught in dev console. Now we check if the user is already logged in on component mount and redirect to home if so.
  useEffect(() => {
    if (isLoggedIn) navigate('/');
  }, [isLoggedIn, navigate]);

  /* ---- Form field state ---- */
  const [formData, setFormData] = useState({
    username:        '',
    email:           '',
    password:        '',
    confirmPassword: '',
  });

  /* ---- Per-field validation errors ---- */
  const [errors, setErrors] = useState({});

  /* ---- Server-level error (e.g. "username already taken") ---- */
  const [serverError, setServerError] = useState('');

  /* ---- Loading state ---- */
  const [loading, setLoading] = useState(false);

  /* ---- Show/hide password toggles ---- */
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /**
   * handleChange — Updates a single field and clears its error message.
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setServerError('');
  };

  /**
   * validate — Full client-side validation.
   * Rules mirror backend/src/routes/auth.routes.js (registerRules).
   * Returns true when all fields pass.
   */
  const validate = () => {
    const newErrors = {};

    // Username: required, 3–30 chars, alphanumeric + _ -
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required.';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters.';
    } else if (formData.username.length > 30) {
      newErrors.username = 'Username cannot exceed 30 characters.';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, underscores, and hyphens.';
    }

    // Email: required + format
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    // Password: required, min 8 chars, complexity rules
    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter.';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter.';
    } else if (!/(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number.';
    }

    // Confirm password: must match
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * getPasswordStrength — Returns a strength label and CSS class for the
   * password strength bar shown below the password field.
   */
  const getPasswordStrength = () => {
    const p = formData.password;
    if (!p) return { label: '', cls: '', width: '0%' };
    let score = 0;
    if (p.length >= 8)          score++;
    if (/[A-Z]/.test(p))        score++;
    if (/[a-z]/.test(p))        score++;
    if (/\d/.test(p))           score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    if (score <= 2) return { label: 'Weak',   cls: 'strength--weak',   width: '33%' };
    if (score === 3) return { label: 'Fair',   cls: 'strength--fair',   width: '66%' };
    return              { label: 'Strong', cls: 'strength--strong', width: '100%' };
  };

  const strength = getPasswordStrength();

  /**
   * handleSubmit — Validates then calls the register function.
   * Maps to: POST /api/auth/register
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) return;

    setLoading(true);
    const result = await register(formData.username, formData.email, formData.password);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setServerError(result.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* ---- Header ---- */}
        <div className="auth-card__header">
          <Link to="/" className="auth-card__logo">🎮 GamerHub</Link>
          <h1 className="auth-card__title">Create your account</h1>
          <p className="auth-card__subtitle">Join thousands of gamers on GamerHub</p>
        </div>

        {/* ---- Server error ---- */}
        {serverError && (
          <div className="alert alert-error" role="alert" aria-live="assertive">
            ⚠️ {serverError}
          </div>
        )}

        {/* ---- Registration form ---- */}
        <form onSubmit={handleSubmit} noValidate aria-label="Registration form">

          {/* Username */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">Username</label>
            <input
              id="reg-username"
              type="text"
              name="username"
              className={`form-input ${errors.username ? 'error' : ''}`}
              placeholder="e.g. ProGamer_99"
              value={formData.username}
              onChange={handleChange}
              autoComplete="username"
              maxLength={30}
              aria-required="true"
              aria-describedby={errors.username ? 'reg-username-error' : 'reg-username-hint'}
            />
            <span id="reg-username-hint" className="field-hint">
              3–30 characters. Letters, numbers, _ and - only.
            </span>
            {errors.username && (
              <span id="reg-username-error" className="field-error" role="alert">
                {errors.username}
              </span>
            )}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email address</label>
            <input
              id="reg-email"
              type="email"
              name="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              aria-required="true"
              aria-describedby={errors.email ? 'reg-email-error' : undefined}
            />
            {errors.email && (
              <span id="reg-email-error" className="field-error" role="alert">
                {errors.email}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <div className="auth-input-group">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Min. 8 characters"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                aria-required="true"
                aria-describedby={errors.password ? 'reg-password-error' : 'reg-password-strength'}
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

            {/* Password strength indicator */}
            {formData.password && (
              <div id="reg-password-strength" className="password-strength" aria-live="polite">
                <div className={`password-strength__bar ${strength.cls}`} style={{ width: strength.width }} />
                <span className="password-strength__label">{strength.label}</span>
              </div>
            )}

            {errors.password && (
              <span id="reg-password-error" className="field-error" role="alert">
                {errors.password}
              </span>
            )}
          </div>

          {/* Confirm password */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm-password">Confirm password</label>
            <div className="auth-input-group">
              <input
                id="reg-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Repeat your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                aria-required="true"
                aria-describedby={errors.confirmPassword ? 'reg-confirm-error' : undefined}
              />
              <button
                type="button"
                className="auth-input-group__toggle"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.confirmPassword && (
              <span id="reg-confirm-error" className="field-error" role="alert">
                {errors.confirmPassword}
              </span>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary auth-card__submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <hr className="divider" />

        <p className="auth-card__switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-card__switch-link">Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
