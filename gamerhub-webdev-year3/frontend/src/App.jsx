/**
 * App.jsx — Root component
 * Defines the client-side route structure using React Router v6.
 * Each <Route> maps a URL path to a page component.
 */
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HubPage from './pages/HubPage';
import PostDetailPage from './pages/PostDetailPage';
import LFGPage from './pages/LFGPage';
import CreatePostPage from './pages/CreatePostPage';
import UserProfilePage from './pages/UserProfilePage';

function App() {
  return (
    <>
      {/* Navbar is rendered on every page */}
      <Navbar />

      {/* Main content area below the navbar */}
      <main>
        <Routes>
          {/* View 1 — Landing / Home feed */}
          <Route path="/"                        element={<HomePage />} />

          {/* View 2 — Authentication */}
          <Route path="/login"                   element={<LoginPage />} />
          <Route path="/register"                element={<RegisterPage />} />

          {/* View 3 — Hub (gaming community) page */}
          {/* :slug maps to the hub's URL-friendly identifier, e.g. /hub/valorant */}
          <Route path="/hub/:slug"               element={<HubPage />} />

          {/* View 4 — Individual post with comments */}
          {/* Matches GET /api/posts/:postId on the backend */}
          <Route path="/post/:postId"            element={<PostDetailPage />} />

          {/* View 5 — Looking for Group listings */}
          {/* Matches GET /api/lfg on the backend */}
          <Route path="/lfg"                     element={<LFGPage />} />

          {/* View 6 — Create a new post inside a hub */}
          {/* Matches POST /api/hubs/:hubId/posts on the backend */}
          <Route path="/hub/:slug/create-post"   element={<CreatePostPage />} />

          {/* View 7 — User Profile page (Screen 4 from proposal wireframes) */}
          {/* Matches GET /api/users/:username on the backend */}
          <Route path="/user/:username"          element={<UserProfilePage />} />

          {/* 404 fallback */}
          <Route path="*" element={
            <div className="container empty-state" style={{ marginTop: '4rem' }}>
              <h2>404 — Page Not Found</h2>
              <p>The page you are looking for does not exist.</p>
            </div>
          } />
        </Routes>
      </main>
    </>
  );
}

export default App;
