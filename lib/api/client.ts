export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * A generic fetch wrapper that automatically handles:
 * 1. JSON headers (unless FormData is used)
 * 2. Attaching the JWT token from localStorage
 * 3. Consistent error handling
 */
export async function fetchClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  // Auto-attach auth token if in the browser
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  // If the body is FormData (like a file upload), the browser must automatically set 
  // the Content-Type to multipart/form-data with the correct boundary.
  if (options.body instanceof FormData) {
    delete (headers as Record<string, string>)['Content-Type'];
  }

  const response = await fetch(endpoint, config);

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    throw new ApiError(data?.error || data?.message || 'API request failed', response.status);
  }

  return data as T;
}
