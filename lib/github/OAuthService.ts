import crypto from 'crypto';
import { GitHubTokenResponse } from './types';

export class OAuthService {
  private static getClientId(): string {
    const clientId = process.env.GITHUB_CLIENT_ID || process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) {
      // In development or test, we fall back to a dummy string or throw
      if (process.env.NODE_ENV === 'test') return 'test-client-id';
      throw new Error('GITHUB_CLIENT_ID environment variable is missing.');
    }
    return clientId;
  }

  private static getClientSecret(): string {
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientSecret) {
      if (process.env.NODE_ENV === 'test') return 'test-client-secret';
      throw new Error('GITHUB_CLIENT_SECRET environment variable is missing.');
    }
    return clientSecret;
  }

  private static getRedirectUri(): string {
    const redirectUri = process.env.GITHUB_REDIRECT_URI || process.env.NEXT_PUBLIC_GITHUB_REDIRECT_URI;
    if (!redirectUri) {
      if (process.env.NODE_ENV === 'test') return 'http://localhost:3000/api/github/callback';
      throw new Error('GITHUB_REDIRECT_URI environment variable is missing.');
    }
    return redirectUri;
  }

  /**
   * Generates a secure high-entropy code verifier for PKCE.
   * Returns a 43-character base64url-encoded string (32 random bytes).
   */
  static generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generates the code challenge corresponding to the given verifier.
   * The challenge is the base64url-encoded SHA-256 hash of the verifier.
   */
  static generateCodeChallenge(verifier: string): string {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest()
      .toString('base64url');
  }

  /**
   * Generates a random state string to protect against CSRF attacks.
   */
  static generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Constructs the URL to redirect the user to for GitHub OAuth authorization.
   */
  static getAuthorizeUrl(state: string, codeChallenge: string): string {
    const clientId = this.getClientId();
    const redirectUri = this.getRedirectUri();
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchanges the temporary authorization code for a permanent/refreshable user access token.
   */
  static async exchangeCodeForToken(code: string, codeVerifier: string): Promise<GitHubTokenResponse> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    const redirectUri = this.getRedirectUri();

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub token exchange failed with HTTP status ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    return data as GitHubTokenResponse;
  }

  /**
   * Refreshes an expired user access token using a refresh token.
   */
  static async refreshToken(refreshToken: string): Promise<GitHubTokenResponse> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub token refresh failed with HTTP status ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`GitHub token refresh error: ${data.error_description || data.error}`);
    }

    return data as GitHubTokenResponse;
  }
}
