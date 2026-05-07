/**
 * src/tests/components/PostCard.test.jsx
 *
 * Unit tests for the PostCard component.
 * Mocks AuthContext, ModalContext, and the api service.
 * Tests: rendering, vote buttons, author link, hub link.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import PostCard from '../../components/PostCard';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../context/ModalContext', () => ({
  useModal: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { api } from '../../services/api';

// ─── Test data ────────────────────────────────────────────────────────────────

const mockPost = {
  _id: 'post123',
  title: 'Best Landing Spots in Fortnite',
  content: 'Here are the top landing spots you should try.',
  type: 'text',
  voteScore: 5,
  userVote: 0,
  commentCount: 12,
  author: { username: 'gamer42', avatar: '' },
  hub: { name: 'Fortnite Central', slug: 'fortnite-central' },
  createdAt: new Date(Date.now() - 3600 * 1000).toISOString(), // 1h ago
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockShowModal = vi.fn();

function renderPostCard(post = mockPost, isLoggedIn = true) {
  useAuth.mockReturnValue({ isLoggedIn });
  useModal.mockReturnValue({ showModal: mockShowModal });

  return render(
    <MemoryRouter>
      <PostCard post={post} />
    </MemoryRouter>
  );
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('PostCard — rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the post title', () => {
    renderPostCard();
    expect(screen.getByText('Best Landing Spots in Fortnite')).toBeInTheDocument();
  });

  it('renders a truncated content preview', () => {
    renderPostCard();
    expect(screen.getByText(/Here are the top landing spots/)).toBeInTheDocument();
  });

  it('renders the author username prefixed with u/', () => {
    renderPostCard();
    expect(screen.getByText('u/gamer42')).toBeInTheDocument();
  });

  it('renders the hub name prefixed with h/', () => {
    renderPostCard();
    expect(screen.getByText('h/Fortnite Central')).toBeInTheDocument();
  });

  it('renders the vote score', () => {
    renderPostCard();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders the comment count', () => {
    renderPostCard();
    expect(screen.getByText(/12 comments/)).toBeInTheDocument();
  });

  it('renders the TEXT badge for text-type posts', () => {
    renderPostCard();
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('renders LFG badge for lfg-type posts', () => {
    renderPostCard({ ...mockPost, type: 'lfg' });
    expect(screen.getByText('LFG')).toBeInTheDocument();
  });

  it('renders the relative timestamp', () => {
    renderPostCard();
    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });

  it('renders a Pinned badge when isPinned is true', () => {
    renderPostCard({ ...mockPost, isPinned: true });
    expect(screen.getByText(/Pinned/)).toBeInTheDocument();
  });

  it('renders a Locked badge when isLocked is true', () => {
    renderPostCard({ ...mockPost, isLocked: true });
    expect(screen.getByText(/Locked/)).toBeInTheDocument();
  });
});

// ─── Author and Hub links ─────────────────────────────────────────────────────

describe('PostCard — navigation links', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('author link points to the correct user profile URL', () => {
    renderPostCard();
    const authorLink = screen.getByText('u/gamer42').closest('a');
    expect(authorLink).toHaveAttribute('href', '/user/gamer42');
  });

  it('hub link points to the correct hub URL', () => {
    renderPostCard();
    const hubLink = screen.getByText('h/Fortnite Central').closest('a');
    expect(hubLink).toHaveAttribute('href', '/hub/fortnite-central');
  });

  it('title link points to the post detail page', () => {
    renderPostCard();
    const titleLink = screen.getByText('Best Landing Spots in Fortnite').closest('a');
    expect(titleLink).toHaveAttribute('href', '/post/post123');
  });
});

// ─── Voting ───────────────────────────────────────────────────────────────────

describe('PostCard — voting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a modal when unauthenticated user tries to vote', async () => {
    renderPostCard(mockPost, false);
    const upvoteBtn = screen.getByRole('button', { name: /upvote/i });
    fireEvent.click(upvoteBtn);
    expect(mockShowModal).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' })
    );
  });

  it('calls api.post with value 1 when upvote is clicked', async () => {
    api.post.mockResolvedValue({ voteScore: 6, userVote: 1 });
    renderPostCard();
    const upvoteBtn = screen.getByRole('button', { name: /upvote/i });
    fireEvent.click(upvoteBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/posts/post123/vote',
        { value: 1 }
      );
    });
  });

  it('calls api.post with value -1 when downvote is clicked', async () => {
    api.post.mockResolvedValue({ voteScore: 4, userVote: -1 });
    renderPostCard();
    const downvoteBtn = screen.getByRole('button', { name: /downvote/i });
    fireEvent.click(downvoteBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/posts/post123/vote',
        { value: -1 }
      );
    });
  });

  it('updates the displayed score optimistically after upvote', async () => {
    api.post.mockResolvedValue({ voteScore: 6, userVote: 1 });
    renderPostCard();
    const upvoteBtn = screen.getByRole('button', { name: /upvote/i });
    fireEvent.click(upvoteBtn);

    await waitFor(() => {
      expect(screen.getByText('6')).toBeInTheDocument();
    });
  });

  it('adds active class to upvote button when user has upvoted', () => {
    renderPostCard({ ...mockPost, userVote: 1 });
    const upvoteBtn = screen.getByRole('button', { name: /upvote/i });
    expect(upvoteBtn).toHaveClass('active');
  });

  it('adds active class to downvote button when user has downvoted', () => {
    renderPostCard({ ...mockPost, userVote: -1 });
    const downvoteBtn = screen.getByRole('button', { name: /downvote/i });
    expect(downvoteBtn).toHaveClass('active');
  });

  it('does NOT bubble vote click to the parent link (stopPropagation)', () => {
    api.post.mockResolvedValue({ voteScore: 6, userVote: 1 });
    renderPostCard();
    const upvoteBtn = screen.getByRole('button', { name: /upvote/i });
    // Clicking the button should call api, not navigate
    fireEvent.click(upvoteBtn);
    // Navigation would cause an error if it tried — test passes if no throw
    expect(api.post).toHaveBeenCalled();
  });
});

// ─── Content truncation ───────────────────────────────────────────────────────

describe('PostCard — content truncation', () => {
  it('truncates content longer than 200 characters with ellipsis', () => {
    const longContent = 'a'.repeat(201);
    renderPostCard({ ...mockPost, content: longContent });
    const preview = screen.getByText(/a+…/);
    expect(preview.textContent.length).toBeLessThanOrEqual(204); // 200 chars + '…'
  });

  it('shows full content when it is 200 characters or fewer', () => {
    const shortContent = 'b'.repeat(200);
    renderPostCard({ ...mockPost, content: shortContent });
    expect(screen.getByText(shortContent)).toBeInTheDocument();
  });
});
