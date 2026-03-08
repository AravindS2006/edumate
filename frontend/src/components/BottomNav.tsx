'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, User, Calendar, FileText, Menu, X, Upload, Inbox, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export type NavTab = 'home' | 'profile' | 'attendance' | 'reports' | 'hallticket' | 'documents' | 'inbox';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const tabs: { id: NavTab; icon: any; label: string }[] = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'attendance', icon: Calendar, label: 'Attendance' },
  { id: 'reports', icon: FileText, label: 'Reports' },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTabClick = (id: NavTab) => {
    setIsMenuOpen(false);
    onTabChange(id);
  };

  const isMenuTabActive = ['hallticket', 'documents', 'inbox'].includes(activeTab);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-4 md:pb-5"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="relative flex flex-col items-end w-full max-w-md md:max-w-xl" ref={menuRef}>

        {/* Animated Dropdown / Popup Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute bottom-full mb-4 right-0 w-56 sm:w-64 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-900/20 border border-slate-100/50 overflow-hidden z-50 p-2 origin-bottom-right"
            >
              <div className="space-y-1">
                <button onClick={() => handleTabClick('hallticket')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-2xl transition-all ${activeTab === 'hallticket' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-700 bg-transparent hover:bg-slate-50 hover:text-indigo-600'}`}>
                  <FileText size={18} /> HallTicket
                </button>
                <button onClick={() => handleTabClick('documents')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-2xl transition-all ${activeTab === 'documents' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-700 bg-transparent hover:bg-slate-50 hover:text-emerald-600'}`}>
                  <Upload size={18} /> Document Upload
                </button>
                <button onClick={() => handleTabClick('inbox')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-2xl transition-all ${activeTab === 'inbox' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-700 bg-transparent hover:bg-slate-50 hover:text-amber-600'}`}>
                  <Inbox size={18} /> Inbox
                </button>
                <div className="h-px bg-slate-100 my-1 mx-2" />
                <button onClick={() => { localStorage.clear(); router.push('/'); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 bg-transparent hover:bg-red-50 rounded-2xl transition-all">
                  <LogOut size={18} /> Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main bottom bar background and tabs */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="flex items-center gap-1 w-full rounded-[2.5rem] border border-white/20 bg-white/95 px-2 py-2 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl md:rounded-3xl md:px-4 md:py-2.5 justify-between"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className="relative flex flex-1 min-w-0 items-center justify-center gap-2 rounded-2xl px-2 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:flex-initial md:rounded-xl md:px-4"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="pointer-events-none absolute inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 md:inset-0.5 md:rounded-xl"
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    style={{ boxShadow: '0 4px 20px -2px rgba(99, 102, 241, 0.4)' }}
                  />
                )}
                <span className={`relative z-10 flex flex-col md:flex-row items-center gap-1.5 ${isActive ? 'text-white' : 'text-slate-500 hover:text-indigo-500'}`}>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="hidden md:block text-xs font-bold">{tab.label}</span>
                </span>
              </button>
            );
          })}

          {/* Special Menu Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="relative flex flex-1 min-w-0 items-center justify-center gap-2 rounded-2xl px-2 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:flex-initial md:rounded-xl md:px-4"
          >
            {(isMenuOpen || isMenuTabActive) && !['home', 'profile', 'attendance', 'reports'].includes(activeTab) && (
              <motion.div
                layoutId="nav-pill"
                className="pointer-events-none absolute inset-1 rounded-2xl bg-slate-800 md:inset-0.5 md:rounded-xl shadow-lg"
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              />
            )}
            <span className={`relative z-10 flex flex-col md:flex-row items-center gap-1.5 ${isMenuOpen || isMenuTabActive ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}>
              {isMenuOpen ? <X size={22} strokeWidth={2.5} /> : <Menu size={22} strokeWidth={2} />}
              <span className="hidden md:block text-xs font-bold">Menu</span>
            </span>
          </button>
        </motion.div>
      </div>
    </nav>
  );
}
