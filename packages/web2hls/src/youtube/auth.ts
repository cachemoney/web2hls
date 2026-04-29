import { YouTubeAuthConfig } from '../types';

export interface OAuthToken {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  created_at: number;
}

export interface TokenStorage {
  getToken(): OAuthToken | null;
  saveToken(token: OAuthToken): void;
  clearToken(): void;
}

export class SessionTokenStorage implements TokenStorage {
  private key = 'web2hls_youtube_token';

  getToken(): OAuthToken | null {
    const data = sessionStorage.getItem(this.key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  saveToken(token: OAuthToken): void {
    sessionStorage.setItem(this.key, JSON.stringify(token));
  }

  clearToken(): void {
    sessionStorage.removeItem(this.key);
  }
}

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export class YouTubeAuth {
  private storage: TokenStorage;

  constructor(storage: TokenStorage = new SessionTokenStorage()) {
    this.storage = storage;
  }

  logout(): void {
    this.storage.clearToken();
  }

  async generateAuthUrl(config: YouTubeAuthConfig): Promise<{ url: string; codeVerifier: string }> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri || window.location.origin,
      response_type: 'code',
      scope: (config.scopes || [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly'
      ]).join(' '),
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent'
    });

    return {
      url: `${AUTH_URL}?${params.toString()}`,
      codeVerifier
    };
  }

  async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    config: YouTubeAuthConfig
  ): Promise<OAuthToken> {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri || window.location.origin,
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier
    });

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to exchange code: ${error.error_description || error.error}`);
    }

    const data = await response.json();
    const token: OAuthToken = {
      ...data,
      created_at: Date.now()
    };

    this.storage.saveToken(token);
    return token;
  }

  async refreshAccessToken(refreshToken: string, config: YouTubeAuthConfig): Promise<OAuthToken> {
    const params = new URLSearchParams({
      client_id: config.clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to refresh token: ${error.error_description || error.error}`);
    }

    const data = await response.json();
    const currentToken = this.storage.getToken();
    const newToken: OAuthToken = {
      ...data,
      refresh_token: data.refresh_token || refreshToken, // Google might not return a new refresh token
      created_at: Date.now()
    };

    this.storage.saveToken(newToken);
    return newToken;
  }

  async getValidToken(config: YouTubeAuthConfig): Promise<string | null> {
    const token = this.storage.getToken();
    if (!token) return null;

    const bufferMs = 60 * 1000; // 1 minute buffer
    const isExpired = Date.now() >= token.created_at + (token.expires_in * 1000) - bufferMs;

    if (!isExpired) {
      return token.access_token;
    }

    if (token.refresh_token) {
      try {
        const refreshedToken = await this.refreshAccessToken(token.refresh_token, config);
        return refreshedToken.access_token;
      } catch (e) {
        console.error('Failed to refresh YouTube token', e);
        this.storage.clearToken();
        return null;
      }
    }

    this.storage.clearToken();
    return null;
  }

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64UrlEncode(array);
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.base64UrlEncode(new Uint8Array(hash));
  }

  private base64UrlEncode(array: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...Array.from(array)));
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
