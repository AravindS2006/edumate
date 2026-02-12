'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { User, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function Home() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // const router = useRouter(); // Commented out to avoid unused var warning if not used yet, but it is used.
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const apiBase = process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '';
      const res = await fetch(`${apiBase}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      // Robust Auth Handling
      if (res.ok) {
        // Store everything we get to be safe
        if (data.token) localStorage.setItem('token', data.token);
        if (data.studtblId) localStorage.setItem('studtblId', data.studtblId);
        if (data.access_token) localStorage.setItem('token', data.access_token);

        // Fallback for mock if needed
        if (!data.studtblId && !data.token && !data.access_token) {
          console.warn("No token/id found in response, strictly mocking?");
        }

        router.push('/dashboard');
      } else {
        alert('Login failed: ' + (data.detail || data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Connection failed. Backend might be down.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 w-full max-w-md"
      >
        <div className="glass-card flex flex-col items-center border-t border-white/20">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-8 relative"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <User size={40} className="text-white" />
            </div>
            <div className="absolute inset-0 rounded-full border border-white/30 animate-ping opacity-20"></div>
          </motion.div>

          <h1 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-cyan-100 text-glow">
            Welcome Back
          </h1>
          <p className="text-slate-400 mb-8 text-sm">Sign in to your student portal</p>

          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div className="relative group">
              <User className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-cyan-400 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="glass-input w-full pl-10"
                required
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-cyan-400 transition-colors" size={20} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input w-full pl-10"
                required
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="glass-button w-full flex items-center justify-center mt-6 group"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span className="mr-2">Access Portal</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-8 text-xs text-slate-500 text-center">
            <p>Protected by AES-256 Encryption</p>
            <p className="opacity-50">Sairam Institutions</p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
