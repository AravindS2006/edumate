'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BookOpen, Calendar, ChevronRight, LogOut, Menu, User, FileText, BarChart3, GraduationCap } from 'lucide-react';
import { useRouter } from 'next/navigation';

// --- Types ---
interface DashboardData {
    stats: any;
    academic: any;
    personal: any;
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

export default function Dashboard() {
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [activeReport, setActiveReport] = useState<'attendance' | 'cat' | 'endsem' | null>(null);
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [studtblId, setStudtblId] = useState<string>('');

    // Assets
    const ASSETS = {
        founder: "https://student.sairam.edu.in/assets/sairam-founder-SphLKZaX.png",
        logo1: "https://student.sairam.edu.in/assets/sairam-logo1-BVt3-ItC.png",
        logo2: "https://student.sairam.edu.in/assets/sairam-logo2-BsAIYXw5.png",
        together: "https://student.sairam.edu.in/assets/sairam-together-CqE6rdiK.png"
    };

    useEffect(() => {
        // 1. Auth Check
        const token = localStorage.getItem('token');
        // For now, we'll assume the login mock returns a studtblId or we default to a mock one
        // In a real flow, this comes from the login response
        const storedId = localStorage.getItem('studtblId') || '12345';
        setStudtblId(storedId);

        if (!token) {
            router.push('/');
            return;
        }

        // 2. Fetch Initial Data
        const fetchData = async () => {
            try {
                const [statsRes, academicRes, personalRes] = await Promise.all([
                    fetch(`http://localhost:8000/api/dashboard/stats?studtblId=${storedId}`),
                    fetch(`http://localhost:8000/api/student/academic?studtblId=${storedId}`),
                    fetch(`http://localhost:8000/api/student/personal?studtblId=${storedId}`)
                ]);

                const stats = await statsRes.json();
                const academic = await academicRes.json();
                const personal = await personalRes.json();

                setData({ stats, academic, personal });
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router]);

    const fetchReport = async (type: 'attendance' | 'cat' | 'endsem') => {
        setReportData(null);
        setActiveReport(type);
        try {
            const res = await fetch(`http://localhost:8000/api/reports?type=${type}&studtblId=${studtblId}`);
            const json = await res.json();
            setReportData(json);
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24 relative bg-[#0f172a] text-slate-100">

            {/* --- Header / Branding --- */}
            <div className="absolute top-0 w-full h-64 bg-gradient-to-b from-indigo-900/40 to-transparent pointer-events-none z-0"></div>

            <header className="relative z-50 pt-6 px-6 pb-2 flex justify-between items-start">
                <div className="flex flex-col">
                    <img src={ASSETS.logo1} alt="Sairam Logo" className="h-8 object-contain mb-2 w-auto self-start" />
                    <p className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase">Student Portal</p>
                </div>
                <img src={ASSETS.founder} alt="Founder" className="h-12 w-12 rounded-full border-2 border-white/10 shadow-lg object-cover" />
            </header>

            {/* --- Main Content --- */}
            <motion.main
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="px-6 relative z-10 mt-4 space-y-6"
            >

                {/* Profile Card */}
                <motion.div
                    variants={itemVariants}
                    className="glass-card flex items-center space-x-4"
                >
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-br from-indigo-500 to-cyan-400">
                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-900">
                                {/* Proxy Image */}
                                <img
                                    src={`http://localhost:8000/api/profile/image?studtblId=${studtblId}`}
                                    onError={(e) => { e.currentTarget.src = "https://ui-avatars.com/api/?name=S+S&background=random"; }}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">{data?.personal?.name || "Student"}</h2>
                        <p className="text-xs text-slate-400">{data?.academic?.dept}</p>
                        <div className="flex items-center space-x-2 mt-1">
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                Sem {data?.academic?.semester}
                            </span>
                            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/20">
                                {data?.personal?.reg_no}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Attendance */}
                    <motion.div variants={itemVariants} className="glass-card p-4 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-5"><Calendar size={80} /></div>
                        <div className="relative w-24 h-24">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="48" cy="48" r="40" stroke="#1e293b" strokeWidth="6" fill="transparent" />
                                <circle cx="48" cy="48" r="40" stroke="#06b6d4" strokeWidth="6" fill="transparent"
                                    strokeDasharray={251}
                                    strokeDashoffset={251 - (251 * (data?.stats?.attendance_percentage || 0)) / 100}
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-bold">{data?.stats?.attendance_percentage}%</span>
                                <span className="text-[8px] uppercase tracking-wider text-slate-400">Attendance</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* CGPA */}
                    <div className="space-y-4">
                        <motion.div variants={itemVariants} className="glass-card p-4 flex flex-col justify-center h-24 bg-gradient-to-br from-indigo-900/50 to-slate-900/50">
                            <p className="text-slate-400 text-xs mb-1">CGPA</p>
                            <div className="flex items-end space-x-2">
                                <span className="text-3xl font-bold text-indigo-400">{data?.stats?.cgpa}</span>
                                <span className="text-xs text-indigo-300/50 mb-1">/ 10</span>
                            </div>
                        </motion.div>
                        <motion.div variants={itemVariants} className="glass-card p-4 flex flex-col justify-center h-24">
                            <p className="text-slate-400 text-xs mb-1">Arrears</p>
                            <span className={`text-2xl font-bold ${data?.stats?.arrears > 0 ? "text-red-400" : "text-emerald-400"}`}>
                                {data?.stats?.arrears || 0}
                            </span>
                        </motion.div>
                    </div>
                </div>

                {/* Reports Hub */}
                <motion.div variants={itemVariants} className="glass-card">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center">
                        <FileText size={16} className="mr-2 text-indigo-400" />
                        Academic Reports
                    </h3>

                    <div className="flex space-x-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
                        {[
                            { id: 'attendance', label: 'Attendance', icon: Calendar },
                            { id: 'cat', label: 'CAT Marks', icon: BarChart3 },
                            { id: 'endsem', label: 'End Semester', icon: GraduationCap }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => fetchReport(item.id as any)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap border ${activeReport === item.id
                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                                    : 'bg-slate-800/50 border-white/5 text-slate-400 hover:bg-slate-800'
                                    }`}
                            >
                                <item.icon size={14} />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Dynamic Report Content */}
                    <div className="min-h-[100px]">
                        {activeReport && !reportData && (
                            <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500"></div></div>
                        )}

                        {activeReport && reportData && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-cyan-400 uppercase">{reportData.title || "Report Details"}</span>
                                </div>
                                {/* Render report items mock */}
                                {reportData.data?.map((subject: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center p-2 rounded bg-white/5 border border-white/5">
                                        <span className="text-xs text-slate-300">{subject.subject || "Subject " + (idx + 1)}</span>
                                        <span className="text-xs font-mono font-bold text-white">{subject.marks}/{subject.max}</span>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {!activeReport && (
                            <div className="text-center py-6 text-slate-500 text-xs">
                                Select a report type to view details
                            </div>
                        )}
                    </div>
                </motion.div>

            </motion.main>

            {/* Bottom Nav */}
            < div className="fixed bottom-6 left-6 right-6 h-16 glass rounded-2xl flex justify-around items-center px-2 z-50 shadow-2xl border border-white/10" >
                <button onClick={() => router.push('/dashboard')} className="p-3 rounded-xl bg-white/10 text-white shadow-lg shadow-indigo-500/20"><div className="bg-indigo-500 w-1.5 h-1.5 rounded-full absolute top-3 right-3"></div><Menu size={24} /></button>
                <button className="p-3 rounded-xl text-slate-400 hover:text-white transition-colors" onClick={() => {
                    localStorage.removeItem('token');
                    router.push('/');
                }}><LogOut size={24} /></button>
            </div >
        </div >
    );
}
