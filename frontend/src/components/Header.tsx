'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path
      ? 'text-primary-600 font-semibold'
      : 'text-gray-600 hover:text-primary-600';
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl">🤖</span>
            <span className="font-bold text-xl">AI Newsletter</span>
          </Link>

          <nav className="flex space-x-6">
            <Link href="/" className={`transition-colors ${isActive('/')}`}>
              Home
            </Link>
            <Link href="/newsletters" className={`transition-colors ${isActive('/newsletters')}`}>
              Newsletter
            </Link>
            <Link href="/admin" className={`transition-colors ${isActive('/admin')}`}>
              Admin
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
