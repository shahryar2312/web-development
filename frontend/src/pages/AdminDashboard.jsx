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
import { useModal } from '../context/ModalContext';
import { api } from '../services/api';
import './AdminDashboard.css';

function AdminDashboard() {
  const { user, isLoggedIn } = useAuth();
  const { showModal }        = useModal();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');

  // Security check: redirect non-admins
  useEffect(() => {
    if (!isLoggedIn || user?.role !== 'admin') navigate('/');
  }, [isLoggedIn, user, navigate]);

  /* ------------------------------------------------------------------
   * data fetched from the backend on mount — replaces the mock data
   * that was here previously while the backend was not yet integrated
   * ------------------------------------------------------------------ */
  const [users,     setUsers]     = useState([]);
  const [hubs,      setHubs]      = useState([]);
  const [posts,     setPosts]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  /* ---- Hub management panel state ---- */
  const [selectedHubId,      setSelectedHubId]      = useState(null);
  const [selectedHubDetails, setSelectedHubDetails] = useState(null);
  const [modInput,           setModInput]           = useState('');
  const [banInput,           setBanInput]           = useState('');
  const [hubPanelMsg,        setHubPanelMsg]        = useState('');

  /* ---- Load all data on mount ---- */
  useEffect(() => {
    if (!isLoggedIn || user?.role !== 'admin') return;
    setLoading(true);
    Promise.all([
      api.get('/api/users'),
      api.get('/api/hubs?sort=name'),
      api.get('/api/posts?sort=new'),
    ])
      .then(([usersData, hubsData, postsData]) => {
        setUsers(usersData.users || []);
        setHubs(hubsData.hubs || []);
        setPosts(postsData.posts || []);
      })
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, [isLoggedIn, user]);

  /* ---- Helper: find userId by username from loaded users list ---- */
  const findUserId = (username) => {
    const u = users.find((u) => u.username === username.trim());
    return u?._id ?? null;
  };

  /* ---- Helper: find username by id from loaded users list ---- */
  const findUsername = (id) => {
    const u = users.find((u) => u._id === id?.toString());
    return u?.username ?? id?.toString().slice(-8) ?? '?';
  };

  /* ---- User actions ---- */

  const handleBanUser = async (_id) => {
    const u = users.find((u) => u._id === _id);
    try {
      await api.patch(`/api/users/${_id}/ban`, { isBanned: !u?.isBanned });
      setUsers(users.map((u) => u._id === _id ? { ...u, isBanned: !u.isBanned } : u));
    } catch (err) {
      showModal({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  const handleToggleRole = async (_id) => {
    const u = users.find((u) => u._id === _id);
    const newRole = u?.role === 'admin' ? 'user' : 'admin';
    try {
      await api.patch(`/api/users/${_id}/role`, { role: newRole });
      setUsers(users.map((u) => u._id === _id ? { ...u, role: newRole } : u));
    } catch (err) {
      showModal({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  /* ---- Hub actions ---- */

  const handleDeleteHub = async (_id) => {
    showModal({
      title: 'Delete Hub',
      message: 'Delete this hub? This cannot be undone.',
      type: 'error',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await api.delete(`/api/hubs/${_id}`);
          setHubs(hubs.filter((h) => h._id !== _id));
          if (selectedHubId === _id) { setSelectedHubId(null); setSelectedHubDetails(null); }
        } catch (err) {
          showModal({ title: 'Error', message: err.message, type: 'error' });
        }
      }
    });
  };

  const handleManageHub = async (_id) => {
    if (selectedHubId === _id) {
      setSelectedHubId(null);
      setSelectedHubDetails(null);
      setModInput('');
      setBanInput('');
      setHubPanelMsg('');
      return;
    }
    setSelectedHubId(_id);
    setModInput('');
    setBanInput('');
    setHubPanelMsg('');
    try {
      const data = await api.get(`/api/hubs/${_id}`);
      setSelectedHubDetails(data.hub);
    } catch (err) {
      showModal({ title: 'Error', message: 'Failed to load hub details.', type: 'error' });
      setSelectedHubId(null);
    }
  };

  const handleAddModerator = async () => {
    const username = modInput.trim();
    if (!username) return;
    const userId = findUserId(username);
    if (!userId) { setHubPanelMsg(`User "${username}" not found in the current user list.`); return; }
    try {
      await api.post(`/api/hubs/${selectedHubId}/moderators/${userId}`);
      setSelectedHubDetails((prev) => ({
        ...prev,
        moderators: [...(prev.moderators || []), { _id: userId, username }],
      }));
      setModInput('');
      setHubPanelMsg(`${username} added as moderator.`);
    } catch (err) {
      setHubPanelMsg(err.message);
    }
  };

  const handleRemoveModerator = async (modId, modUsername) => {
    try {
      await api.delete(`/api/hubs/${selectedHubId}/moderators/${modId}`);
      setSelectedHubDetails((prev) => ({
        ...prev,
        moderators: prev.moderators.filter((m) => m._id !== modId),
      }));
      setHubPanelMsg(`${modUsername} removed as moderator.`);
    } catch (err) {
      setHubPanelMsg(err.message);
    }
  };

  const handleHubBanUser = async () => {
    const username = banInput.trim();
    if (!username) return;
    const userId = findUserId(username);
    if (!userId) { setHubPanelMsg(`User "${username}" not found in the current user list.`); return; }
    try {
      await api.post(`/api/hubs/${selectedHubId}/ban/${userId}`);
      setSelectedHubDetails((prev) => ({
        ...prev,
        bannedUsers: [...(prev.bannedUsers || []), userId],
      }));
      setBanInput('');
      setHubPanelMsg(`${username} has been banned from this hub.`);
    } catch (err) {
      setHubPanelMsg(err.message);
    }
  };

  const handleHubUnbanUser = async (userId) => {
    try {
      await api.delete(`/api/hubs/${selectedHubId}/ban/${userId}`);
      setSelectedHubDetails((prev) => ({
        ...prev,
        bannedUsers: prev.bannedUsers.filter((id) => id !== userId && id?._id !== userId),
      }));
      setHubPanelMsg(`User unbanned from this hub.`);
    } catch (err) {
      setHubPanelMsg(err.message);
    }
  };

  /* ---- Post actions ---- */

  const handleDeletePost = async (_id) => {
    showModal({
      title: 'Delete Post',
      message: 'Are you sure you want to delete this post? This cannot be undone.',
      type: 'error',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await api.delete(`/api/posts/${_id}`);
          setPosts(posts.filter((p) => p._id !== _id));
        } catch (err) {
          showModal({ title: 'Error', message: err.message, type: 'error' });
        }
      }
    });
  };

  const handleToggleLock = async (_id) => {
    const post = posts.find((p) => p._id === _id);
    try {
      await api.patch(`/api/posts/${_id}/lock`, { isLocked: !post?.isLocked });
      setPosts(posts.map((p) => p._id === _id ? { ...p, isLocked: !p.isLocked } : p));
    } catch (err) {
      showModal({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  if (!isLoggedIn || user?.role !== 'admin') return null;

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

      {loading && <div className="empty-state"><p>Loading dashboard…</p></div>}
      {error   && <div className="alert alert-error">{error}</div>}

      {!loading && !error && (
        <div className="admin-content">

          {/* ===== Users tab ===== */}
          {activeTab === 'users' && (
            <div className="admin-panel">
              <h2>User Management ({users.length} users loaded)</h2>
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td>{u.username}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge ${u.role === 'admin' ? 'badge-danger' : 'badge-info'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.isBanned ? 'badge-danger' : 'badge-success'}`}>
                            {u.isBanned ? 'Banned' : 'Active'}
                          </span>
                        </td>
                        <td className="admin-actions">
                          {u._id !== user._id && (
                            <>
                              <button
                                className={`btn btn-sm ${u.isBanned ? 'btn-secondary' : 'btn-danger'}`}
                                onClick={() => handleBanUser(u._id)}
                              >
                                {u.isBanned ? 'Unban' : 'Ban'}
                              </button>
                              <button
                                className="btn btn-sm admin-role-btn"
                                data-promote={u.role !== 'admin'}
                                onClick={() => handleToggleRole(u._id)}
                              >
                                {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                              </button>
                            </>
                          )}
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hubs.map((h) => (
                      <tr key={h._id}>
                        <td>{h.name}</td>
                        <td>{h.memberCount?.toLocaleString() ?? 0}</td>
                        <td className="admin-actions">
                          <button
                            className={`btn btn-sm ${selectedHubId === h._id ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => handleManageHub(h._id)}
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

              {/* Hub management panel */}
              {selectedHubDetails && (
                <div className="admin-hub-management">
                  <h3 className="admin-hub-management__title">Managing: {selectedHubDetails.name}</h3>
                  {hubPanelMsg && <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>{hubPanelMsg}</p>}

                  {/* Moderators */}
                  <div className="admin-hub-section">
                    <h4>Moderators</h4>
                    <div className="admin-tag-list">
                      {(selectedHubDetails.moderators || []).length === 0 ? (
                        <span className="admin-empty-msg">No moderators assigned.</span>
                      ) : (
                        selectedHubDetails.moderators.map((mod) => {
                          const modId  = mod._id ?? mod;
                          const modName = mod.username ?? findUsername(modId);
                          return (
                            <span key={modId} className="admin-tag">
                              {modName}
                              <button
                                className="admin-tag__remove"
                                onClick={() => handleRemoveModerator(modId, modName)}
                                aria-label={`Remove ${modName} as moderator`}
                              >×</button>
                            </span>
                          );
                        })
                      )}
                    </div>
                    <div className="admin-hub-input-row">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Username to add as moderator"
                        value={modInput}
                        onChange={(e) => setModInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddModerator()}
                      />
                      <button className="btn btn-primary btn-sm" onClick={handleAddModerator}>Add Mod</button>
                    </div>
                  </div>

                  {/* Hub bans */}
                  <div className="admin-hub-section">
                    <h4>Hub-Banned Users</h4>
                    <div className="admin-tag-list">
                      {(selectedHubDetails.bannedUsers || []).length === 0 ? (
                        <span className="admin-empty-msg">No users banned from this hub.</span>
                      ) : (
                        selectedHubDetails.bannedUsers.map((entry) => {
                          const uid  = entry._id ?? entry;
                          const uname = entry.username ?? findUsername(uid);
                          return (
                            <span key={uid} className="admin-tag admin-tag--banned">
                              {uname}
                              <button
                                className="admin-tag__remove"
                                onClick={() => handleHubUnbanUser(uid)}
                                aria-label={`Unban ${uname} from hub`}
                              >×</button>
                            </span>
                          );
                        })
                      )}
                    </div>
                    <div className="admin-hub-input-row">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Username to ban from this hub"
                        value={banInput}
                        onChange={(e) => setBanInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleHubBanUser()}
                      />
                      <button className="btn btn-danger btn-sm" onClick={handleHubBanUser}>Hub Ban</button>
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
                {posts.length === 0 ? (
                  <p className="empty-state">No posts found.</p>
                ) : (
                  posts.map((p) => (
                    <div key={p._id} className="admin-post-card">
                      <div className="admin-post-header">
                        <strong>u/{p.author?.username ?? p.author}</strong>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {p.isLocked && <span className="badge badge-warning">🔒 Locked</span>}
                        </div>
                      </div>
                      <p className="admin-post-content">
                        <strong>{p.title}</strong>
                        {p.content && <span style={{ color: 'var(--color-text-muted)' }}> — {p.content.slice(0, 120)}{p.content.length > 120 ? '…' : ''}</span>}
                      </p>
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
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
