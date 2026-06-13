export interface GitHubTokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
  token_type: string;
}

export interface GitHubOAuthState {
  state: string;
  code_verifier: string;
  createdAt: number;
}

export interface CreateIssuePayload {
  title: string | number;
  body?: string;
  milestone?: number | string | null;
  labels?: string[];
  assignees?: string[];
  issue_field_values?: Array<{
    field_id: string;
    value: string | number | boolean;
  }>;
  type?: string | null;
}

export interface GitHubIssueResponse {
  id: number;
  number: number;
  html_url: string;
  title: string;
  state: string;
  body?: string;
}
