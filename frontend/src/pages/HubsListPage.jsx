/**
 * 28.04 Ilia Klodin: added a hubs list page with search and sort functionality.
 * Maps to backend: GET /api/hubs?search=<q>&sort=<sort>&page=<page>
 *
 * previously used mock data for visualization purposes — now comes from the backend
 */
import React, { useState, useEffect, useCallback } from 'react';
import HubCard from '../components/HubCard';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import './HubsListPage.css';

function HubsListPage() {
  const { isLoggedIn } = useAuth();

  const [hubs,    setHubs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [sort,    setSort]    = useState('popular');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName,        setNewName]        = useState('');
  const [newGame,        setNewGame]        = useState('');
  const [newDesc,        setNewDesc]        = useState('');
  const [creating,       setCreating]       = useState(false);
  const [createError,    setCreateError]    = useState('');

  // 06.05 Ilia Klodin: any logged-in user can create a hub, POST /api/hubs
  const handleCreateHub = async (e) => {
    e.preventDefault();
    if (!newName.trim()) { setCreateError('Hub name is required.'); return; }
    setCreating(true); setCreateError('');
    try {
      const data = await api.post('/api/hubs', {
        name: newName.trim(),
        game: newGame.trim() || undefined,
        description: newDesc.trim() || undefined,
      });
      setHubs(prev => [data.hub, ...prev]);
      setShowCreateForm(false);
      setNewName(''); setNewGame(''); setNewDesc('');
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const fetchHubs = useCallback(async (searchTerm, sortOrder) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ sort: sortOrder });
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      const data = await api.get(`/api/hubs?${params}`);
      setHubs(data.hubs || []);
    } catch (err) {
      setError('Failed to load hubs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search so we don't hammer the API on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => fetchHubs(search, sort), 500);
    return () => clearTimeout(timer);
  }, [search, sort, fetchHubs]);

  return (
    <div className="container hubs-list-page">
      <div className="hubs-list-page__header">
        <h1>All Hubs</h1>
        <p>Find your gaming community.</p>
      </div>

      <div className="hubs-list-page__controls">
        <input
          type="search"
          className="form-input hubs-list-page__search"
          placeholder="Search hubs by name or game…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search hubs"
        />
        <div className="hubs-list-page__sort">
          <span>Sort:</span>
          {[['popular', '🔥 Popular'], ['name', '🔤 Name']].map(([val, label]) => (
            <button
              key={val}
              className={`feed-controls__btn ${sort === val ? 'active' : ''}`}
              onClick={() => setSort(val)}
              aria-pressed={sort === val}
            >
              {label}
            </button>
          ))}
        </div>
        {isLoggedIn && (
          <button
            className="btn btn-primary"
            onClick={() => { setShowCreateForm(p => !p); setCreateError(''); }}
          >
            {showCreateForm ? 'Cancel' : '+ Create Hub'}
          </button>
        )}
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateHub} style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '480px' }}>
          <input
            className="form-input"
            placeholder="Hub name *"
            value={newName}
            onChange={e => { setNewName(e.target.value); setCreateError(''); }}
            maxLength={100}
            autoFocus
          />
          <input
            className="form-input"
            placeholder="Game (optional)"
            value={newGame}
            onChange={e => setNewGame(e.target.value)}
            maxLength={100}
          />
          <textarea
            className="form-textarea"
            placeholder="Description (optional)"
            rows={3}
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            maxLength={500}
          />
          {createError && <span className="field-error" role="alert">{createError}</span>}
          <button type="submit" className="btn btn-primary" disabled={creating} style={{ alignSelf: 'flex-start' }}>
            {creating ? 'Creating…' : 'Create Hub'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="empty-state"><p>Loading hubs…</p></div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : hubs.length === 0 ? (
        <div className="empty-state">
          <h3>No hubs match your search</h3>
          <p>Try a different search term.</p>
        </div>
      ) : (
        <div className="hubs-list-page__grid">
          {hubs.map(hub => <HubCard key={hub._id} hub={hub} />)}
        </div>
      )}
    </div>
  );
}

export default HubsListPage;
