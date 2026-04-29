/**
 * Navbar.jsx — Top navigation bar
 *
 * Displays:
 *   - GamerHub logo (links to home)
 *   - Search input (maps to GET /api/search?q=...)
 *   - Nav links: Home, LFG
 *   - Auth buttons (Login / Register) OR user avatar + logout
 *
 * Uses the AuthContext to show the correct state for guests vs logged-in users.
 * Collapses to a hamburger menu on mobile screens.
 */
import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

function Navbar() {
  // Auth state from context
  const { user, isLoggedIn, logout } = useAuth();

  // Controls the mobile hamburger menu visibility
  const [menuOpen, setMenuOpen] = useState(false);

  // Search input value
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();

  /**
   * handleSearch — fires when the user submits the search form.
   * Maps to: GET /api/search?q=<searchQuery>&type=posts,hubs,users
   */
  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    // Navigate to home with a search param — in full integration this would
    // call the search endpoint and display results on a dedicated search page.
    navigate(`/?search=${encodeURIComponent(trimmed)}`);
    setSearchQuery('');
    setMenuOpen(false);
  };

  /**
   * handleLogout — calls the AuthContext logout function.
   * Maps to: POST /api/auth/logout
   */
  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="container">
        <div className="navbar__inner">

          {/* ---- Logo / Brand ---- */}
          <Link to="/" className="navbar__brand">
            <div className="navbar__logo-icon">🎮</div>
            Gamer<span>Hub</span>
          </Link>

          {/* ---- Search form ---- */}
          <form className="navbar__search" onSubmit={handleSearch} role="search">
            <span className="navbar__search-icon">🔍</span>
            <input
              type="search"
              className="navbar__search-input"
              placeholder="Search posts, hubs, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search GamerHub"
            />
          </form>

          {/* ---- Desktop nav links ---- */}
          <nav className="navbar__links" aria-label="Main navigation">
            <NavLink to="/"    className="navbar__link" end>Home</NavLink>
            <NavLink to="/lfg" className="navbar__link">LFG</NavLink>
            {isLoggedIn && user?.role === 'admin' && (
              <NavLink to="/admin" className="navbar__link" style={{ color: 'var(--color-accent)' }}>Admin Panel</NavLink>
            )}
          </nav>

          {/* ---- Auth / user section ---- */}
          <div className="navbar__user">
            {isLoggedIn ? (
              /* Logged-in state */
              <>
                {/* Username links to the user's own profile page */}
                <Link to={`/user/${user.username}`} className="navbar__username">
                  {user.username}
                </Link>
                <Link
                  to={`/user/${user.username}`}
                  className="navbar__avatar"
                  title={`View profile: ${user.username}`}
                  aria-label={`Logged in as ${user.username} — view profile`}
                >
                  {/* Show first letter of username as avatar placeholder */}
                  {user.username.charAt(0).toUpperCase()}
                </Link>
                <button
                  className="btn btn-secondary"
                  onClick={handleLogout}
                  aria-label="Log out"
                >
                  Logout
                </button>
              </>
            ) : (
              /* Guest state */
              <>
                <Link to="/login"    className="btn btn-secondary">Login</Link>
                <Link to="/register" className="btn btn-primary">Register</Link>
              </>
            )}
          </div>

          {/* ---- Hamburger (mobile only) ---- */}
          <button
            className="navbar__hamburger"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* ---- Mobile slide-down menu ---- */}
      <nav className={`navbar__mobile-menu ${menuOpen ? 'open' : ''}`} aria-label="Mobile navigation">

        {/* Mobile search */}
        <form onSubmit={handleSearch} role="search">
          <input
            type="search"
            className="form-input"
            placeholder="Search GamerHub..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search GamerHub"
          />
        </form>

        <Link to="/"    className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>🏠 Home</Link>
        <Link to="/lfg" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>👥 LFG</Link>
        {isLoggedIn && user?.role === 'admin' && (
          <Link to="/admin" className="navbar__mobile-link" style={{ color: 'var(--color-accent)' }} onClick={() => setMenuOpen(false)}>🛡️ Admin Panel</Link>
        )}

        {isLoggedIn ? (
          <>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--fs-sm)' }}>
              Logged in as <strong>{user.username}</strong>
            </span>
            <button className="btn btn-danger" onClick={handleLogout} style={{ width: '100%' }}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login"    className="btn btn-secondary" style={{ textAlign: 'center' }} onClick={() => setMenuOpen(false)}>Login</Link>
            <Link to="/register" className="btn btn-primary"   style={{ textAlign: 'center' }} onClick={() => setMenuOpen(false)}>Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
