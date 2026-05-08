'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/' },
    { name: 'Projects', href: '/projects/create' },
    { name: 'Login', href: '/login' },
    { name: 'Register', href: '/register' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-surface/80 backdrop-blur-md border-b border-border-subtle h-16 flex items-center px-6">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center">
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
        </div>

        <div className="flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors hover:text-accent-primary ${
                pathname === item.href ? 'text-accent-primary' : 'text-text-secondary'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-3">
           <div className="px-3 py-1 rounded-full bg-accent-subtle border border-accent-primary/20 text-[10px] font-bold text-accent-primary uppercase tracking-widest">
            Experimental
          </div>
        </div>
      </div>
    </nav>
  );
}
