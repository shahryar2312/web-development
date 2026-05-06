/**
 * HomePage.jsx — View 1: Landing page / global post feed
 *
 * Displays:
 *   - Hero banner for guests
 *   - Sort controls (hot, new, top)
 *   - List of PostCards (global feed)
 *   - Sidebar with popular hubs
 *
 * Maps to backend endpoints:
 *   Posts feed  — GET /api/posts?sort=<sort>&page=<page>
 *   Search      — GET /api/search?q=<query>&type=posts&limit=20
 *   Hubs list   — GET /api/hubs?sort=popular
 */
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import PostCard from '../components/PostCard';
import HubCard from '../components/HubCard';
import './HomePage.css';

function HomePage() {
  const { isLoggedIn } = useAuth();
  const [searchParams]  = useSearchParams();
  const searchQuery     = searchParams.get('search') || '';

  // Sort mode: 'hot' | 'new' | 'top'
  const [sort,    setSort]    = useState('hot');
  const [posts,   setPosts]   = useState([]);
  const [hubs,    setHubs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  //30.04 Ilia Klodin: filter posts when a search query is present. calls GET /api/search?q=<query>
  // previous implementation had no filtering at all and thus any search term returned 0 results
  useEffect(() => {
    setLoading(true);
    setError('');

    /**
     * postsReq — uses the search endpoint when a query is present, otherwise
     * fetches the global feed sorted by the active sort mode.
     * Sort is passed as a query param to the backend: GET /api/posts?sort=hot|new|top
     */
    const postsReq = searchQuery
      ? api.get(`/api/search?q=${encodeURIComponent(searchQuery)}&type=posts&limit=20`)
      : api.get(`/api/posts?sort=${sort}`);

    Promise.all([
      api.get('/api/hubs?sort=popular'),
      postsReq,
    ])
      .then(([hubsData, postsData]) => {
        setHubs(hubsData.hubs || []);
        setPosts(postsData.posts || []);
      })
      .catch(() => setError('Failed to load content. Is the backend running?'))
      .finally(() => setLoading(false));
  }, [sort, searchQuery]);

  return (
    <div className="container">

      {!isLoggedIn && (
        <section className="hero" aria-label="Welcome banner">
          <div className="hero__content">
            <h1 className="hero__title">Welcome to <span>GamerHub</span></h1>
            <p className="hero__subtitle">
              The gaming community platform. Find your hub, share your clips,
              and team up with players worldwide.
            </p>
            <div className="hero__actions">
              <Link to="/register" className="btn btn-primary hero__cta">
                Join GamerHub — it's free
              </Link>
              <Link to="/login" className="btn btn-secondary">
                Already a member? Log in
              </Link>
            </div>
          </div>
          <div className="hero__graphic" aria-hidden="true">🎮</div>
        </section>
      )}

      <div className="page-layout">

        <section aria-label="Post feed">
          {searchQuery && (
            <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
              🔍 Showing results for: <strong>{searchQuery}</strong>
              {' '}({posts.length} post{posts.length !== 1 ? 's' : ''} found)
            </div>
          )}

          {/* Sort controls */}
          <div className="feed-controls">
            <span className="feed-controls__label">Sort by:</span>
            {['hot', 'new', 'top'].map((mode) => (
              <button
                key={mode}
                className={`feed-controls__btn ${sort === mode ? 'active' : ''}`}
                onClick={() => setSort(mode)}
                aria-pressed={sort === mode}
              >
                {mode === 'hot' ? '🔥' : mode === 'new' ? '✨' : '🏆'} {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="empty-state"><p>Loading posts…</p></div>
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <h3>{searchQuery ? 'No posts match your search' : 'No posts yet'}</h3>
              <p>{searchQuery ? 'Try a different search term.' : 'Be the first to post in a hub!'}</p>
            </div>
          ) : (
            <div className="feed">
              {posts.map((post) => <PostCard key={post._id} post={post} />)}
            </div>
          )}
        </section>

        <aside className="sidebar" aria-label="Popular hubs">
          <div className="sidebar__widget">
            <h2 className="sidebar__title">🔥 Popular Hubs</h2>
            <div className="sidebar__hub-list">
              {hubs.slice(0, 5).map((hub) => (
                <HubCard key={hub._id} hub={hub} />
              ))}
            </div>
            <Link to="/hubs" className="btn btn-secondary sidebar__more">
              Browse all hubs
            </Link>
          </div>

          <div className="sidebar__widget">
            <h2 className="sidebar__title">📋 Community Rules</h2>
            <ol className="sidebar__rules">
              <li>Be respectful to all members</li>
              <li>No spam or self-promotion</li>
              <li>Stay on topic within each hub</li>
              <li>No cheating discussions</li>
              <li>Mark spoilers appropriately</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default HomePage;
