import { useState } from "react";
import { useLocation } from "wouter";

export default function Navigation() {
  const [location, setLocation] = useLocation();

  const navItems = [
    { id: 'dashboard', icon: 'fas fa-home', label: 'Dashboard', path: '/' },
    { id: 'explore', icon: 'fas fa-compass', label: 'Explore', path: '/explore' },
    { id: 'learn', icon: 'fas fa-brain', label: 'Learn', path: '/learn' },
    { id: 'profile', icon: 'fas fa-user', label: 'Profile', path: '/profile' },
  ];

  const handleNavClick = (path: string) => {
    setLocation(path);
  };

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
      <div className="flex justify-around py-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              className={`flex flex-col items-center py-2 px-4 transition-colors ${
                isActive 
                  ? 'text-primary' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-primary'
              }`}
            >
              <i className={`${item.icon} text-xl mb-1`}></i>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
