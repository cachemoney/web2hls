import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OAuthButton } from './oauth-button';
import React from 'react';

vi.mock('../hooks/use-youtube-auth', () => ({
  useYouTubeAuth: vi.fn().mockReturnValue({
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: false,
    isPending: false,
  }),
}));

describe('OAuthButton', () => {
  const config = { clientId: 'test' };

  it('should render sign in text when not authenticated', () => {
    render(<OAuthButton config={config} />);
    expect(screen.getByText(/Sign In with YouTube/i)).toBeDefined();
  });
});
