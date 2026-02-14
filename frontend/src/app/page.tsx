'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, Loader2, Mail } from 'lucide-react';
import Image from 'next/image';

export default function Home() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [institution, setInstitution] = useState('SEC');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use relative URL so Next.js rewrites proxy to backend (avoids CORS, works with proxy)
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Institution-Id': institution
        },
        body: JSON.stringify({ username, password }),
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        const text = await res.text().catch(() => "No body");
        console.error("Failed to parse JSON:", text);
        throw new Error(`Server returned ${res.status}: ${text.slice(0, 100)}...`);
      }

      if (res.ok) {
        if (data.token) localStorage.setItem('token', data.token);
        if (data.studtblId) localStorage.setItem('studtblId', data.studtblId);
        if (data.access_token) localStorage.setItem('token', data.access_token);
        localStorage.setItem('institutionId', institution); // Store selected institution

        if (!data.studtblId && !data.token && !data.access_token) {
          console.warn("No token/id found in response");
        }

        router.push('/dashboard');
      } else {
        alert('Login failed: ' + (data.detail || data.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      alert('Connection failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Subtle background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-15%] w-[50%] h-[50%] bg-indigo-100/60 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-15%] w-[50%] h-[50%] bg-cyan-100/50 rounded-full blur-[120px]"></div>
        <div className="absolute top-[40%] left-[40%] w-[25%] h-[25%] bg-violet-100/30 rounded-full blur-[100px]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 w-full max-w-md"
      >
        <div className="glass-card flex flex-col items-center">



          {/* ── College Logo ── */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-6"
          >
            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-lg shadow-indigo-100 ring-4 ring-indigo-50 overflow-hidden">
              <Image
                src="/assets/SAIRAM-ROUND-LOGO.png"
                alt="Sri Sairam Institutions"
                width={80}
                height={80}
                className="object-contain"
                priority
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-center mb-6"
          >
            <h1 className="text-3xl font-extrabold mb-1 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-600">
              EduMate
            </h1>

            <p className="text-slate-500 mt-3 text-sm">Sign in to your student portal</p>
          </motion.div>

          <form onSubmit={handleLogin} className="w-full space-y-4">

            {/* Institution Selector */}
            <div className="relative group">
              <div className="flex gap-2 p-1 bg-slate-100/50 rounded-lg border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setInstitution('SEC')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${institution === 'SEC'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-100'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  SEC
                </button>
                <button
                  type="button"
                  onClick={() => setInstitution('SIT')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${institution === 'SIT'
                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-100'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  SIT
                </button>
              </div>
            </div>

            <div className="relative group">
              <Mail className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
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
              <Lock className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
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

          {/* ── Sairam Footer Branding ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-8 w-full space-y-3"
          >


            <div className="text-center space-y-1 pt-1">
              <p className="text-xs text-slate-400 font-semibold">Protected by AES-256 Encryption</p>
              <p className="text-[10px] text-slate-400">© {new Date().getFullYear()} EduMate</p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </main>
  );
}
