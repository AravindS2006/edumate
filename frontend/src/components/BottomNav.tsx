'use client';

import { motion } from 'framer-motion';
import { Home, User, Calendar, FileText, BookOpen } from 'lucide-react';

export type NavTab = 'home' | 'profile' | 'attendance' | 'reports';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const tabs: { id: NavTab; icon: typeof Home; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'attendance', icon: Calendar, label: 'Attendance' },
  { id: 'reports', icon: FileText, label: 'Reports' },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-4 md:pb-5"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="flex items-center gap-1 rounded-[2rem] border border-white/20 bg-white/95 px-2 py-2 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl md:max-w-md md:rounded-2xl md:px-4 md:py-2.5 md:shadow-xl"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-1 min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:scale-[0.98] md:flex-initial md:rounded-lg md:px-5 md:py-2"
              style={{ minHeight: 44 }}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="pointer-events-none absolute inset-1 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 md:inset-0.5 md:rounded-lg"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  style={{ boxShadow: '0 4px 20px -2px rgba(99, 102, 241, 0.4)' }}
                />
              )}
              <span
                className={`relative z-10 flex items-center gap-2 ${isActive ? 'text-white' : 'text-slate-500'
                  }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </button>
          );
        })}
      </motion.div>
    </nav>
  );
}
