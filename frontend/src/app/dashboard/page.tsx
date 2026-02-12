'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BookOpen, Calendar, ChevronRight, LogOut, Menu, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Mock Data Types
interface StudentData {
    name: string;
    reg_no: string;
    dept: string;
    avatar?: string;
}

interface DashboardStats {
    attendance: number;
    cgpa: number;
    assignments_pending: number;
}

export default function Dashboard() {
    const router = useRouter();
    const [student, setStudent] = useState<StudentData | null>(null);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check auth
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }

        // Fetch Dashboard Data (Mock)
        const fetchData = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/dashboard');
                const data = await res.json();
                setStats(data);

                // Mock Student Profile
                setStudent({
                    name: "Sairam Student",
                    reg_no: "412345678",
                    dept: "Computer Science",
                    // Use a placeholder if no image
                });
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    return (
        <div className="min-h-screen pb-24 relative">
            {/* Header */}
            <header className="glass sticky top-0 z-50 px-6 py-4 flex justify-between items-center rounded-b-3xl mb-6">
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-500 p-[2px]">
                            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                                {student?.avatar ? (
                                    <img src={student.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={20} className="text-white" />
                                )}
                            </div>
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></div>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white leading-tight">{student?.name}</h2>
                        <p className="text-[10px] text-slate-400 font-medium tracking-wide">{student?.dept} • {student?.reg_no}</p>
                    </div>
                </div>
                <button className="p-2 rounded-full hover:bg-white/5 transition-colors relative">
                    <Bell size={20} className="text-slate-300" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                </button>
            </header>

            <main className="px-6 space-y-6">
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="space-y-6"
                >
                    {/* Main Stats Card (Circular Progress) */}
                    <motion.div variants={itemVariants} className="glass-card flex flex-col items-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <BookOpen size={100} />
                        </div>
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Overall Attendance</h3>
                        <div className="relative w-40 h-40 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-800" />
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    stroke="currentColor"
                                    strokeWidth="10"
                                    fill="transparent"
                                    strokeDasharray={440}
                                    strokeDashoffset={440 - (440 * (stats?.attendance || 0)) / 100}
                                    className="text-cyan-500 transition-all duration-1000 ease-out"
                                    style={{ strokeLinecap: 'round' }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-bold text-white text-glow">{stats?.attendance}%</span>
                                <span className="text-xs text-slate-400">Present</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <motion.div variants={itemVariants} className="glass-card p-4 flex flex-col justify-between h-32 relative overflow-hidden">
                            <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-indigo-500/20 rounded-full blur-xl"></div>
                            <BookOpen className="text-indigo-400 mb-2" size={24} />
                            <div>
                                <p className="text-xs text-slate-400">Current CGPA</p>
                                <p className="text-2xl font-bold text-white">{stats?.cgpa}</p>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="glass-card p-4 flex flex-col justify-between h-32 relative overflow-hidden">
                            <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-pink-500/20 rounded-full blur-xl"></div>
                            <Calendar className="text-pink-400 mb-2" size={24} />
                            <div>
                                <p className="text-xs text-slate-400">Assignments</p>
                                <p className="text-2xl font-bold text-white">{stats?.assignments_pending} <span className="text-xs font-normal opacity-50">Pending</span></p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Report Hub / Actions */}
                    <motion.div variants={itemVariants}>
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3 px-1">Report Hub</h3>
                        <div className="space-y-3">
                            {['Attendance Report', 'Internal Marks', 'Semester Results'].map((item, i) => (
                                <div key={i} className="glass p-4 rounded-xl flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? 'bg-indigo-500/20 text-indigo-400' : i === 1 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                            <BookOpen size={16} />
                                        </div>
                                        <span className="text-sm font-medium text-slate-200">{item}</span>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
                                </div>
                            ))}
                        </div>
                    </motion.div>

                </motion.div>
            </main>

            {/* Floating Bottom Nav */}
            <div className="fixed bottom-6 left-6 right-6 h-16 glass rounded-2xl flex justify-around items-center px-2 z-50 shadow-2xl border border-white/10">
                <button className="p-3 rounded-xl bg-white/10 text-white shadow-lg shadow-indigo-500/20"><div className="bg-indigo-500 w-1.5 h-1.5 rounded-full absolute top-3 right-3"></div><Menu size={24} /></button>
                <button className="p-3 rounded-xl text-slate-400 hover:text-white transition-colors" onClick={() => {
                    localStorage.removeItem('token');
                    router.push('/');
                }}><LogOut size={24} /></button>
            </div>
        </div>
    );
}
