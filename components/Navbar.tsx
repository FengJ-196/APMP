'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Simple check for access token
    const token = localStorage.getItem('accessToken');
    setIsLoggedIn(!!token);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsLoggedIn(false);
    router.push('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-surface/80 backdrop-blur-md border-b border-border-subtle h-16 flex items-center px-6">
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center shadow-lg shadow-accent-primary/20">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-text-primary">APMP</span>
          </Link>
        </div>

        <div className="flex items-center gap-8">
          <Link
            href="/"
            className={`text-sm font-semibold transition-all hover:text-accent-primary ${
              pathname === '/' ? 'text-accent-primary' : 'text-text-secondary'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/gateway"
            className={`text-sm font-semibold transition-all hover:text-accent-primary ${
              pathname === '/gateway' ? 'text-accent-primary' : 'text-text-secondary'
            }`}
          >
            AI Gateway
          </Link>
          
          {isLoggedIn ? (
            <>
              <Link
                href="/projects/create"
                className={`text-sm font-semibold transition-all hover:text-accent-primary ${
                  pathname === '/projects/create' ? 'text-accent-primary' : 'text-text-secondary'
                }`}
              >
                Create Project
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-semibold text-text-tertiary hover:text-status-error transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`text-sm font-semibold transition-all hover:text-accent-primary ${
                  pathname === '/login' ? 'text-accent-primary' : 'text-text-secondary'
                }`}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="bg-accent-primary hover:bg-accent-hover text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-accent-primary/20 transition-all hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
