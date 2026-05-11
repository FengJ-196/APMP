'use client';

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { userApi } from '@/lib/api';

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  // Password strength indicator
  function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score, label: 'Weak', color: 'var(--status-error)' };
    if (score <= 2) return { score, label: 'Fair', color: 'var(--status-warning)' };
    if (score <= 3) return { score, label: 'Good', color: 'var(--status-info)' };
    return { score, label: 'Strong', color: 'var(--accent-primary)' };
  }

  function validateForm(): boolean {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setSuccess(false);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const data = await userApi.register({ email, password });

      // Store tokens
      localStorage.setItem('accessToken', data.tokens.accessToken);
      localStorage.setItem('refreshToken', data.tokens.refreshToken);
      setSuccess(true);

      // Redirect after brief success animation
      setTimeout(() => {
        window.location.href = '/';
      }, 1200);
    } catch (err: any) {
      setErrors({ general: err.message || 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  }

  const strength = getPasswordStrength(password);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-bg-base">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="absolute inset-0 animate-grid-scroll"
          style={{
            backgroundImage:
              'linear-gradient(var(--text-tertiary) 1px, transparent 1px), linear-gradient(90deg, var(--text-tertiary) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Radial glow — offset to top-right for visual variety */}
      <div className="absolute top-[30%] right-[20%] w-[700px] h-[700px] rounded-full bg-accent-glow opacity-30 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[10%] w-[500px] h-[500px] rounded-full opacity-20 blur-[120px] pointer-events-none" style={{ background: 'rgba(59, 130, 246, 0.12)' }} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[440px] mx-4">
        <div className="animate-fade-in-up">
          {/* Logo / Brand */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-glow mb-6 animate-pulse-glow">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-text-tertiary">
              Start building with Synthetic Architect
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="animate-fade-in-up-delay-1">
          <div className="bg-bg-surface/80 backdrop-blur-xl border border-border-subtle rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
            {/* Success state */}
            {success && (
              <div className="mb-6 p-4 rounded-xl bg-accent-glow border border-accent-primary/20 text-accent-primary text-sm font-medium flex items-center gap-3 animate-fade-in-up">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Account created! Redirecting…
              </div>
            )}

            {/* General error */}
            {errors.general && (
              <div className="mb-6 p-4 rounded-xl bg-status-error-glow border border-status-error/20 text-status-error text-sm font-medium flex items-center gap-3 animate-fade-in-up">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate id="register-form">
              {/* Email */}
              <div className="mb-5">
                <label
                  htmlFor="register-email"
                  className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2"
                >
                  Email
                </label>
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className={`auth-input ${errors.email ? 'error' : ''}`}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'register-email-error' : undefined}
                />
                {errors.email && (
                  <p id="register-email-error" className="mt-2 text-xs text-status-error font-medium">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="mb-5">
                <label
                  htmlFor="register-password"
                  className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password)
                        setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    className={`auth-input pr-12 ${errors.password ? 'error' : ''}`}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'register-password-error' : undefined}
                  />
                  <button
                    type="button"
                    id="register-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-tertiary hover:text-text-primary transition-colors rounded-md"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p id="register-password-error" className="mt-2 text-xs text-status-error font-medium">
                    {errors.password}
                  </p>
                )}

                {/* Password strength meter */}
                {password.length > 0 && (
                  <div className="mt-3 animate-fade-in-up">
                    <div className="flex gap-1 mb-1.5">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{
                            background:
                              level <= strength.score
                                ? strength.color
                                : 'var(--bg-overlay)',
                          }}
                        />
                      ))}
                    </div>
                    <p
                      className="text-xs font-medium transition-colors"
                      style={{ color: strength.color }}
                    >
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="mb-6">
                <label
                  htmlFor="register-confirm-password"
                  className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2"
                >
                  Confirm Password
                </label>
                <input
                  id="register-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword)
                      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  className={`auth-input ${errors.confirmPassword ? 'error' : ''}`}
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={
                    errors.confirmPassword ? 'register-confirm-error' : undefined
                  }
                />
                {errors.confirmPassword && (
                  <p id="register-confirm-error" className="mt-2 text-xs text-status-error font-medium">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                id="register-submit"
                disabled={isLoading || success}
                className="auth-btn-primary"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating account…
                  </span>
                ) : success ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Account Created
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-8 pt-6 border-t border-border-subtle text-center">
              <p className="text-sm text-text-tertiary">
                Already have an account?{' '}
                <Link
                  href="/login"
                  id="register-login-link"
                  className="text-accent-primary font-semibold hover:text-accent-hover transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom shimmer bar */}
        <div className="animate-fade-in-up-delay-3 mt-6">
          <div className="h-1 rounded-full overflow-hidden animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
