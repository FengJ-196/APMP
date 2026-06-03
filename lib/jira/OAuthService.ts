import crypto from 'crypto';
import { JiraTokenResponse, JiraAccessibleResource } from './types';

export class OAuthService {
  private static getClientId(): string {
    const clientId = process.env.JIRA_CLIENT_ID || process.env.NEXT_PUBLIC_JIRA_CLIENT_ID;
    if (!clientId) {
      if (process.env.NODE_ENV === 'test') return 'test-jira-client-id';
      throw new Error('JIRA_CLIENT_ID environment variable is missing.');
    }
    return clientId;
  }

  private static getClientSecret(): string {
    const clientSecret = process.env.JIRA_CLIENT_SECRET;
    if (!clientSecret) {
      if (process.env.NODE_ENV === 'test') return 'test-jira-client-secret';
      throw new Error('JIRA_CLIENT_SECRET environment variable is missing.');
    }
    return clientSecret;
  }

  private static getRedirectUri(): string {
    const redirectUri = process.env.JIRA_REDIRECT_URI || process.env.NEXT_PUBLIC_JIRA_REDIRECT_URI;
    if (!redirectUri) {
      if (process.env.NODE_ENV === 'test') return 'http://localhost:3000/api/jira/callback';
      throw new Error('JIRA_REDIRECT_URI environment variable is missing.');
    }
    return redirectUri;
  }

  /**
   * Generates a random state string for CSRF security validation.
   */
  static generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Constructs the consent URL pointing to auth.atlassian.com to initiate the OAuth flow.
   */
  static getAuthorizeUrl(state: string): string {
    const clientId = this.getClientId();
    const redirectUri = this.getRedirectUri();
    
    // read:jira-work and write:jira-work are the primary scopes for managing tasks
    // offline_access is essential to receive a refresh token for background refreshes
    const scopes = ['read:jira-work', 'write:jira-work', 'offline_access'];
    
    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: clientId,
      scope: scopes.join(' '),
      redirect_uri: redirectUri,
      state: state,
      response_type: 'code',
      prompt: 'consent',
    });

    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  /**
   * Exchanges the temporary authorization code for Atlassian User Access/Refresh Tokens.
   */
  static async exchangeCodeForToken(code: string): Promise<JiraTokenResponse> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    const redirectUri = this.getRedirectUri();

    const response = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Atlassian token exchange failed with HTTP status ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Atlassian OAuth error: ${data.error_description || data.error}`);
    }

    return data as JiraTokenResponse;
  }

  /**
   * Refreshes an expired Atlassian access token using a refresh token.
   */
  static async refreshToken(refreshToken: string): Promise<JiraTokenResponse> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    const response = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Atlassian token refresh failed with HTTP status ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Atlassian token refresh error: ${data.error_description || data.error}`);
    }

    return data as JiraTokenResponse;
  }

  /**
   * Fetches the list of accessible sites (and their cloudId) associated with the authorized access token.
   */
  static async getAccessibleResources(accessToken: string): Promise<JiraAccessibleResource[]> {
    const response = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch accessible Atlassian resources: HTTP status ${response.status}`);
    }

    const data = await response.json();
    return data as JiraAccessibleResource[];
  }
}
