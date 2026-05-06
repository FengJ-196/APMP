/**
 * In-memory Project store.
 *
 * Mimics a MongoDB collection for development and testing.
 * In production, replace with actual MongoDB driver calls.
 *
 * Key design decisions:
 * - IDs are generated as 24-char hex strings matching MongoDB ObjectId format
 * - Projects are stored in a Map keyed by id for O(1) lookup
 * - findProjectsByUserId performs a linear scan (mirrors a MongoDB query with index)
 */
import type { Project, CreateProjectInput } from './types';

const projects = new Map<string, Project>();

/**
 * Generate a 24-character hex string that mimics a MongoDB ObjectId.
 *
 * Structure (following ObjectId spec loosely):
 *  - 8 chars: timestamp in seconds (hex)
 *  - 10 chars: random hex
 *  - 6 chars: incrementing counter (hex)
 */
let counterValue = 0;

function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0');

  const random = Array.from({ length: 10 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');

  counterValue++;
  const counter = counterValue.toString(16).padStart(6, '0');

  return `${timestamp}${random}${counter}`;
}

/**
 * Create a new project and store it.
 * Defaults `status` to `'active'` and `created_at` to now.
 */
export function createProject(input: CreateProjectInput): Project {
  const project: Project = {
    id: generateObjectId(),
    title: input.title,
    user_id: input.user_id,
    status: input.status ?? 'active',
    created_at: new Date(),
  };

  projects.set(project.id, project);
  return project;
}

/**
 * Find a single project by its id.
 * @returns The project, or `undefined` if not found.
 */
export function findProjectById(id: string): Project | undefined {
  return projects.get(id);
}

/**
 * Find all projects belonging to a given user.
 * @returns An array of projects (empty if none found).
 */
export function findProjectsByUserId(userId: string): Project[] {
  const result: Project[] = [];
  for (const project of projects.values()) {
    if (project.user_id === userId) {
      result.push(project);
    }
  }
  return result;
}

/**
 * Clear all projects. Used in tests.
 */
export function clearProjects(): void {
  projects.clear();
  counterValue = 0;
}
