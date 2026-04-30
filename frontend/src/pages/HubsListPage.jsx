/**
 * 28.04 Ilia Klodin: added a hubs list page with search and sort functionality.
 * Maps to backend: GET /api/hubs?search=<q>&sort=<sort>&page=<page>
 */
import React, { useState, useMemo } from 'react';
import HubCard from '../components/HubCard';
import './HubsListPage.css';

const MOCK_HUBS = [ // some mock data for now for visualization purposes. later no should come from the backend
  { _id: 'h1', name: 'Valorant',   slug: 'valorant',   game: 'Valorant',         memberCount: 48200, description: 'The #1 hub for Valorant players. Tips, clips, and team-ups.' },
  { _id: 'h2', name: 'Minecraft',  slug: 'minecraft',  game: 'Minecraft',        memberCount: 91000, description: 'Build, survive, and explore with fellow Minecrafters.' },
  { _id: 'h3', name: 'FIFA25',     slug: 'fifa25',     game: 'EA Sports FC 25',  memberCount: 32100, description: 'Ultimate Team squads, trade tips, and match clips.' },
  { _id: 'h4', name: 'Elden Ring', slug: 'elden-ring', game: 'Elden Ring',       memberCount: 27500, description: 'Lore, builds, and co-op for Tarnished everywhere.' },
  { _id: 'h5', name: 'CSGO2',      slug: 'csgo2',      game: 'Counter-Strike 2', memberCount: 54300, description: 'Strategy, clips, and team-find for CS2 players.' },
];

function HubsListPage() {
  const [search, setSearch] = useState('');
  const [sort,   setSort]   = useState('popular');

  const filteredHubs = useMemo(() => {
    let result = [...MOCK_HUBS];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(h =>
        h.name.toLowerCase().includes(q) || h.game.toLowerCase().includes(q)
      );
    }
    if (sort === 'popular') result.sort((a, b) => b.memberCount - a.memberCount);
    if (sort === 'name')    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [search, sort]);

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

      {filteredHubs.length === 0 ? (
        <div className="empty-state">
          <h3>No hubs match your search</h3>
          <p>Try a different search term.</p>
        </div>
      ) : (
        <div className="hubs-list-page__grid">
          {filteredHubs.map(hub => <HubCard key={hub._id} hub={hub} />)}
        </div>
      )}
    </div>
  );
}

export default HubsListPage;
