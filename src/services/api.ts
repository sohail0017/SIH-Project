// ============================================================================
// SkillTrack — data backend adapter
// ----------------------------------------------------------------------------
// The frontend reads and writes ALL persisted data through this interface.
// Communicates with the Express REST API and persistent SQLite database, with
// automatic fallback to static seed JSON files when operating offline.
// ============================================================================

import { TableName } from './model';

export interface DataBackend {
  /** Fetch all records of a table (database records or seed fallback). */
  list<T = unknown>(table: TableName): Promise<T[]>;
  /** Insert a new record and persist it to database. */
  insert<T extends { id: string }>(table: TableName, record: T): Promise<void>;
  /** Patch an existing record (by id) and persist to database. */
  update<T = unknown>(table: TableName, id: string, patch: Partial<T>): Promise<void>;
  /** Delete a record from the database. */
  delete(table: TableName, id: string): Promise<void>;
  /** Clear all local mutations / reset database to seed state. */
  reset(): Promise<void>;
}

// Authentication is maintained by the server in an HTTP-only cookie, with an
// optional in-memory / session-scoped JWT bearer fallback for maximum compatibility.
// Raw passwords are NEVER stored in client storage.
let inMemoryToken: string | null = null;

export function getAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    return sessionStorage.getItem('skilltrack_token');
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
  try {
    if (token) {
      sessionStorage.setItem('skilltrack_token', token);
    } else {
      sessionStorage.removeItem('skilltrack_token');
    }
  } catch {
    /* ignore session storage errors */
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    let errorMsg = `API request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {
      /* non-json error response */
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export class HttpApiBackend implements DataBackend {
  async list<T>(table: TableName): Promise<T[]> {
    // Authenticated API is the source of truth. Do not fall back to public seed
    // data when the API returns 401/403, otherwise protected records could be
    // exposed through the frontend fallback.
    try {
      return await apiRequest<T[]>(`/api/data/${table}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
    } catch (error) {
      if (error instanceof Error && /\b(401|403)\b/.test(error.message)) {
        throw error;
      }

      // Backend unavailable — retain the existing offline seed fallback.
      const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';
      const fallbackRes = await fetch(`${base}data/${table}.json`, { cache: 'no-store' });
      if (!fallbackRes.ok) throw new Error(`Failed to load data for ${table}`);
      return (await fallbackRes.json()) as T[];
    }
  }

  async insert<T extends { id: string }>(
  table: TableName,
  record: T
): Promise<void> {
  await apiRequest(`/api/data/${table}`, {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

async update<T>(
  table: TableName,
  id: string,
  patch: Partial<T>
): Promise<void> {
  await apiRequest(`/api/data/${table}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

async delete(table: TableName, id: string): Promise<void> {
  await apiRequest(`/api/data/${table}/${id}`, {
    method: 'DELETE',
  });
}
  async reset(): Promise<void> {
    try {
      await apiRequest('/api/admin/reset', { method: 'POST' });
    } catch {
      /* ignore */
    }
  }
}

/** Active persistent database backend */
export const backend: DataBackend = new HttpApiBackend();
