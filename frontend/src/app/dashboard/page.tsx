'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar, BookOpen, GraduationCap, BarChart3,
    FileText, LogOut, AlertCircle, Loader2,
    User, TrendingUp, Award, Clock, Users,
    CheckCircle2, XCircle, MapPin, Mail, Phone, Bus
} from 'lucide-react';
import { useRouter } from 'next/navigation';

/* ─────────────────────────────── Types ─────────────────────────────── */

interface StatsData {
    attendance_percentage: number;
    cgpa: number;
    arrears: number;
    od_percentage: number;
    od_count: number;
    absent_percentage: number;
    program: string;
    branch_code: string;
    mentor_name: string;
    total_semesters: number;
    total_years: number;
}

interface AcademicData {
    dept: string;
    semester: number;
    semester_name: string;
    semester_type: string;
    section: string;
    batch: string;
    admission_mode: string;
    university_reg_no: string;
    mentor_name: string;
    hostel: boolean;
    bus_code: string;
    current_academic_year: string;
    branch_id: number;
    year_of_study_id: number;
    section_id: number;
    academic_year_id: number;
}

interface PersonalData {
    name: string;
    reg_no: string;
    photo_id: string;
    email: string;
    date_of_birth: string;
    gender: string;
    community: string;
    religion: string;
    bus_route: string;
    languages: string;
    age: string;
}

interface ExamStatus {
    attendance_eligible: boolean;
    fees_eligible: boolean;
    current_status: string;
    total_fees: number;
    paid_online: number;
    previous_due: number;
    attendance_pct: number;
    od_pct: number;
}

interface AcademicPercentage {
    records: { exam: string; year: string; percentage: string }[];
}

interface ParentData {
    father_name: string;
    father_occupation: string;
    father_mobile: string;
    mother_name: string;
    mother_occupation: string;
    mother_mobile: string;
    guardian_name: string;
    guardian_occupation: string;
    guardian_mobile: string;
}

/* ─────────────────────────────── Constants ─────────────────────────── */

const API = process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '';

const FADE_UP = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.07, duration: 0.5, ease: "easeOut" as const },
    }),
};

/* ─────────────────────────────── Main Page ─────────────────────────── */

