/**
 * 29.04 Ilia Klodin
 * big update to admin dashboard to accomodate the new changes I've implemented for backend
 * with the new admin-moderator-user separation and added admin and mod functionality
 *
 * Tabs:
 *   Users  — ban/unban, promote/demote role
 *   Hubs   — delete hub, manage moderators, manage hub bans
 *   Posts  — delete reported posts, lock/unlock posts
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

function AdminDashboard() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');

  // Security check: redirect non-admins
  useEffect(() => {
    if (!isLoggedIn || user?.role !== 'admin') {
      navigate('/');
    }
  }, [isLoggedIn, user, navigate]);

  /* ------------------------------------------------------------------
   * some mock data to populate the dashboard tables and demonstrate functionality.
   * when it'll come to integration these would be fetched from the backend 
   * ------------------------------------------------------------------ */
  const [users, setUsers] = useState([
    { _id: '507f1f77bcf86cd799439011', username: 'toxic_player',   email: 'toxic@example.com',   role: 'user',  status: 'active', reported: 5  },
    { _id: '507f1f77bcf86cd799439012', username: 'friendly_gamer', email: 'friendly@example.com', role: 'user',  status: 'active', reported: 0  },
    { _id: '507f1f77bcf86cd799439013', username: 'spambot99',      email: 'bot@spam.com',         role: 'user',  status: 'active', reported: 12 },
  ]);

  const [hubs, setHubs] = useState([
    { _id: '507f1f77bcf86cd799439021', name: 'Valorant Trolls',    members: 12,  flags: 3,  moderators: [],                 bannedUsers: []             },
    { _id: '507f1f77bcf86cd799439022', name: 'Minecraft Builders', members: 450, flags: 0,  moderators: ['friendly_gamer'], bannedUsers: []             },
    { _id: '507f1f77bcf86cd799439023', name: 'CSGO Trade Scams',   members: 89,  flags: 15, moderators: [],                 bannedUsers: ['toxic_player'] },
  ]);

  const [posts, setPosts] = useState([
    { _id: '507f1f77bcf86cd799439031', author: 'toxic_player', content: 'You all suck at this game. Uninstall please.',       reports: 4,  isLocked: false },
    { _id: '507f1f77bcf86cd799439032', author: 'spambot99',    content: 'Buy cheap skins and aimbots here! http://fake.site', reports: 12, isLocked: false },
  ]);

  // Hub management panel state
  const [selectedHubId, setSelectedHubId] = useState(null);
  const [modInput,      setModInput]      = useState('');
  const [banInput,      setBanInput]      = useState('');

  /* ---- User actions ---- */

  const handleBanUser = (_id) => {
    // backend: PATCH /api/users/:userId/ban  { isBanned: true }
    setUsers(users.map(u => u._id === _id ? { ...u, status: 'banned' } : u));
  };

  const handleUnbanUser = (_id) => {
    // backend: PATCH /api/users/:userId/ban  { isBanned: false }
    setUsers(users.map(u => u._id === _id ? { ...u, status: 'active' } : u));
  };

  const handleToggleRole = (_id) => {
    // backend: PATCH /api/users/:userId/role  { role: 'admin' | 'user' }
    setUsers(users.map(u => u._id === _id ? { ...u, role: u.role === 'admin' ? 'user' : 'admin' } : u));
  };

  /* ---- Hub actions ---- */

  const handleDeleteHub = (_id) => {
    // backend: DELETE /api/hubs/:hubId
    setHubs(hubs.filter(h => h._id !== _id));
    if (selectedHubId === _id) setSelectedHubId(null);
  };

  const handleAddModerator = (_id) => {
    const username = modInput.trim();
    if (!username) return;
    // backend: POST /api/hubs/:hubId/moderators/:userId
    setHubs(hubs.map(h =>
      h._id === _id && !h.moderators.includes(username)
        ? { ...h, moderators: [...h.moderators, username] }
        : h
    ));
    setModInput('');
  };

  const handleRemoveModerator = (_id, username) => {
    // backend: DELETE /api/hubs/:hubId/moderators/:userId
    setHubs(hubs.map(h =>
      h._id === _id
        ? { ...h, moderators: h.moderators.filter(m => m !== username) }
        : h
    ));
  };

  const handleHubBanUser = (_id) => {
    const username = banInput.trim();
    if (!username) return;
    // backend: POST /api/hubs/:hubId/ban/:userId
    setHubs(hubs.map(h =>
      h._id === _id && !h.bannedUsers.includes(username)
        ? { ...h, bannedUsers: [...h.bannedUsers, username] }
        : h
    ));
    setBanInput('');
  };

  const handleHubUnbanUser = (_id, username) => {
    // backend: DELETE /api/hubs/:hubId/ban/:userId
    setHubs(hubs.map(h =>
      h._id === _id
        ? { ...h, bannedUsers: h.bannedUsers.filter(u => u !== username) }
        : h
    ));
  };

  /* ---- Post (as in posts, not POST) actions ---- */

  const handleDeletePost = (_id) => {
    // backend: DELETE /api/posts/:postId
    setPosts(posts.filter(p => p._id !== _id));
  };

  const handleToggleLock = (_id) => {
    // backend: PATCH /api/posts/:postId/lock
    setPosts(posts.map(p => p._id === _id ? { ...p, isLocked: !p.isLocked } : p));
  };

  if (!isLoggedIn || user?.role !== 'admin') return null;

  const selectedHub = hubs.find(h => h._id === selectedHubId);

  return (
    <div className="container admin-dashboard">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Manage users, hubs, and community content.</p>
      </header>

      <div className="admin-tabs">
        {['users', 'hubs', 'posts'].map((tab) => (
          <button
            key={tab}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'posts' ? 'Reported Posts' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="admin-content">

        {/* ===== Users tab ===== */}
        {activeTab === 'users' && (
          <div className="admin-panel">
            <h2>User Management</h2>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Reports</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-danger' : 'badge-info'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ color: u.reported > 0 ? 'var(--color-danger)' : 'inherit' }}>
                        {u.reported}
                      </td>
                      <td>
                        <span className={`badge ${u.status === 'banned' ? 'badge-danger' : 'badge-success'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="admin-actions">
                        {u.status !== 'banned'
                          ? <button className="btn btn-danger btn-sm" onClick={() => handleBanUser(u._id)}>Ban</button>
                          : <button className="btn btn-secondary btn-sm" onClick={() => handleUnbanUser(u._id)}>Unban</button>
                        }
                        <button
                          className="btn btn-sm admin-role-btn"
                          data-promote={u.role !== 'admin'}
                          onClick={() => handleToggleRole(u._id)}
                        >
                          {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== Hubs tab ===== */}
        {activeTab === 'hubs' && (
          <div className="admin-panel">
            <h2>Hub Management</h2>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Hub Name</th>
                    <th>Members</th>
                    <th>Flags</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hubs.map(h => (
                    <tr key={h._id}>
                      <td>{h.name}</td>
                      <td>{h.members}</td>
                      <td style={{ color: h.flags > 0 ? 'var(--color-warning)' : 'inherit' }}>{h.flags}</td>
                      <td className="admin-actions">
                        <button
                          className={`btn btn-sm ${selectedHubId === h._id ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => {
                            setSelectedHubId(selectedHubId === h._id ? null : h._id);
                            setModInput('');
                            setBanInput('');
                          }}
                        >
                          {selectedHubId === h._id ? 'Close' : 'Manage'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteHub(h._id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ---- Hub management panel ---- */}
            {selectedHub && (
              <div className="admin-hub-management">
                <h3 className="admin-hub-management__title">Managing: {selectedHub.name}</h3>

                {/* Moderators */}
                <div className="admin-hub-section">
                  <h4>Moderators</h4>
                  <div className="admin-tag-list">
                    {selectedHub.moderators.length === 0
                      ? <span className="admin-empty-msg">No moderators assigned.</span>
                      : selectedHub.moderators.map(username => (
                          <span key={username} className="admin-tag">
                            {username}
                            <button
                              className="admin-tag__remove"
                              onClick={() => handleRemoveModerator(selectedHub._id, username)}
                              aria-label={`Remove ${username} as moderator`}
                            >
                              ×
                            </button>
                          </span>
                        ))
                    }
                  </div>
                  <div className="admin-hub-input-row">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Username to add as moderator"
                      value={modInput}
                      onChange={e => setModInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddModerator(selectedHub._id)}
                    />
                    <button className="btn btn-primary btn-sm" onClick={() => handleAddModerator(selectedHub._id)}>
                      Add Mod
                    </button>
                  </div>
                </div>

                {/* Hub bans */}
                <div className="admin-hub-section">
                  <h4>Hub-Banned Users</h4>
                  <div className="admin-tag-list">
                    {selectedHub.bannedUsers.length === 0
                      ? <span className="admin-empty-msg">No users banned from this hub.</span>
                      : selectedHub.bannedUsers.map(username => (
                          <span key={username} className="admin-tag admin-tag--banned">
                            {username}
                            <button
                              className="admin-tag__remove"
                              onClick={() => handleHubUnbanUser(selectedHub._id, username)}
                              aria-label={`Unban ${username} from hub`}
                            >
                              ×
                            </button>
                          </span>
                        ))
                    }
                  </div>
                  <div className="admin-hub-input-row">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Username to ban from this hub"
                      value={banInput}
                      onChange={e => setBanInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleHubBanUser(selectedHub._id)}
                    />
                    <button className="btn btn-danger btn-sm" onClick={() => handleHubBanUser(selectedHub._id)}>
                      Hub Ban
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== Posts tab ===== */}
        {activeTab === 'posts' && (
          <div className="admin-panel">
            <h2>Content Moderation</h2>
            <div className="admin-post-list">
              {posts.map(p => (
                <div key={p._id} className="admin-post-card">
                  <div className="admin-post-header">
                    <strong>{p.author}</strong>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="badge badge-danger">{p.reports} Reports</span>
                      {p.isLocked && <span className="badge badge-warning">🔒 Locked</span>}
                    </div>
                  </div>
                  <p className="admin-post-content">"{p.content}"</p>
                  <div className="admin-post-actions">
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeletePost(p._id)}>
                      Delete Post
                    </button>
                    <button
                      className={`btn btn-sm ${p.isLocked ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => handleToggleLock(p._id)}
                    >
                      {p.isLocked ? '🔓 Unlock Post' : '🔒 Lock Post'}
                    </button>
                  </div>
                </div>
              ))}
              {posts.length === 0 && <p className="empty-state">No reported posts.</p>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default AdminDashboard;
