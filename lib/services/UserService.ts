import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser, findUserByEmail } from '../repositories/user';
import type { UserDTO } from '@/dtos';

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: { id: string; email: string };
  tokens: AuthTokens;
}

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'apmp-access-secret-dev-key-2026';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'apmp-refresh-secret-dev-key-2026';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export class UserService {
  // --- Validation ---
  static validateEmail(email: unknown): string | null {
    if (!email || typeof email !== 'string') return 'Email is required';
    if (!EMAIL_REGEX.test(email)) return 'Invalid email format';
    return null;
  }

  static validatePassword(password: unknown): string | null {
    if (!password || typeof password !== 'string') return 'Password is required';
    if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    return null;
  }

  // --- Password Hashing ---
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // --- JWT Generation & Verification ---
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  }

  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  }

  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
      return { userId: decoded.userId, email: decoded.email };
    } catch {
      return null;
    }
  }

  static verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
      return { userId: decoded.userId, email: decoded.email };
    } catch {
      return null;
    }
  }

  // --- High-Level Auth Operations ---
  static async register(email: string, password: string): Promise<AuthResponse> {
    const emailError = this.validateEmail(email);
    if (emailError) throw new Error(emailError);
    
    const passwordError = this.validatePassword(password);
    if (passwordError) throw new Error(passwordError);

    const existingUser = await findUserByEmail(email);
    if (existingUser) throw new Error('User already exists');

    const hashedPassword = await this.hashPassword(password);
    const user = await createUser(email, hashedPassword);

    return this.generateAuthResponse(user);
  }

  static async login(email: string, password: string): Promise<AuthResponse> {
    const emailError = this.validateEmail(email);
    if (emailError) throw new Error(emailError);

    const user = await findUserByEmail(email);
    if (!user) throw new Error('Invalid email or password');

    const isMatch = await this.verifyPassword(password, user.passwordHash);
    if (!isMatch) throw new Error('Invalid email or password');

    return this.generateAuthResponse(user);
  }

  private static generateAuthResponse(user: UserDTO): AuthResponse {
    const payload: TokenPayload = { userId: user.id, email: user.email };
    return {
      user: { id: user.id, email: user.email },
      tokens: {
        accessToken: this.generateAccessToken(payload),
        refreshToken: this.generateRefreshToken(payload),
      }
    };
  }
}
