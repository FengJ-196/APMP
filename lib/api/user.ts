import { fetchClient } from './client';
import type { CreateUserInputDTO } from '@/dtos';
import type { AuthResponse } from '../services/UserService';

export const userApi = {
  /**
   * Register a new user.
   */
  register: (data: CreateUserInputDTO) => 
    fetchClient<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Log in an existing user.
   */
  login: (data: CreateUserInputDTO) => 
    fetchClient<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  /**
   * Log out the user locally by removing tokens.
   */
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }
};
