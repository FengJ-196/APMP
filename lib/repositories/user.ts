/**
 * MongoDB-backed user store.
 */
import dbConnect from '../db';
import { User } from '../models';
import type { UserDTO } from '@/dtos';

function mapToUserType(doc: any): UserDTO {
  return {
    id: doc._id.toString(),
    email: doc.email,
    passwordHash: doc.passwordHash,
    createdAt: doc.createdAt,
  };
}

/**
 * Create a new user in MongoDB.
 */
export async function createUser(email: string, passwordHash: string): Promise<UserDTO> {
  await dbConnect();
  const user = await User.create({
    email: email.toLowerCase().trim(),
    passwordHash,
  });
  return mapToUserType(user);
}

/**
 * Find a user by their email address in MongoDB.
 */
export async function findUserByEmail(email: string): Promise<UserDTO | undefined> {
  await dbConnect();
  const user = await User.findOne({ email: email.toLowerCase().trim() }).lean();
  if (!user) return undefined;
  return mapToUserType(user);
}

/**
 * Clear all users. Used in tests.
 */
export async function clearUsers(): Promise<void> {
  await dbConnect();
  await User.deleteMany({});
}
