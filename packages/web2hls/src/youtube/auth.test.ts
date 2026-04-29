import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YouTubeAuth, SessionTokenStorage } from './auth';

// Mock storage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, 'sessionStorage', {
  value: mockSessionStorage,
});

// Mock crypto
const mockCrypto = {
  getRandomValues: vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) array[i] = i;
    return array;
  }),
  subtle: {
    digest: vi.fn(async () => new Uint8Array(32).fill(1).buffer),
  },
};

Object.defineProperty(globalThis, 'crypto', {
  value: mockCrypto,
});

// Mock btoa (not in Node by default in older versions, but available in globalThis in modern Node)
if (typeof btoa === 'undefined') {
  globalThis.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
}

describe('YouTubeAuth', () => {
  const config = {
    clientId: 'test-client-id',
    redirectUri: 'http://localhost/callback',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.clear();
  });

  it('should generate a valid auth URL with PKCE', async () => {
    const auth = new YouTubeAuth();
    const { url, codeVerifier } = await auth.generateAuthUrl(config);

    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('code_challenge=');
    expect(url).toContain('code_challenge_method=S256');
    expect(codeVerifier).toBeDefined();
    expect(codeVerifier.length).toBeGreaterThan(0);
  });

  it('should exchange code for token', async () => {
    const mockToken = {
      access_token: 'access-123',
      expires_in: 3600,
      refresh_token: 'refresh-456',
      scope: 'https://www.googleapis.com/auth/youtube.upload',
      token_type: 'Bearer',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockToken,
    } as any);

    const auth = new YouTubeAuth();
    const token = await auth.exchangeCodeForToken('test-code', 'test-verifier', config);

    expect(token.access_token).toBe('access-123');
    expect(token.refresh_token).toBe('refresh-456');
    expect(mockSessionStorage.setItem).toHaveBeenCalled();
  });

  it('should refresh access token', async () => {
    const mockRefreshedToken = {
      access_token: 'access-new',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/youtube.upload',
      token_type: 'Bearer',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRefreshedToken,
    } as any);

    const auth = new YouTubeAuth();
    const token = await auth.refreshAccessToken('refresh-456', config);

    expect(token.access_token).toBe('access-new');
    expect(token.refresh_token).toBe('refresh-456'); // Should keep original if not returned
  });

  it('should return valid token from storage if not expired', async () => {
    const storage = new SessionTokenStorage();
    const token = {
      access_token: 'valid-token',
      expires_in: 3600,
      refresh_token: 'refresh-456',
      scope: 'scope',
      token_type: 'Bearer',
      created_at: Date.now(),
    };
    storage.saveToken(token);

    const auth = new YouTubeAuth(storage);
    const validToken = await auth.getValidToken(config);

    expect(validToken).toBe('valid-token');
  });

  it('should refresh token if expired', async () => {
    const storage = new SessionTokenStorage();
    const token = {
      access_token: 'expired-token',
      expires_in: 3600,
      refresh_token: 'refresh-456',
      scope: 'scope',
      token_type: 'Bearer',
      created_at: Date.now() - 4000 * 1000, // Long ago
    };
    storage.saveToken(token);

    const mockRefreshedToken = {
      access_token: 'access-new',
      expires_in: 3600,
      token_type: 'Bearer',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRefreshedToken,
    } as any);

    const auth = new YouTubeAuth(storage);
    const validToken = await auth.getValidToken(config);

    expect(validToken).toBe('access-new');
  });
});
