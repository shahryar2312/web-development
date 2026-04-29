import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

function AdminDashboard() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');

  // Security check: Redirect non-admins
  useEffect(() => {
    if (!isLoggedIn || user?.role !== 'admin') {
      navigate('/');
    }
  }, [isLoggedIn, user, navigate]);

  // Mock State
  const [users, setUsers] = useState([
    { id: 1, username: 'toxic_player', email: 'toxic@example.com', status: 'active', reported: 5 },
    { id: 2, username: 'friendly_gamer', email: 'friendly@example.com', status: 'active', reported: 0 },
    { id: 3, username: 'spambot99', email: 'bot@spam.com', status: 'active', reported: 12 },
  ]);

  const [hubs, setHubs] = useState([
    { id: 101, name: 'Valorant Trolls', members: 12, flags: 3 },
    { id: 102, name: 'Minecraft Builders', members: 450, flags: 0 },
    { id: 103, name: 'CSGO Trade Scams', members: 89, flags: 15 },
  ]);

  const [posts, setPosts] = useState([
    { id: 1001, author: 'toxic_player', content: 'You all suck at this game. Uninstall please.', reports: 4 },
    { id: 1002, author: 'spambot99', content: 'Buy cheap skins and aimbots here! http://fake.site', reports: 12 },
  ]);

  const handleBanUser = (id) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: 'banned' } : u));
  };

  const handleDeleteHub = (id) => {
    setHubs(hubs.filter(h => h.id !== id));
  };

  const handleDeletePost = (id) => {
    setPosts(posts.filter(p => p.id !== id));
  };

  if (!isLoggedIn || user?.role !== 'admin') return null;

  return (
    <div className="container admin-dashboard">
      <header className="admin-header">
        <h1>🛡️ Admin Dashboard</h1>
        <p>Manage users, hubs, and community content.</p>
      </header>

      <div className="admin-tabs">
        <button className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('users')}>Users</button>
        <button className={`btn ${activeTab === 'hubs' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('hubs')}>Hubs</button>
        <button className={`btn ${activeTab === 'posts' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('posts')}>Reported Posts</button>
      </div>

      <div className="admin-content">
        {activeTab === 'users' && (
          <div className="admin-panel">
            <h2>User Management</h2>
            <div className="table-responsive">
              <table className="admin-table">
                <thead><tr><th>Username</th><th>Email</th><th>Reports</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td style={{ color: u.reported > 0 ? 'var(--color-danger)' : 'inherit' }}>{u.reported}</td>
                      <td>
                        <span className={`badge ${u.status === 'banned' ? 'badge-danger' : 'badge-success'}`}>{u.status}</span>
                      </td>
                      <td>
                        {u.status !== 'banned' && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleBanUser(u.id)}>Ban</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'hubs' && (
          <div className="admin-panel">
            <h2>Hub Management</h2>
            <div className="table-responsive">
              <table className="admin-table">
                <thead><tr><th>Hub Name</th><th>Members</th><th>Flags</th><th>Action</th></tr></thead>
                <tbody>
                  {hubs.map(h => (
                    <tr key={h.id}>
                      <td>{h.name}</td>
                      <td>{h.members}</td>
                      <td style={{ color: h.flags > 0 ? 'var(--color-warning)' : 'inherit' }}>{h.flags}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteHub(h.id)}>Delete Hub</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="admin-panel">
            <h2>Content Moderation</h2>
            <div className="admin-post-list">
              {posts.map(p => (
                <div key={p.id} className="admin-post-card">
                  <div className="admin-post-header">
                    <strong>{p.author}</strong>
                    <span className="badge badge-danger">{p.reports} Reports</span>
                  </div>
                  <p className="admin-post-content">"{p.content}"</p>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeletePost(p.id)}>Delete Post</button>
                </div>
              ))}
              {posts.length === 0 && <p className="empty-state">No reported posts!</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
