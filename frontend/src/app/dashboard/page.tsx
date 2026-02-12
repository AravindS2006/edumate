'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar, BookOpen, GraduationCap, BarChart3,
    FileText, LogOut, AlertCircle, Loader2,
    User, TrendingUp, Award, Clock
} from 'lucide-react';
import { useRouter } from 'next/navigation';

/* ─────────────────────────────── Types ─────────────────────────────── */

interface StatsData {
    attendance_percentage: number;
    cgpa: number;
    arrears: number;
    od_percentage: number;
}

interface AcademicData {
    dept: string;
    semester: number;
    section: string;
    batch: string;
}

interface PersonalData {
    name: string;
    reg_no: string;
    photo_id: string;
    email: string;
    dept: string;
}

/* ─────────────────────────────── Constants ─────────────────────────── */

const API = 'http://localhost:8000';

const FADE_UP = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    }),
};

/* ─────────────────────────────── Main Page ─────────────────────────── */

export default function Dashboard() {
    const router = useRouter();

    const [stats, setStats] = useState<StatsData | null>(null);
    const [academic, setAcademic] = useState<AcademicData | null>(null);
    const [personal, setPersonal] = useState<PersonalData | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [studtblId, setStudtblId] = useState('');

    // Report state
    const [activeReport, setActiveReport] = useState<string | null>(null);
    const [reportData, setReportData] = useState<any>(null);
    const [reportLoading, setReportLoading] = useState(false);

    /* ── Bootstrap ── */
    useEffect(() => {
        const token = localStorage.getItem('token');
        const id = localStorage.getItem('studtblId') || '';
        setStudtblId(id);

        if (!token) { router.push('/'); return; }

        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
        const eid = encodeURIComponent(id);

        const load = async () => {
            try {
                const [sRes, aRes, pRes] = await Promise.all([
                    fetch(`${API}/api/dashboard/stats?studtblId=${eid}`, { headers }),
                    fetch(`${API}/api/student/academic?studtblId=${eid}`, { headers }),
                    fetch(`${API}/api/student/personal?studtblId=${eid}`, { headers }),
                ]);

                const sJson = sRes.ok ? await sRes.json() : null;
                const aJson = aRes.ok ? await aRes.json() : null;
                const pJson = pRes.ok ? await pRes.json() : null;

                // Only set if no error key
                if (sJson && !sJson.error) setStats(sJson);
                if (aJson && !aJson.error) setAcademic(aJson);
                if (pJson && !pJson.error) setPersonal(pJson);

                if (!sJson && !aJson && !pJson) {
                    setError('All API endpoints failed. Is the backend running?');
                }
            } catch (err) {
                console.error(err);
                setError('Network error — check that the backend is running on port 8000.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [router]);

    /* ── Reports ── */
    const loadReport = useCallback(async (type: string) => {
        if (activeReport === type) { setActiveReport(null); return; }
        setActiveReport(type);
        setReportLoading(true);
        setReportData(null);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(
                `${API}/api/reports?type=${type}&studtblId=${encodeURIComponent(studtblId)}`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            const json = res.ok ? await res.json() : { error: `Report failed (${res.status})` };
            setReportData(json);
        } catch {
            setReportData({ error: 'Network error' });
        } finally {
            setReportLoading(false);
        }
    }, [activeReport, studtblId]);

    /* ── Loading / Error screens ── */
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] gap-4">
                <Loader2 className="animate-spin text-indigo-500" size={40} />
                <p className="text-slate-400 text-sm animate-pulse">Loading your dashboard…</p>
            </div>
        );
    }

    if (error && !stats && !personal) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] gap-5 px-6 text-center">
                <div className="p-5 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
                    <AlertCircle size={44} />
                </div>
                <h2 className="text-xl font-bold text-white">Connection Error</h2>
                <p className="text-slate-400 text-sm max-w-md">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    const displayName = personal?.name || 'Student';
    const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2);
    const attendPct = stats?.attendance_percentage ?? 0;
    const cgpa = stats?.cgpa ?? 0;
    const arrears = stats?.arrears ?? 0;
    const odPct = stats?.od_percentage ?? 0;

    /* ─────────────────────────────── Render ─────────────────────────────── */
    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-100">

            {/* ── Ambient glow ── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute -top-[30%] -left-[15%] w-[60%] h-[60%] bg-indigo-900/15 blur-[140px] rounded-full" />
                <div className="absolute top-[30%] -right-[10%] w-[45%] h-[45%] bg-cyan-900/15 blur-[120px] rounded-full" />
            </div>

            {/* ═══════════════════════ HEADER ═══════════════════════ */}
            <header className="sticky top-0 z-50 px-4 sm:px-8 py-4 flex items-center justify-between border-b border-white/5 backdrop-blur-xl bg-[#0f172a]/70">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <GraduationCap size={22} className="text-white" />
                    </div>
                    <div className="leading-tight">
                        <p className="text-sm font-bold tracking-wide text-white">EduMate</p>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Student Portal</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="hidden sm:block text-xs text-slate-400">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <button
                        onClick={() => { localStorage.clear(); router.push('/'); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition"
                    >
                        <LogOut size={14} /> Sign Out
                    </button>
                </div>
            </header>

            {/* ═══════════════════════ BODY ═══════════════════════ */}
            <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* ━━━━━━━━━━ LEFT COL – Profile (lg:4) ━━━━━━━━━━ */}
                <section className="lg:col-span-4 space-y-6">

                    {/* Profile Card */}
                    <motion.div custom={0} variants={FADE_UP} initial="hidden" animate="visible"
                        className="rounded-2xl overflow-hidden border border-white/10 bg-[#0f172a]/60 backdrop-blur-xl shadow-xl"
                    >
                        {/* Banner */}
                        <div className="h-28 bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 relative">
                            <div className="absolute inset-0 bg-black/10" />
                        </div>

                        {/* Avatar + Info */}
                        <div className="px-6 pb-6 -mt-14 relative flex flex-col items-center">
                            <div className="w-[88px] h-[88px] rounded-2xl ring-4 ring-[#0f172a] overflow-hidden bg-slate-800 shadow-2xl">
                                <ProfileImage studtblId={studtblId} documentId={personal?.photo_id} fallback={initials} />
                            </div>

                            <h2 className="mt-4 text-lg font-bold text-white text-center leading-tight">{displayName}</h2>
                            <p className="text-xs text-indigo-400 font-mono mt-0.5">{personal?.reg_no || '—'}</p>
                            {personal?.email && (
                                <p className="text-[11px] text-slate-500 mt-1 truncate max-w-[220px]">{personal.email}</p>
                            )}

                            {/* Academic pills */}
                            <div className="mt-5 w-full space-y-2.5">
                                <InfoRow icon={BookOpen} label="Department" value={academic?.dept || personal?.dept || '—'} color="text-indigo-400" />
                                <div className="grid grid-cols-2 gap-2.5">
                                    <InfoRow icon={GraduationCap} label="Semester" value={academic?.semester ? `Sem ${academic.semester}` : '—'} color="text-cyan-400" />
                                    <InfoRow icon={Award} label="Section" value={academic?.section || '—'} color="text-pink-400" />
                                </div>
                                {academic?.batch && (
                                    <InfoRow icon={Clock} label="Program" value={academic.batch} color="text-amber-400" />
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Mentor / Motto Card */}
                    <motion.div custom={1} variants={FADE_UP} initial="hidden" animate="visible"
                        className="rounded-2xl p-4 border border-white/10 bg-[#0f172a]/60 backdrop-blur-xl flex items-center gap-4 border-l-4 border-l-indigo-500"
                    >
                        <img
                            src="https://student.sairam.edu.in/assets/sairam-founder-SphLKZaX.png"
                            alt="Founder"
                            className="h-12 w-12 rounded-full object-cover border border-white/10 flex-shrink-0"
                        />
                        <div>
                            <p className="text-xs font-bold text-white italic">&quot;Success is a journey, not a destination.&quot;</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">— MJF. Ln. Leo Muthu, Founder Chairman</p>
                        </div>
                    </motion.div>
                </section>

                {/* ━━━━━━━━━━ RIGHT COL – Stats + Reports (lg:8) ━━━━━━━━━━ */}
                <section className="lg:col-span-8 space-y-6">

                    {/* ── Stats Row ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StatTile custom={2} label="Attendance" value={`${attendPct}%`} icon={Calendar} accent="cyan"
                            sub={attendPct >= 75 ? '✓ Good Standing' : '⚠ Below 75%'}
                            subColor={attendPct >= 75 ? 'text-emerald-400' : 'text-amber-400'}
                        />
                        <StatTile custom={3} label="CGPA" value={cgpa.toFixed(2)} icon={TrendingUp} accent="indigo" sub="/ 10.00" />
                        <StatTile custom={4} label="Arrears" value={String(arrears)} icon={AlertCircle}
                            accent={arrears > 0 ? 'rose' : 'emerald'}
                            sub={arrears === 0 ? 'All Clear' : 'Pending'}
                            subColor={arrears === 0 ? 'text-emerald-400' : 'text-rose-400'}
                        />
                        <StatTile custom={5} label="OD Taken" value={`${odPct}%`} icon={FileText} accent="violet" />
                    </div>

                    {/* ── Attendance Ring (visual) ── */}
                    <motion.div custom={6} variants={FADE_UP} initial="hidden" animate="visible"
                        className="rounded-2xl p-6 border border-white/10 bg-[#0f172a]/60 backdrop-blur-xl flex items-center gap-6"
                    >
                        <div className="relative w-28 h-28 flex-shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                                <circle cx="60" cy="60" r="50" fill="none" stroke="url(#grad)" strokeWidth="10" strokeLinecap="round"
                                    strokeDasharray={314}
                                    strokeDashoffset={314 - (314 * attendPct) / 100}
                                    style={{ transition: 'stroke-dashoffset 1.2s ease' }}
                                />
                                <defs>
                                    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="#06b6d4" />
                                        <stop offset="100%" stopColor="#6366f1" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-white">{attendPct}%</span>
                                <span className="text-[9px] uppercase tracking-widest text-slate-500">Present</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-white">Attendance Overview</h4>
                            <p className="text-xs text-slate-400">Your overall attendance across all subjects this semester.</p>
                            <div className="flex gap-4 mt-2">
                                <MiniStat label="Absent" value={`${(100 - attendPct).toFixed(1)}%`} dot="bg-rose-500" />
                                <MiniStat label="OD" value={`${odPct}%`} dot="bg-violet-500" />
                                <MiniStat label="CGPA" value={cgpa.toFixed(2)} dot="bg-indigo-500" />
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Reports ── */}
                    <motion.div custom={7} variants={FADE_UP} initial="hidden" animate="visible"
                        className="rounded-2xl border border-white/10 bg-[#0f172a]/60 backdrop-blur-xl overflow-hidden"
                    >
                        {/* Header + Tabs */}
                        <div className="px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <BarChart3 size={18} className="text-indigo-400" />
                                Academic Reports
                            </h3>
                            <div className="flex bg-slate-900/60 rounded-lg p-0.5 border border-white/5">
                                {(['attendance', 'cat', 'endsem'] as const).map(t => (
                                    <button key={t} onClick={() => loadReport(t)}
                                        className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeReport === t
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        {t === 'attendance' ? 'Attendance' : t === 'cat' ? 'CAT Marks' : 'End Sem'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Report Body */}
                        <div className="p-6 min-h-[260px] relative">
                            {reportLoading && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0f172a]/60 backdrop-blur-sm rounded-b-2xl">
                                    <Loader2 className="animate-spin text-indigo-500" size={28} />
                                </div>
                            )}

                            {!activeReport && !reportLoading && (
                                <div className="flex flex-col items-center justify-center h-[220px] text-slate-500 gap-3">
                                    <div className="p-4 rounded-2xl bg-white/5"><BarChart3 size={32} /></div>
                                    <p className="text-sm text-center">Select a report tab above to view details</p>
                                </div>
                            )}

                            {activeReport && reportData && (
                                <div className="space-y-2">
                                    {reportData.error && (
                                        <p className="text-center text-red-400 py-8 text-sm">{reportData.error}</p>
                                    )}
                                    {Array.isArray(reportData.data) && reportData.data.length > 0 ? (
                                        reportData.data.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] transition border border-white/5 group">
                                                <div className="flex items-center gap-3">
                                                    <span className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-400 text-xs font-bold flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition">{idx + 1}</span>
                                                    <span className="text-sm text-slate-200 font-medium">{item.subject || item.subjectName || `Subject ${idx + 1}`}</span>
                                                </div>
                                                <span className="text-sm font-mono font-bold text-white">
                                                    {item.marks ?? item.totalPresent ?? '—'}
                                                    <span className="text-slate-500 text-xs font-normal"> / {item.max ?? item.totalClasses ?? '—'}</span>
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        !reportData.error && activeReport && !reportLoading && (
                                            <p className="text-center text-slate-500 py-8 text-sm">No records available for this category.</p>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </section>
            </main>
        </div>
    );
}

/* ═══════════════════════ Sub-Components ═══════════════════════ */

function InfoRow({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
    return (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/5">
            <Icon size={15} className={color} />
            <div className="min-w-0">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
                <p className="text-xs font-medium text-slate-200 truncate">{value}</p>
            </div>
        </div>
    );
}

function StatTile({ label, value, icon: Icon, accent, sub, subColor, custom }: any) {
    const accentMap: Record<string, string> = {
        cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20',
        indigo: 'from-indigo-500/20 to-indigo-500/5 text-indigo-400 border-indigo-500/20',
        rose: 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20',
        emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
        violet: 'from-violet-500/20 to-violet-500/5 text-violet-400 border-violet-500/20',
    };
    const cls = accentMap[accent] || accentMap.indigo;

    return (
        <motion.div custom={custom} variants={FADE_UP} initial="hidden" animate="visible"
            className="rounded-2xl p-4 border border-white/10 bg-[#0f172a]/60 backdrop-blur-xl flex flex-col justify-between h-[140px] hover:-translate-y-0.5 transition-transform duration-300"
        >
            <div className={`p-2 w-fit rounded-lg bg-gradient-to-br ${cls}`}>
                <Icon size={18} />
            </div>
            <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">{label}</p>
                <p className="text-2xl font-bold text-white leading-none">{value}</p>
                {sub && <p className={`text-[10px] mt-1 ${subColor || 'text-slate-500'}`}>{sub}</p>}
            </div>
        </motion.div>
    );
}

function MiniStat({ label, value, dot }: { label: string; value: string; dot: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            <div>
                <p className="text-[10px] text-slate-500">{label}</p>
                <p className="text-xs font-bold text-slate-200">{value}</p>
            </div>
        </div>
    );
}

function ProfileImage({ studtblId, documentId, fallback }: { studtblId: string; documentId?: string; fallback: string }) {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        if (!studtblId || !documentId) return;
        let revoked = false;

        (async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(
                    `${API}/api/profile/image?studtblId=${encodeURIComponent(studtblId)}&documentId=${encodeURIComponent(documentId)}`,
                    { headers: { Authorization: `Bearer ${token}` } },
                );
                if (res.ok && !revoked) {
                    const blob = await res.blob();
                    setSrc(URL.createObjectURL(blob));
                }
            } catch { /* fallback to initials */ }
        })();

        return () => { revoked = true; };
    }, [studtblId, documentId]);

    if (src) return <img src={src} alt="Profile" className="w-full h-full object-cover" />;

    // Fallback: initials avatar
    return (
        <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{fallback}</span>
        </div>
    );
}