export default function Dashboard() {
    const router = useRouter();

    const [stats, setStats] = useState<StatsData | null>(null);
    const [academic, setAcademic] = useState<AcademicData | null>(null);
    const [personal, setPersonal] = useState<PersonalData | null>(null);
    const [examStatus, setExamStatus] = useState<ExamStatus | null>(null);
    const [acadPct, setAcadPct] = useState<AcademicPercentage | null>(null);
    const [parentData, setParentData] = useState<ParentData | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [studtblId, setStudtblId] = useState('');

    // Report state
    const [activeReport, setActiveReport] = useState<string | null>(null);
    const [reportSemesters, setReportSemesters] = useState<any[]>([]);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [selectedSemester, setSelectedSemester] = useState<number | null>(null);

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
                const [sRes, aRes, pRes, eRes, apRes, prRes] = await Promise.all([
                    fetch(`${API}/api/dashboard/stats?studtblId=${eid}`, { headers }),
                    fetch(`${API}/api/student/academic?studtblId=${eid}`, { headers }),
                    fetch(`${API}/api/student/personal?studtblId=${eid}`, { headers }),
                    fetch(`${API}/api/student/exam-status?studtblId=${eid}`, { headers }),
                    fetch(`${API}/api/student/academic-percentage?studtblId=${eid}`, { headers }),
                    fetch(`${API}/api/student/parent?studtblId=${eid}`, { headers }),
                ]);

                const safe = async (r: globalThis.Response) => r.ok ? r.json() : null;
                const [sj, aj, pj, ej, apj, prj] = await Promise.all([safe(sRes), safe(aRes), safe(pRes), safe(eRes), safe(apRes), safe(prRes)]);

                if (sj && !sj.error) setStats(sj);
                if (aj && !aj.error) setAcademic(aj);
                if (pj && !pj.error) setPersonal(pj);
                if (ej && !ej.error) setExamStatus(ej);
                if (apj && !apj.error) setAcadPct(apj);
                if (prj && !prj.error) setParentData(prj);

                if (!sj && !pj) setError('API endpoints unreachable. Is the backend running?');
            } catch (err) {
                console.error(err);
                setError('Network error — backend may not be on port 8000.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [router]);

    /* ── Report Tab Click ── */
    const loadReport = useCallback(async (type: string) => {
        if (activeReport === type) { setActiveReport(null); setReportSemesters([]); setPdfUrl(null); return; }
        setActiveReport(type);
        setReportLoading(true);
        setReportSemesters([]);
        setPdfUrl(null);
        setSelectedSemester(null);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(
                `${API}/api/reports?type=${type}&studtblId=${encodeURIComponent(studtblId)}`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            const json = res.ok ? await res.json() : null;
            if (json && json.semesters) setReportSemesters(json.semesters);
        } catch { /* handled */ }
        finally { setReportLoading(false); }
    }, [activeReport, studtblId]);

    /* ── Download Report PDF ── */
    const downloadReport = useCallback(async (semesterId: number) => {
        setSelectedSemester(semesterId);
        setReportLoading(true);
        setPdfUrl(null);
        const token = localStorage.getItem('token');
        const reportNameMap: Record<string, string> = { attendance: 'Attendance', cat: 'CAT', endsem: 'End Sem' };
        const reportName = reportNameMap[activeReport || 'attendance'] || 'Attendance';
        try {
            const res = await fetch(`${API}/api/reports/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ reportName, semesterId, studtblId }),
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
            }
        } catch { /* handled */ }
        finally { setReportLoading(false); }
    }, [activeReport, studtblId]);

    /* ── Loading / Error screens ── */
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] gap-4">
                <Loader2 className="animate-spin text-indigo-500" size={40} />
                <p className="text-slate-400 text-sm animate-pulse">Loading Student Portal…</p>
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
                <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors">Retry</button>
            </div>
        );
    }

    const displayName = personal?.name || 'Student';
    const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2);
    const attendPct = stats?.attendance_percentage ?? 0;
    const cgpa = stats?.cgpa ?? 0;
    const odPct = stats?.od_percentage ?? 0;

    /* ─────────────────────────────── Render ─────────────────────────────── */
    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-100">

            {/* Ambient glow */}
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
                    <span className="hidden sm:block text-xs text-slate-400">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <button onClick={() => { localStorage.clear(); router.push('/'); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition">
                        <LogOut size={14} /> Sign Out
                    </button>
                </div>
            </header>

            {/* ═══════════════════════ BODY ═══════════════════════ */}
            <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">

                {/* ━━━━━━━━━━ ROW 1: Profile + Stats ━━━━━━━━━━ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Profile */}
                    <motion.div custom={0} variants={FADE_UP} initial="hidden" animate="visible"
                        className="lg:col-span-4 rounded-2xl overflow-hidden border border-white/10 bg-[#0f172a]/60 backdrop-blur-xl shadow-xl"
                    >
                        <div className="h-24 bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 relative">
                            <div className="absolute inset-0 bg-black/10" />
                        </div>
                        <div className="px-6 pb-5 -mt-12 relative flex flex-col items-center">
                            <div className="w-20 h-20 rounded-2xl ring-4 ring-[#0f172a] overflow-hidden bg-slate-800 shadow-2xl">
                                <ProfileImage studtblId={studtblId} documentId={personal?.photo_id} fallback={initials} />
                            </div>
                            <h2 className="mt-3 text-lg font-bold text-white text-center leading-tight">{displayName}</h2>
                            <p className="text-xs text-indigo-400 font-mono mt-0.5">{personal?.reg_no || '—'}</p>
                            {personal?.email && <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1"><Mail size={10} />{personal.email}</p>}
                            {personal?.date_of_birth && <p className="text-[10px] text-slate-500 mt-0.5">DOB: {personal.date_of_birth} • Age: {personal.age}</p>}
                            <div className="mt-4 w-full space-y-2">
                                <InfoRow icon={BookOpen} label="Department" value={academic?.dept || '—'} color="text-indigo-400" />
                                <div className="grid grid-cols-2 gap-2">
                                    <InfoRow icon={GraduationCap} label="Semester" value={academic?.semester_name || `Sem ${academic?.semester || '—'}`} color="text-cyan-400" />
                                    <InfoRow icon={Award} label="Batch" value={academic?.batch || '—'} color="text-pink-400" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <InfoRow icon={User} label="Admission" value={academic?.admission_mode || '—'} color="text-amber-400" />
                                    <InfoRow icon={FileText} label="Univ Reg" value={academic?.university_reg_no || '—'} color="text-emerald-400" />
                                </div>
                                {academic?.mentor_name && <InfoRow icon={Users} label="Mentor" value={academic.mentor_name} color="text-violet-400" />}
                                {personal?.bus_route && <InfoRow icon={Bus} label="Transport" value={personal.bus_route} color="text-orange-400" />}
                            </div>
                        </div>
                    </motion.div>

                    {/* Stats + Ring Column */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Stats Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <StatTile custom={1} label="Attendance" value={`${attendPct}%`} icon={Calendar} accent="cyan"
                                sub={attendPct >= 75 ? '✓ Good Standing' : '⚠ Below 75%'}
                                subColor={attendPct >= 75 ? 'text-emerald-400' : 'text-amber-400'} />
                            <StatTile custom={2} label="CGPA" value={cgpa.toFixed(2)} icon={TrendingUp} accent="indigo" sub={`/ ${(stats?.total_semesters || 8) > 0 ? '10.00' : '—'}`} />
                            <StatTile custom={3} label="OD Count" value={String(stats?.od_count ?? 0)} icon={FileText} accent="violet" sub={`${odPct}% of classes`} />
                            <StatTile custom={4} label="Absent" value={`${stats?.absent_percentage?.toFixed(1) ?? 0}%`} icon={XCircle} accent="rose" sub={`${(100 - attendPct - odPct).toFixed(1)}% net`} />
                        </div>

                        {/* Attendance Ring + Exam Status */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <motion.div custom={5} variants={FADE_UP} initial="hidden" animate="visible"
                                className="rounded-2xl p-5 border border-white/10 bg-[#0f172a]/60 backdrop-blur-xl flex items-center gap-5"
                            >
                                <div className="relative w-24 h-24 flex-shrink-0">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                                        <circle cx="60" cy="60" r="50" fill="none" stroke="url(#grad)" strokeWidth="10" strokeLinecap="round"
                                            strokeDasharray={314} strokeDashoffset={314 - (314 * attendPct) / 100}
                                            style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
                                        <defs>
                                            <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor="#06b6d4" />
                                                <stop offset="100%" stopColor="#6366f1" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-xl font-bold text-white">{attendPct}%</span>
                                        <span className="text-[8px] uppercase tracking-widest text-slate-500">Present</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <h4 className="text-sm font-bold text-white">Attendance</h4>
                                    <MiniStat label="Absent" value={`${stats?.absent_percentage?.toFixed(1) ?? 0}%`} dot="bg-rose-500" />
                                    <MiniStat label="OD" value={`${odPct}% (${stats?.od_count ?? 0})`} dot="bg-violet-500" />
                                    <MiniStat label="CGPA" value={cgpa.toFixed(2)} dot="bg-indigo-500" />
                                </div>
                            </motion.div>

                            {/* Exam Status */}
                            {examStatus && (
                                <motion.div custom={6} variants={FADE_UP} initial="hidden" animate="visible"
                                    className="rounded-2xl p-5 border border-white/10 bg-[#0f172a]/60 backdrop-blur-xl"
                                >
                                    <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                                        <Award size={16} className="text-amber-400" /> Exam Status
                                    </h4>
                                    <div className="space-y-2.5">
                                        <StatusRow label="Attendance Eligible" ok={examStatus.attendance_eligible} />
                                        <StatusRow label="Fees Eligible" ok={examStatus.fees_eligible} />
                                        <div className="mt-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Current Status</p>
                                            <p className="text-xs font-medium text-slate-200">{examStatus.current_status || '—'}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-center">
                                            <div className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                                                <p className="text-[9px] text-slate-500">Total Fees</p>
                                                <p className="text-xs font-bold text-slate-200">₹{examStatus.total_fees?.toLocaleString('en-IN')}</p>
                                            </div>
                                            <div className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                                                <p className="text-[9px] text-slate-500">Paid Online</p>
                                                <p className="text-xs font-bold text-emerald-400">₹{examStatus.paid_online?.toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ━━━━━━━━━━ ROW 2: Academic History + Parent + Motto ━━━━━━━━━━ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* Academic History (HSC / SSLC) */}
                    {acadPct && acadPct.records && acadPct.records.length > 0 && (
                        <motion.div custom={7} variants={FADE_UP} initial="hidden" animate="visible"
                            className="rounded-2xl p-5 border border-white/10 bg-[#0f172a]/60 backdrop-blur-xl"
                        >
                            <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                                <BarChart3 size={16} className="text-cyan-400" /> Academic History
                            </h4>
                            <div className="space-y-3">
                                {acadPct.records.map((r, i) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                                        <div>
                                            <p className="text-xs font-bold text-slate-200">{r.exam}</p>
                                            <p className="text-[10px] text-slate-500">Year: {r.year}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-white">{parseFloat(r.percentage).toFixed(1)}%</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Parent Details */}
                    {parentData && (parentData.father_name || parentData.mother_name) && (
                        <motion.div custom={8} variants={FADE_UP} initial="hidden" animate="visible"
                            className="rounded-2xl p-5 border border-white/10 bg-[#0f172a]/60 backdrop-blur-xl"
                        >
                            <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                                <Users size={16} className="text-pink-400" /> Family Details
                            </h4>
                            <div className="space-y-2">
                                {parentData.father_name && (
                                    <ParentRow label="Father" name={parentData.father_name} occupation={parentData.father_occupation} mobile={parentData.father_mobile} />
                                )}
                                {parentData.mother_name && (
                                    <ParentRow label="Mother" name={parentData.mother_name} occupation={parentData.mother_occupation} mobile={parentData.mother_mobile} />
                                )}
                                {parentData.guardian_name && (
                                    <ParentRow label="Guardian" name={parentData.guardian_name} occupation={parentData.guardian_occupation} mobile={parentData.guardian_mobile} />
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Quick Info / Motto Card */}
                    <motion.div custom={9} variants={FADE_UP} initial="hidden" animate="visible"
                        className="rounded-2xl border border-white/10 bg-[#0f172a]/60 backdrop-blur-xl overflow-hidden flex flex-col"
                    >
                        <div className="p-5 flex-1 space-y-3">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <GraduationCap size={16} className="text-indigo-400" /> Quick Info
                            </h4>
                            {stats?.program && <InfoRow icon={Award} label="Programme" value={stats.program} color="text-violet-400" />}
                            {academic?.current_academic_year && <InfoRow icon={Calendar} label="Academic Year" value={academic.current_academic_year} color="text-cyan-400" />}
                            {stats?.mentor_name && <InfoRow icon={User} label="Mentor" value={stats.mentor_name} color="text-emerald-400" />}
                            {personal?.gender && <InfoRow icon={User} label="Gender" value={personal.gender} color="text-pink-400" />}
                            {personal?.community && <InfoRow icon={Users} label="Community" value={`${personal.community} • ${personal.religion}`} color="text-amber-400" />}
                        </div>
                        <div className="px-5 py-3 border-t border-white/5 flex items-center gap-3 bg-white/[0.02]">
                            <img
                                src="https://student.sairam.edu.in/assets/sairam-founder-SphLKZaX.png"
                                alt="Founder"
                                className="h-10 w-10 rounded-full object-cover border border-white/10 flex-shrink-0"
                            />
                            <div>
                                <p className="text-[10px] font-bold text-slate-300 italic">&quot;Success is a journey, not a destination.&quot;</p>
                                <p className="text-[9px] text-slate-600">— MJF. Ln. Leo Muthu, Founder Chairman</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* ━━━━━━━━━━ ROW 3: Reports ━━━━━━━━━━ */}
                <motion.div custom={10} variants={FADE_UP} initial="hidden" animate="visible"
                    className="rounded-2xl border border-white/10 bg-[#0f172a]/60 backdrop-blur-xl overflow-hidden"
                >
                    <div className="px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                            <BarChart3 size={18} className="text-indigo-400" /> Academic Reports
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

                    <div className="p-6 min-h-[300px] relative">
                        {reportLoading && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0f172a]/60 backdrop-blur-sm">
                                <Loader2 className="animate-spin text-indigo-500" size={28} />
                            </div>
                        )}

                        {!activeReport && !reportLoading && (
                            <div className="flex flex-col items-center justify-center h-[260px] text-slate-500 gap-3">
                                <div className="p-4 rounded-2xl bg-white/5"><BarChart3 size={32} /></div>
                                <p className="text-sm text-center">Select a report type above to view/download PDF reports</p>
                            </div>
                        )}

                        {activeReport && reportSemesters.length > 0 && !pdfUrl && (
                            <div className="space-y-2">
                                <p className="text-xs text-slate-400 mb-3">Choose a semester to generate the report:</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {reportSemesters.map((s: any) => (
                                        <button key={s.id} onClick={() => downloadReport(s.id)}
                                            className={`px-4 py-3 rounded-xl text-sm font-medium border transition-all ${selectedSemester === s.id
                                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                                : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.08] hover:border-indigo-500/50'
                                                }`}
                                        >
                                            {s.name || `Sem ${s.number}`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {pdfUrl && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-slate-400">Report ready — view inline or download:</p>
                                    <div className="flex gap-2">
                                        <a href={pdfUrl} download={`${activeReport}_report.pdf`}
                                            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
                                            ⬇ Download PDF
                                        </a>
                                        <button onClick={() => { setPdfUrl(null); setSelectedSemester(null); }}
                                            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-slate-300 hover:bg-white/20 transition">
                                            ✕ Close
                                        </button>
                                    </div>
                                </div>
                                <iframe src={pdfUrl} className="w-full h-[500px] rounded-xl border border-white/10" title="Report PDF" />
                            </div>
                        )}

                        {activeReport && reportSemesters.length === 0 && !reportLoading && !pdfUrl && (
                            <div className="flex flex-col items-center justify-center h-[200px] text-slate-500 gap-2">
                                <AlertCircle size={24} />
                                <p className="text-sm">No semesters available for this report type.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </main>

            {/* ═══════════════════════ FOOTER ═══════════════════════ */}
            <footer className="mt-12 border-t border-white/5 bg-[#0a0f1e]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5 text-sm text-slate-400">
                            <span>Built with</span>
                            <span className="text-red-400 animate-pulse">❤</span>
                            <span>for Sairam by</span>
                            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">SairamATE</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <a href="https://github.com/AravindS2006/edumate" target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors">
                                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
                                Contribute
                            </a>
                            <span className="text-slate-700">•</span>
                            <a href="https://www.linkedin.com/in/aravindselvan-c" target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors">
                                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 01.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z" /></svg>
                                Aravind
                            </a>
                        </div>
                    </div>
                    <p className="text-center text-[10px] text-slate-700 mt-3">© {new Date().getFullYear()} EduMate • Sairam Institutions</p>
                </div>
            </footer>
        </div>
    );
}

/* ═══════════════════════ Sub-Components ═══════════════════════ */

function InfoRow({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
    return (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/5">
            <Icon size={14} className={color} />
            <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
                <p className="text-xs font-medium text-slate-200 truncate">{value}</p>
            </div>
        </div>
    );
}

function StatTile({ label, value, icon: Icon, accent, sub, subColor, custom }: any) {
    const accentMap: Record<string, string> = {
        cyan: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400',
        indigo: 'from-indigo-500/20 to-indigo-500/5 text-indigo-400',
        rose: 'from-rose-500/20 to-rose-500/5 text-rose-400',
        emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
        violet: 'from-violet-500/20 to-violet-500/5 text-violet-400',
    };
    const cls = accentMap[accent] || accentMap.indigo;

    return (
        <motion.div custom={custom} variants={FADE_UP} initial="hidden" animate="visible"
            className="rounded-2xl p-4 border border-white/10 bg-[#0f172a]/60 backdrop-blur-xl flex flex-col justify-between h-[130px] hover:-translate-y-0.5 transition-transform duration-300"
        >
            <div className={`p-2 w-fit rounded-lg bg-gradient-to-br ${cls}`}>
                <Icon size={16} />
            </div>
            <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">{label}</p>
                <p className="text-xl font-bold text-white leading-none">{value}</p>
                {sub && <p className={`text-[10px] mt-0.5 ${subColor || 'text-slate-500'}`}>{sub}</p>}
            </div>
        </motion.div>
    );
}

function MiniStat({ label, value, dot }: { label: string; value: string; dot: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            <div>
                <p className="text-[9px] text-slate-500">{label}</p>
                <p className="text-xs font-bold text-slate-200">{value}</p>
            </div>
        </div>
    );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
    return (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
            <span className="text-xs text-slate-300">{label}</span>
            {ok ? <CheckCircle2 size={16} className="text-emerald-400" /> : <XCircle size={16} className="text-rose-400" />}
        </div>
    );
}

function ParentRow({ label, name, occupation, mobile }: { label: string; name: string; occupation: string; mobile: string }) {
    return (
        <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-xs font-medium text-slate-200">{name}</p>
            <div className="flex items-center gap-3 mt-0.5">
                {occupation && <span className="text-[10px] text-slate-400">{occupation}</span>}
                {mobile && <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Phone size={9} />{mobile}</span>}
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
                    const ct = res.headers.get('content-type') || '';
                    if (ct.includes('image') || ct.includes('octet-stream') || ct.includes('jpeg')) {
                        const blob = await res.blob();
                        if (blob.size > 100) {
                            setSrc(URL.createObjectURL(blob));
                        }
                    }
                }
            } catch { /* fallback to initials */ }
        })();

        return () => { revoked = true; };
    }, [studtblId, documentId]);

    if (src) return <img src={src} alt="Profile" className="w-full h-full object-cover" />;

    return (
        <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{fallback}</span>
        </div>
    );
}
