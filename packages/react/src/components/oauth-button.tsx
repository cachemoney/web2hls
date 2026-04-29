import React from 'react';
import { useYouTubeAuth } from '../hooks/use-youtube-auth';
import { YouTubeAuthConfig } from 'web2hls';

export interface OAuthButtonProps {
  config: YouTubeAuthConfig;
  onLogin?: (token: string) => void;
  onLogout?: () => void;
  className?: string;
}

export const OAuthButton: React.FC<OAuthButtonProps> = ({
  config,
  onLogin,
  onLogout,
  className
}) => {
  const { login, logout, isAuthenticated, isPending } = useYouTubeAuth(config);

  const handleClick = async () => {
    if (isAuthenticated) {
      logout();
      onLogout?.();
    } else {
      await login();
      // login redirects, so onLogin won't be called here
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '8px 16px',
        backgroundColor: isAuthenticated ? '#f0f0f0' : '#ff0000',
        color: isAuthenticated ? '#333' : '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        ...(!isAuthenticated && { boxShadow: '0 2px 4px rgba(0,0,0,0.2)' })
      }}
    >
      {isPending ? 'Connecting...' : isAuthenticated ? 'Sign Out of YouTube' : 'Sign In with YouTube'}
    </button>
  );
};
