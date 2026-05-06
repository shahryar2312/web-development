/**
 * 28.04 Ilia Klodin: added a hubs list page with search and sort functionality.
 * Maps to backend: GET /api/hubs?search=<q>&sort=<sort>&page=<page>
 *
 * previously used mock data for visualization purposes — now comes from the backend
 */
import React, { useState, useEffect, useCallback } from 'react';
import HubCard from '../components/HubCard';
import { api } from '../services/api';
import './HubsListPage.css';

function HubsListPage() {
  const [hubs,    setHubs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [sort,    setSort]    = useState('popular');

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
    const timer = setTimeout(() => fetchHubs(search, sort), 300);
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
      </div>

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
