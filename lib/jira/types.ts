export interface JiraTokenResponse {
  access_token: string;
  expires_in?: number;
  scope: string;
  refresh_token?: string;
  token_type: string;
}

export interface JiraAccessibleResource {
  id: string;
  name: string;
  url: string;
  scopes: string[];
  avatarUrl?: string;
}

export interface JiraOAuthState {
  state: string;
  createdAt: number;
}

// Atlassian Document Format (ADF) Node interface
export interface ADFNode {
  type: string;
  attrs?: Record<string, any>;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
  text?: string;
  content?: ADFNode[];
}

export interface JiraADFDoc {
  type: 'doc';
  version: number;
  content: ADFNode[];
}

export interface CreateJiraIssuePayload {
  fields: {
    project: {
      key?: string;
      id?: string;
    };
    summary: string;
    description?: JiraADFDoc;
    issuetype: {
      name?: string;
      id?: string;
    };
    parent?: {
      key?: string;
      id?: string;
    };
    labels?: string[];
    [customField: string]: any; // for story points or custom fields
  };
}

export interface JiraIssueResponse {
  id: string;
  key: string;
  self: string;
}
