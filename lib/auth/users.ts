/**
 * In-memory user store.
 * 
 * This is a simple Map-based store for development and testing.
 * In production, replace with a real database (Supabase/Postgres).
 * 
 * The interface is kept minimal and database-agnostic so that
 * swapping to a real DB only requires changing this file.
 */
import type { User } from './types';

const users = new Map<string, User>();

let idCounter = 0;

function generateId(): string {
  idCounter++;
  return `user-${Date.now()}-${idCounter}`;
}

/**
 * Create a new user. Returns the created user.
 * Does NOT check for duplicates — caller should check first.
 */
export function createUser(email: string, passwordHash: string): User {
  const user: User = {
    id: generateId(),
    email: email.toLowerCase().trim(),
    passwordHash,
    createdAt: new Date(),
  };
  users.set(user.email, user);
  return user;
}

/**
 * Find a user by their email address.
 * @returns The user, or `undefined` if not found.
 */
export function findUserByEmail(email: string): User | undefined {
  return users.get(email.toLowerCase().trim());
}

/**
 * Clear all users. Used in tests.
 */
export function clearUsers(): void {
  users.clear();
  idCounter = 0;
}
