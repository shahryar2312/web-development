/**
 * AuthContext.jsx — Global authentication state
 *
 * Provides the currently logged-in user object (or null) to every component
 * in the tree without prop-drilling.
 *
 * In a live integration the functions below would call:
 *   POST /api/auth/login
 *   POST /api/auth/register
 *   POST /api/auth/logout
 *   GET  /api/auth/me
 *
 * For this assignment, state is kept in-memory with mock data so the UI is
 * fully functional without a running backend.
 */
import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { api } from '../services/api';

/* ---------- Context creation ---------- */
const AuthContext = createContext(null);

/**
 * useAuth — Custom hook that returns the auth context.
 * Throws a helpful error if used outside <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/**
 * AuthProvider — Wraps the whole app (see main.jsx).
 * Manages:
 *   user      — the logged-in user object, or null
 *   loading   — true while checking session on mount
 *   login()   — sets user after credentials are verified
 *   logout()  — clears user state
 *   register()— creates account then sets user
 */
export function AuthProvider({ children }) {
  // null = guest (not logged in), object = authenticated user
  const [user, setUser]       = useState(null);
  const [activeHub, setActiveHub] = useState(null);
  // true on mount while we check for an existing session cookie
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /*
     * 29.04 Ilia Klodin - added the mount eeffect to check for existing session cookie and restore user state if valid.
     * On mount, check whether the browser already has a valid session cookie.
     * Maps to: GET /api/auth/me
     * If the server returns a user object the session is still active and we
     * restore the logged-in state without asking for credentials again.
     * while we're just mocking this, for now this silntly fails and user stays as null (guest).
     */
    // 02.05 Ilia Klodin: switched from raw fetch to api.js here — raw fetch wasn't unwrapping the envelope so data.user was always undefined
    api.get('/api/auth/me')
      .then((data) => { if (data?.user) setUser(data.user); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /**
   * login — Authenticates an existing user.
   * Maps to: POST /api/auth/login  { email, password }
   * The real implementation would send a fetch/axios request and the server
   * would set a session cookie (connect-mongo / express-session).
   *
   * @param {string} email
   * @param {string} password
   * @returns {{ success: boolean, error?: string }}
   */
  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/login', { email, password });
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * register — Creates a new user account.
   * Maps to: POST /api/auth/register  { username, email, password }
   *
   * @param {string} username
   * @param {string} email
   * @param {string} password
   * @returns {{ success: boolean, error?: string }}
   */
  const register = useCallback(async (username, email, password) => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/register', { username, email, password });
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * logout — Ends the session and clears the user state.
   * Maps to: POST /api/auth/logout
   */
  const logout = useCallback(async () => {
    await api.post('/api/auth/logout');
    setUser(null);
  }, []);

  /**
   * refreshUser — Re-fetches the current user from the server.
   * Called after a successful profile update so the navbar etc. reflects
   * changes immediately without a full page reload.
   * Maps to: GET /api/auth/me
   */
  // 02.05 Ilia Klodin: needed so profile edits (avatar, username) reflect everywhere instantly without reload
  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get('/api/auth/me');
      if (data?.user) setUser(data.user);
    } catch {
      // silently ignore so user doesnt get logged out
    }
  }, []);

  /* Values exposed to every child component */
  const value = {
    user,
    loading,
    isLoggedIn: Boolean(user),
    login,
    register,
    logout,
    refreshUser,
    activeHub,
    setActiveHub,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
