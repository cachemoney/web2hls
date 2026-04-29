import { useState, useCallback, useEffect, useMemo } from 'react';
import { YouTubeAuth, YouTubeAuthConfig, OAuthToken } from 'web2hls';

export interface UseYouTubeAuthResult {
  login: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  token: string | null;
  error: Error | null;
  isPending: boolean;
}

export function useYouTubeAuth(config: YouTubeAuthConfig): UseYouTubeAuthResult {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPending, setIsPending] = useState(false);

  const auth = useMemo(() => new YouTubeAuth(), []);

  const checkAuth = useCallback(async () => {
    try {
      const validToken = await auth.getValidToken(config);
      setToken(validToken);
    } catch (e: any) {
      console.error('Auth check failed', e);
    }
  }, [auth, config]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async () => {
    setIsPending(true);
    setError(null);
    try {
      const { url, codeVerifier } = await auth.generateAuthUrl(config);
      
      // Store codeVerifier in sessionStorage for the callback
      sessionStorage.setItem('web2hls_code_verifier', codeVerifier);
      
      // Redirect to Google
      window.location.href = url;
    } catch (e: any) {
      setError(e);
      setIsPending(false);
    }
  }, [auth, config]);

  const logout = useCallback(() => {
    auth.logout();
    setToken(null);
  }, [auth]);

  // Handle OAuth callback if code is in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const codeVerifier = sessionStorage.getItem('web2hls_code_verifier');

    if (code && codeVerifier) {
      setIsPending(true);
      sessionStorage.removeItem('web2hls_code_verifier');
      
      // Remove code from URL without refreshing
      window.history.replaceState({}, document.title, window.location.pathname);

      auth.exchangeCodeForToken(code, codeVerifier, config)
        .then(token => {
          setToken(token.access_token);
        })
        .catch(setError)
        .finally(() => setIsPending(false));
    }
  }, [auth, config]);

  return {
    login,
    logout,
    isAuthenticated: !!token,
    token,
    error,
    isPending,
  };
}
