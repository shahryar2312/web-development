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
  const { isLoggedIn, user } = useAuth();
  const [searchParams]  = useSearchParams();
  const searchQuery     = searchParams.get('search') || '';

  const [feedFilter, setFeedFilter] = useState('global');
  const [hasSetDefault, setHasSetDefault] = useState(false);

  useEffect(() => {
    if (isLoggedIn && user && !hasSetDefault) {
      if (user.following && user.following.length > 0) {
        setFeedFilter('following');
      }
      setHasSetDefault(true);
    } else if (!isLoggedIn && hasSetDefault) {
      setFeedFilter('global');
      setHasSetDefault(false);
    }
  }, [isLoggedIn, user, hasSetDefault]);

  // Sort mode: 'hot' | 'new' | 'top'
  const [sort,    setSort]    = useState('hot');
  const [posts,   setPosts]   = useState([]);
  const [hubs,    setHubs]    = useState([]);
  const [searchHubs, setSearchHubs] = useState([]);
  const [searchUsers, setSearchUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreateHub, setShowCreateHub] = useState(false);
  const [newHubName,    setNewHubName]    = useState('');
  const [newHubGame,    setNewHubGame]    = useState('');
  const [newHubDesc,    setNewHubDesc]    = useState('');
  const [hubCreating,   setHubCreating]   = useState(false);
  const [hubCreateErr,  setHubCreateErr]  = useState('');

  // 07.05 Ilia Klodin: create hub form inline in sidebar so user doesnt need to navigate away
  const handleCreateHub = async (e) => {
    e.preventDefault();
    if (!newHubName.trim()) { setHubCreateErr('Hub name is required.'); return; }
    setHubCreating(true); setHubCreateErr('');
    try {
      const data = await api.post('/api/hubs', {
        name: newHubName.trim(),
        game: newHubGame.trim() || undefined,
        description: newHubDesc.trim() || undefined,
      });
      setHubs(prev => [data.hub, ...prev]);
      setShowCreateHub(false);
      setNewHubName(''); setNewHubGame(''); setNewHubDesc('');
    } catch (err) {
      setHubCreateErr(err.message);
    } finally {
      setHubCreating(false);
    }
  };
  const [error,   setError]   = useState('');

  // Fetch content: search mode vs normal feed mode
  useEffect(() => {
    setLoading(true);
    setError('');

    if (searchQuery) {
      api.get(`/api/search?q=${encodeURIComponent(searchQuery)}&type=all&limit=20`)
        .then((data) => {
          setSearchHubs(data.hubs || []);
          setPosts(data.posts || []);
          setSearchUsers(data.users || []);
        })
        .catch(() => setError('Failed to perform search.'))
        .finally(() => setLoading(false));
    } else {
      let postUrl = `/api/posts?sort=${sort}`;
      if (feedFilter === 'following') {
        if (isLoggedIn) {
          postUrl += '&filter=following';
        } else {
          setFeedFilter('global');
        }
      }

      Promise.all([
        api.get('/api/hubs?sort=popular'),
        api.get(postUrl),
      ])
        .then(([hubsData, postsData]) => {
          setHubs(hubsData.hubs || []);
          setPosts(postsData.posts || []);
        })
        .catch(() => setError('Failed to load content. Is the backend running?'))
        .finally(() => setLoading(false));
    }
  }, [sort, searchQuery, feedFilter, isLoggedIn]);

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
            <div className="alert alert-success" style={{ marginBottom: '2rem' }}>
              🔍 Showing results for: <strong>{searchQuery}</strong>
            </div>
          )}

          {searchQuery && searchUsers.length > 0 && (
            <div className="search-section">
              <h3 className="search-section__heading">Users</h3>
              <div className="search-users">
                {searchUsers.map(u => (
                  <Link key={u._id} to={`/user/${u.username}`} className="search-user-chip">
                    <div className="search-user-chip__avatar">
                      {u.avatar
                        ? <img src={u.avatar} alt={u.username} className="search-user-chip__img" />
                        : u.username.charAt(0).toUpperCase()}
                    </div>
                    <strong>{u.username}</strong>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {searchQuery && searchHubs.length > 0 && (
            <div className="search-section">
              <h3 className="search-section__heading">Hubs</h3>
              <div className="search-hubs">
                {searchHubs.map(hub => <HubCard key={hub._id} hub={hub} />)}
              </div>
            </div>
          )}

          {searchQuery && (
            <h3 className="search-section__heading">Posts</h3>
          )}

          {/* Sort and Feed controls - hide during search */}
          {!searchQuery && (
            <div className="feed-controls" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              {isLoggedIn && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    className={`feed-controls__btn ${feedFilter === 'following' ? 'active' : ''}`}
                    onClick={() => setFeedFilter('following')}
                  >
                    👥 Following
                  </button>
                  <button
                    className={`feed-controls__btn ${feedFilter === 'global' ? 'active' : ''}`}
                    onClick={() => setFeedFilter('global')}
                  >
                    🌍 Global
                  </button>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: isLoggedIn ? 'auto' : '0' }}>
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
            </div>
          )}

          {loading ? (
            <div className="empty-state"><p>Loading posts…</p></div>
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              {feedFilter === 'following' && !searchQuery ? (
                <>
                  <h3>Your Following feed is empty</h3>
                  <p>Follow some users to see their posts here!</p>
                  <Link to="/hubs" className="btn btn-primary" style={{ marginTop: '1rem' }}>Explore Hubs</Link>
                </>
              ) : (
                <>
                  <h3>{searchQuery ? 'No posts match your search' : 'No posts yet'}</h3>
                  <p>{searchQuery ? 'Try a different search term.' : 'Be the first to post in a hub!'}</p>
                </>
              )}
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
            {isLoggedIn && (
              <>
                <button
                  className="btn btn-primary sidebar__more"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => { setShowCreateHub(p => !p); setHubCreateErr(''); }}
                >
                  {showCreateHub ? 'Cancel' : '+ Create Hub'}
                </button>
                {showCreateHub && (
                  <form onSubmit={handleCreateHub} style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <input
                      className="form-input"
                      placeholder="Hub name *"
                      value={newHubName}
                      onChange={e => { setNewHubName(e.target.value); setHubCreateErr(''); }}
                      maxLength={100}
                      autoFocus
                    />
                    <input
                      className="form-input"
                      placeholder="Game (optional)"
                      value={newHubGame}
                      onChange={e => setNewHubGame(e.target.value)}
                      maxLength={100}
                    />
                    <textarea
                      className="form-textarea"
                      placeholder="Description (optional)"
                      rows={2}
                      value={newHubDesc}
                      onChange={e => setNewHubDesc(e.target.value)}
                      maxLength={500}
                    />
                    {hubCreateErr && <span className="field-error" role="alert">{hubCreateErr}</span>}
                    <button type="submit" className="btn btn-primary btn-sm" disabled={hubCreating}>
                      {hubCreating ? 'Creating…' : 'Create Hub'}
                    </button>
                  </form>
                )}
              </>
            )}
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
