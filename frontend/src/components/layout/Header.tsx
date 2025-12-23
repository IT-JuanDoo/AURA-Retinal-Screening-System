import React from 'react';
import NotificationBell from '../common/NotificationBell';

const Header = () => {
  // TODO: Get user info from auth context/store

  return (
    <header className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">AURA</h1>
          <nav className="hidden sm:flex gap-4 text-sm text-gray-600">
            <a href="/">Home</a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          {/* TODO: Add user menu */}
        </div>
      </div>
    </header>
  );
};

export default Header;

