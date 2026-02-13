'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, BookOpen, GraduationCap, BarChart3,
    FileText, LogOut, AlertCircle, Loader2,
    User, TrendingUp, Award, Clock, Users,
    CheckCircle2, XCircle, Mail, Phone, Bus,
    Download, X, ChevronRight, Sparkles, Shield,
    MapPin, Heart, History as HistoryIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AttendanceCalendar } from '@/components/AttendanceCalendar';
import Image from 'next/image';

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
    arrears_current: number;
    arrears_history: number;
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

const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
    hidden: { opacity: 0, y: 20, scale: 0.97 },
    visible: {
        opacity: 1, y: 0, scale: 1,
        transition: { duration: 0.5, ease: "easeOut" as const },
    },
};

const slideIn = {
    hidden: { opacity: 0, x: -16 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
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
    const [reportFilterData, setReportFilterData] = useState<any>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
    const [reportError, setReportError] = useState<string | null>(null);

    // Attendance State
    const [attendanceDaily, setAttendanceDaily] = useState<any[]>([]);
    const [leaveData, setLeaveData] = useState<any[]>([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);

    // Greeting
    const [greeting, setGreeting] = useState('Good day');
    useEffect(() => {
        const h = new Date().getHours();
        if (h < 12) setGreeting('Good morning');
        else if (h < 17) setGreeting('Good afternoon');
        else setGreeting('Good evening');
    }, []);

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
                // 1. Critical Data (Stats & Personal Name) -> Unblock UI ASAP
                const [sRes, pRes] = await Promise.all([
                    fetch(`${API}/api/dashboard/stats?studtblId=${eid}`, { headers }),
                    fetch(`${API}/api/student/personal?studtblId=${eid}`, { headers }),
                ]);

                if (sRes.ok) setStats(await sRes.json());
                if (pRes.ok) setPersonal(await pRes.json());
            } catch (err) {
                console.error("Critical load error", err);
                setError('Network error — could not reach the server.');
            } finally {
                setLoading(false); // Unblock UI immediately after critical data
            }

            // 2. Secondary Data -> Load in background
            fetch(`${API}/api/student/academic?studtblId=${eid}`, { headers })
                .then(r => { if (r.ok) r.json().then(setAcademic); }).catch(e => console.error(e));

            fetch(`${API}/api/student/exam-status?studtblId=${eid}`, { headers })
                .then(r => { if (r.ok) r.json().then(setExamStatus); }).catch(e => console.error(e));

            fetch(`${API}/api/student/academic-percentage?studtblId=${eid}`, { headers })
                .then(r => { if (r.ok) r.json().then(setAcadPct); }).catch(e => console.error(e));

            fetch(`${API}/api/student/parent?studtblId=${eid}`, { headers })
                .then(r => { if (r.ok) r.json().then(setParentData); }).catch(e => console.error(e));
        };

        load();
    }, [router]);

    /* ── Report Tab Click ── */
    const loadReport = useCallback(async (type: string) => {
        if (activeReport === type) { setActiveReport(null); setReportSemesters([]); setPdfUrl(null); setReportError(null); return; }
        setActiveReport(type);
        setReportLoading(true);
        setReportSemesters([]);
        setPdfUrl(null);
        setSelectedSemester(null);
        setReportError(null);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(
                `${API}/api/reports?type=${type}&studtblId=${encodeURIComponent(studtblId)}`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            const json = res.ok ? await res.json() : null;
            if (json && json.semesters && json.semesters.length > 0) {
                setReportSemesters(json.semesters);
                if (json.filterData) setReportFilterData(json.filterData);
            } else {
                setReportError('No semesters found for this report type.');
            }
        } catch {
            setReportError('Failed to load report data. Please try again.');
        }
        finally { setReportLoading(false); }
    }, [activeReport, studtblId]);

    /* ── Download Report PDF ── */
    const downloadReport = useCallback(async (semesterId: number) => {
        setSelectedSemester(semesterId);
        setReportLoading(true);
        setPdfUrl(null);
        setReportError(null);
        const token = localStorage.getItem('token');
        // Map frontend types to upstream API report names
        const reportNameMap: Record<string, string> = {
            attendance: 'Attendance',
            cat: 'CAT Performance',
            endsem: 'University-End Semester'
        };
        const reportName = reportNameMap[activeReport || 'attendance'] || 'Attendance';
        // Merge base params with any extra filter data from the report endpoint (e.g., branchId, sectionId)
        const payload = {
            reportName,
            semesterId,
            studtblId,
            ...(reportFilterData || {})
        };

        try {
            const res = await fetch(`${API}/api/reports/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });

            const contentType = res.headers.get('content-type') || '';

            if (res.ok && (contentType.includes('pdf') || contentType.includes('octet-stream'))) {
                // Success: got PDF binary
                const blob = await res.blob();
                if (blob.size > 500) {
                    const url = URL.createObjectURL(blob);
                    setPdfUrl(url);
                } else {
                    setReportError('Report generated but appears empty. Try a different semester.');
                }
            } else if (contentType.includes('json')) {
                // Error or unexpected JSON response from backend
                const json = await res.json();
                const errMsg = json?.error || json?.message || 'Unknown error from server.';
                console.error('Report error:', res.status, errMsg);
                setReportError(errMsg);
            } else if (res.ok) {
                // Could still be valid but non-standard content type
                const blob = await res.blob();
                if (blob.size > 500) {
                    const url = URL.createObjectURL(blob);
                    setPdfUrl(url);
                } else {
                    setReportError('The report could not be generated. It may not be available for this semester.');
                }
            } else {
                setReportError(`Failed to generate report (Status: ${res.status}). Try again later.`);
            }
        } catch (err) {
            console.error('Download report error:', err);
            setReportError('Network error while downloading report. Check your connection.');
        }
        finally { setReportLoading(false); }
    }, [activeReport, studtblId]);

    /* ── Debug: Trigger Attendance Endpoints ── */
    /* ── Fetch Attendance Data (Once Academic Data is ready) ── */
    useEffect(() => {
        if (!studtblId || !academic) return;

        const fetchAttendance = async () => {
            setAttendanceLoading(true);
            const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

            // Use IDs from the academic record
            const params = new URLSearchParams({
                studtblId,
                academicYearId: String(academic.academic_year_id),
                branchId: String(academic.branch_id),
                semesterId: String(academic.semester),
                yearOfStudyId: String(academic.year_of_study_id),
                sectionId: String(academic.section_id)
            });

            try {
                // Parallel fetch
                const [dailyRes, leaveRes] = await Promise.all([
                    fetch(`${API}/api/attendance/daily-detail?${params}`, { headers }),
                    fetch(`${API}/api/attendance/leave-status?${params}`, { headers })
                ]);

                if (dailyRes.ok) {
                    const dailyJson = await dailyRes.json();
                    if (dailyJson.data) setAttendanceDaily(dailyJson.data);
                }

                if (leaveRes.ok) {
                    const leaveJson = await leaveRes.json();
                    if (leaveJson.data) setLeaveData(leaveJson.data);
                }
            } catch (err) {
                console.error("Failed to load attendance", err);
            } finally {
                setAttendanceLoading(false);
            }
        };

        fetchAttendance();
    }, [studtblId, academic]);

    /* ── Blocking Loading screen (REMOVED for progressive loading) ── */
    // if (loading) return <LoadingScreen ... />

    /* ── Error screen ── */
    if (error && !stats && !personal) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-6 px-6 text-center">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="p-5 rounded-2xl bg-red-50 text-red-500 border border-red-100 shadow-lg shadow-red-100/50">
                    <AlertCircle size={44} />
                </motion.div>
                <h2 className="text-2xl font-bold text-slate-800">Connection Error</h2>
                <p className="text-slate-500 text-sm max-w-md">{error}</p>
                <button onClick={() => window.location.reload()}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-slate-800 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0">
                    Try Again
                </button>
            </div>
        );
    }

    const displayName = personal?.name || 'Student';
    const firstName = displayName.split(' ')[0];
    const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2);
    const attendPct = stats?.attendance_percentage ?? 0;
    const cgpa = stats?.cgpa ?? 0;
    const odPct = stats?.od_percentage ?? 0;
    const absentPct = stats?.absent_percentage ?? 0;

    /* ─────────────────────────────── Render ─────────────────────────────── */
    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 overflow-x-hidden">

            {/* ── Ambient background ── */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] bg-indigo-100/50 blur-[180px] rounded-full" />
                <div className="absolute top-[20%] -right-[15%] w-[50%] h-[50%] bg-cyan-100/40 blur-[160px] rounded-full" />
                <div className="absolute bottom-[-20%] left-[30%] w-[40%] h-[40%] bg-violet-100/30 blur-[140px] rounded-full" />
            </div>

            {/* ═══════════════════════ HEADER ═══════════════════════ */}
            <header className="sticky top-0 z-50 border-b border-slate-200/60 backdrop-blur-2xl bg-white/80">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-md shadow-indigo-100 ring-1 ring-slate-100 overflow-hidden">
                            <Image src="/assets/SAIRAM-ROUND-LOGO.png" alt="Sairam" width={28} height={28} className="object-contain" />
                        </div>
                        <div className="leading-tight">
                            <p className="text-sm font-extrabold tracking-tight text-slate-800">EduMate</p>
                            <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-[0.2em]">Sairam Student Portal</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="hidden sm:block text-[11px] text-slate-500 font-medium">
                            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => { localStorage.clear(); router.push('/'); }}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 hover:border-red-200 transition-all">
                            <LogOut size={13} /> Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* ═══════════════════════ BODY ═══════════════════════ */}
            <motion.main initial="hidden" animate="visible" variants={stagger}
                className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8 space-y-8">

                {/* ── Greeting ── */}
                <motion.div variants={fadeUp} className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800">
                        {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400">{firstName}</span> 👋
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">Here&apos;s your academic overview for today.</p>
                </motion.div>

                {/* ━━━━━━━━━━ ROW 1: Stats Cards (6 items) ━━━━━━━━━━ */}
                <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <StatCard icon={Calendar} label="Attendance" value={`${attendPct}%`}
                        accent="cyan" badge={attendPct >= 75 ? '✓ Good' : '⚠ Low'}
                        badgeOk={attendPct >= 75} />
                    <StatCard icon={TrendingUp} label="CGPA" value={cgpa.toFixed(2)}
                        accent="indigo" badge="/ 10.00" />
                    <StatCard icon={FileText} label="OD Count" value={String(stats?.od_count ?? 0)}
                        accent="violet" badge={`${odPct}%`} />
                    {/* Temporarily hidden: Arrears sections */}
                    {/* 
                    <StatCard icon={AlertCircle} label="Standing Arrears"
                        value={examStatus ? String(examStatus.arrears_current ?? 0) : '...'}
                        accent="rose" badge={examStatus?.arrears_current ? 'Critical' : 'All Clear'}
                        badgeOk={!examStatus?.arrears_current} />
                    <StatCard icon={HistoryIcon} label="History Arrears"
                        value={examStatus ? String(examStatus.arrears_history ?? 0) : '...'}
                        accent="amber" badge="Total" />
                    */}

                    {/* Fillers to maintain layout if needed, or just let it adjust */}
                    <StatCard icon={XCircle} label="Absent" value={`${absentPct.toFixed(1)}%`}
                        accent="rose" badge={`${(100 - attendPct - odPct).toFixed(1)}% net`} />
                </motion.div>

                {/* ━━━━━━━━━━ ROW 2: Profile + Analytics ━━━━━━━━━━ */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* ── Profile Card ── */}
                    <motion.div variants={fadeUp} className="lg:col-span-4">
                        <div className="relative rounded-2xl overflow-hidden border border-slate-200/60 bg-white  shadow-2xl shadow-slate-200/50 h-full">
                            {/* Banner */}
                            <div className="h-28 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500" />
                                <div className="absolute inset-0 opacity-30"
                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
                            </div>

                            {/* Avatar */}
                            <div className="relative -mt-12 flex justify-center">
                                <div className="w-24 h-24 rounded-2xl ring-4 ring-white overflow-hidden bg-slate-900 shadow-2xl shadow-indigo-500/20">
                                    <ProfileImage studtblId={studtblId} documentId={personal?.photo_id} fallback={initials} />
                                </div>
                            </div>

                            {/* Info */}
                            <div className="px-5 pb-5 pt-3 text-center space-y-3">
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">{displayName}</h2>
                                    <p className="text-xs text-indigo-400 font-mono font-bold mt-0.5">{personal?.reg_no || '—'}</p>
                                    {personal?.email && (
                                        <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-center gap-1"><Mail size={10} />{personal.email}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <ProfileRow icon={BookOpen} label="Department" value={academic?.dept || '—'} />
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <ProfileRow icon={GraduationCap} label="Semester" value={academic?.semester_name || `Sem ${academic?.semester || '—'}`} />
                                        <ProfileRow icon={Award} label="Batch" value={academic?.batch || '—'} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <ProfileRow icon={User} label="Admission" value={academic?.admission_mode || '—'} />
                                        <ProfileRow icon={FileText} label="Univ Reg" value={academic?.university_reg_no || '—'} />
                                    </div>
                                    {academic?.mentor_name && <ProfileRow icon={Users} label="Mentor" value={academic.mentor_name} />}
                                    {personal?.bus_route && <ProfileRow icon={Bus} label="Transport" value={personal.bus_route} />}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── Analytics Column ── */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* Attendance Ring + Breakdown */}
                        <motion.div variants={fadeUp}
                            className="rounded-2xl p-6 border border-slate-200/60 bg-white  flex flex-col sm:flex-row items-center gap-6">
                            {/* Ring */}
                            <div className="relative w-32 h-32 flex-shrink-0">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="8" />
                                    <circle cx="60" cy="60" r="52" fill="none" stroke="url(#ringGrad)" strokeWidth="8" strokeLinecap="round"
                                        strokeDasharray={326.7} strokeDashoffset={326.7 - (326.7 * attendPct) / 100}
                                        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.22, 1, 0.36, 1)' }} />
                                    <defs>
                                        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                                            <stop offset="0%" stopColor="#06b6d4" />
                                            <stop offset="50%" stopColor="#6366f1" />
                                            <stop offset="100%" stopColor="#a855f7" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-black text-slate-800 tabular-nums">{attendPct}</span>
                                    <span className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-bold">percent</span>
                                </div>
                            </div>

                            {/* Breakdown */}
                            <div className="flex-1 w-full space-y-3">
                                <h4 className="text-sm font-bold text-slate-800">Attendance Breakdown</h4>
                                <BarStat label="Present" pct={attendPct} color="from-cyan-500 to-indigo-500" />
                                <BarStat label="On Duty" pct={odPct} color="from-violet-500 to-purple-500" />
                                <BarStat label="Absent" pct={absentPct} color="from-rose-500 to-pink-500" />
                            </div>
                        </motion.div>

                        {/* Exam Status + Quick Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {examStatus && (
                                <motion.div variants={fadeUp}
                                    className="rounded-2xl p-5 border border-slate-200/60 bg-white ">
                                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                                        <div className="p-1.5 rounded-lg bg-amber-500/10"><Shield size={14} className="text-amber-400" /></div>
                                        Exam Eligibility
                                    </h4>
                                    <div className="space-y-2">
                                        <EligibilityRow label="Attendance" ok={examStatus.attendance_eligible} />
                                        <EligibilityRow label="Fee Payment" ok={examStatus.fees_eligible} />
                                        {examStatus.current_status && (
                                            <div className="mt-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                                <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Status</p>
                                                <p className="text-xs font-semibold text-slate-700 mt-0.5">{examStatus.current_status}</p>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <FeeBox label="Total Fees" value={`₹${examStatus.total_fees?.toLocaleString('en-IN')}`} />
                                            <FeeBox label="Paid" value={`₹${examStatus.paid_online?.toLocaleString('en-IN')}`} green />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <motion.div variants={fadeUp}
                                className="rounded-2xl border border-slate-200/60 bg-white  overflow-hidden flex flex-col">
                                <div className="p-5 flex-1 space-y-2">
                                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-indigo-500/10"><Sparkles size={14} className="text-indigo-400" /></div>
                                        Quick Info
                                    </h4>
                                    {stats?.program && <ProfileRow icon={Award} label="Programme" value={stats.program} />}
                                    {academic?.current_academic_year && <ProfileRow icon={Calendar} label="Academic Year" value={academic.current_academic_year} />}
                                    {stats?.mentor_name && <ProfileRow icon={User} label="Mentor" value={stats.mentor_name} />}
                                    {personal?.gender && <ProfileRow icon={User} label="Gender" value={personal.gender} />}
                                    {personal?.date_of_birth && <ProfileRow icon={Calendar} label="DOB" value={`${personal.date_of_birth} (Age: ${personal.age})`} />}
                                </div>
                                <div className="px-5 py-3 border-t border-slate-100/80 flex items-center gap-3 bg-white">
                                    <img src="https://student.sairam.edu.in/assets/sairam-founder-SphLKZaX.png" alt="Founder"
                                        className="h-10 w-10 rounded-full object-cover border border-slate-200 flex-shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 italic">&quot;Success is a journey, not a destination.&quot;</p>
                                        <p className="text-[9px] text-slate-500">— MJF. Ln. Leo Muthu, Founder Chairman</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* ━━━━━━━━━━ ROW 3: Academic History + Family ━━━━━━━━━━ */}
                {
                    (acadPct?.records?.length || parentData?.father_name || parentData?.mother_name) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                            {acadPct && acadPct.records && acadPct.records.length > 0 && (
                                <motion.div variants={fadeUp}
                                    className="rounded-2xl p-5 border border-slate-200/60 bg-white ">
                                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                                        <div className="p-1.5 rounded-lg bg-cyan-500/10"><BarChart3 size={14} className="text-cyan-400" /></div>
                                        Academic History
                                    </h4>
                                    <div className="space-y-3">
                                        {acadPct.records.map((r, i) => (
                                            <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700">{r.exam}</p>
                                                    <p className="text-[10px] text-slate-500 font-medium">Year of Passing: {r.year}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 tabular-nums">
                                                        {parseFloat(r.percentage).toFixed(1)}%
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {parentData && (parentData.father_name || parentData.mother_name) && (
                                <motion.div variants={fadeUp}
                                    className="rounded-2xl p-5 border border-slate-200/60 bg-white ">
                                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                                        <div className="p-1.5 rounded-lg bg-pink-500/10"><Users size={14} className="text-pink-400" /></div>
                                        Family Details
                                    </h4>
                                    <div className="space-y-3">
                                        {parentData.father_name && <FamilyCard label="Father" name={parentData.father_name} occupation={parentData.father_occupation} mobile={parentData.father_mobile} />}
                                        {parentData.mother_name && <FamilyCard label="Mother" name={parentData.mother_name} occupation={parentData.mother_occupation} mobile={parentData.mother_mobile} />}
                                        {parentData.guardian_name && <FamilyCard label="Guardian" name={parentData.guardian_name} occupation={parentData.guardian_occupation} mobile={parentData.guardian_mobile} />}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    )
                }

                {/* ━━━━━━━━━━ ROW 4: Reports ━━━━━━━━━━ */}
                <motion.div variants={fadeUp}
                    className="rounded-2xl border border-slate-200/60 bg-white  overflow-hidden">

                    {/* Report Header */}
                    <div className="px-6 pt-5 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                        <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-indigo-500/10"><BarChart3 size={16} className="text-indigo-400" /></div>
                            Academic Reports
                        </h3>
                        <div className="flex bg-slate-50 rounded-xl p-1 border border-slate-100">
                            {(['attendance', 'cat', 'endsem'] as const).map(t => (
                                <button key={t} onClick={() => loadReport(t)}
                                    className={`px-5 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${activeReport === t
                                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-slate-800 shadow-lg shadow-indigo-500/25'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                                        }`}>
                                    {t === 'attendance' ? 'Attendance' : t === 'cat' ? 'CAT Marks' : 'End Sem'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Report Body */}
                    <div className="p-6 min-h-[280px] relative">
                        <AnimatePresence mode="wait">

                            {reportLoading && (
                                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="animate-spin text-indigo-400" size={24} />
                                        <span className="text-sm text-slate-500 font-medium">Loading report data…</span>
                                    </div>
                                </motion.div>
                            )}

                            {!activeReport && !reportLoading && (
                                <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className="flex flex-col items-center justify-center h-[240px] text-slate-500 gap-4">
                                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                        <BarChart3 size={36} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-slate-500">Select a report type</p>
                                        <p className="text-xs text-slate-500 mt-1">Choose Attendance, CAT, or End Sem to view PDF reports</p>
                                    </div>
                                </motion.div>
                            )}

                            {activeReport && reportSemesters.length > 0 && !pdfUrl && !reportLoading && (
                                <motion.div key="semesters" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className="space-y-4">
                                    <p className="text-xs text-slate-500 font-medium">Select a semester to generate the report:</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {reportSemesters.map((s: any) => (
                                            <button key={s.id} onClick={() => downloadReport(s.id)}
                                                className={`group px-4 py-3.5 rounded-xl text-sm font-bold border transition-all duration-300 flex items-center justify-between ${selectedSemester === s.id
                                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 border-indigo-500/50 text-slate-800 shadow-lg shadow-indigo-500/20'
                                                    : 'bg-slate-50 border-slate-200/60 text-slate-500 hover:bg-slate-100 hover:border-indigo-500/30 hover:-translate-y-0.5'
                                                    }`}>
                                                <span>{s.name || `Semester ${s.number}`}</span>
                                                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {pdfUrl && !reportLoading && (
                                <motion.div key="pdf" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-slate-500 font-medium flex items-center gap-2">
                                            <CheckCircle2 size={14} className="text-emerald-400" /> Report generated successfully
                                        </p>
                                        <div className="flex gap-2">
                                            <a href={pdfUrl} download={`${activeReport}_report.pdf`}
                                                className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-slate-800 hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center gap-1.5">
                                                <Download size={13} /> Download
                                            </a>
                                            <button onClick={() => { setPdfUrl(null); setSelectedSemester(null); }}
                                                className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 hover:bg-slate-100 transition-all flex items-center gap-1.5 border border-slate-200/60">
                                                <X size={13} /> Close
                                            </button>
                                        </div>
                                    </div>
                                    <iframe src={pdfUrl} className="w-full h-[500px] rounded-xl border border-slate-200/60 bg-white" title="Report PDF" />
                                </motion.div>
                            )}

                            {reportError && !reportLoading && (
                                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="flex flex-col items-center justify-center h-[200px] gap-3">
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                        <AlertCircle size={22} className="text-amber-400" />
                                    </div>
                                    <p className="text-sm text-slate-500 text-center max-w-sm">{reportError}</p>
                                    <button onClick={() => { setReportError(null); setActiveReport(null); }}
                                        className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-100 transition-all border border-slate-200/60">
                                        Try Again
                                    </button>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                </motion.div>

            </motion.main>

            {/* ── Attendance Calendar Section ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-8 mb-12 px-4 max-w-[1400px] mx-auto"
            >
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Attendance Tracker</h2>
                        <p className="text-xs text-slate-500">Daily status & leave record</p>
                    </div>
                </div>

                <AttendanceCalendar
                    dailyData={attendanceDaily}
                    leaveData={leaveData}
                    loading={attendanceLoading}
                />
            </motion.div>

            {/* ═══════════════════════ FOOTER ═══════════════════════ */}
            <footer className="mt-auto border-t border-slate-100/80 bg-white/95 ">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-6 space-y-5">

                    {/* ── Sairam Branding Grid ── */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        {/* Founder — takes 5 cols on desktop */}
                        <div className="md:col-span-5 rounded-xl overflow-hidden bg-white p-2 shadow-sm">
                            <Image
                                src="/assets/sairam-founder-SphLKZaX.png"
                                alt="MJF. Ln. Leo Muthu — Founder Chairman, Sairam Institutions"
                                width={600}
                                height={100}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        {/* Right side: SDG + Initiatives stacked — takes 7 cols */}
                        <div className="md:col-span-7 flex flex-col gap-3">
                            <div className="rounded-xl overflow-hidden bg-white p-2 shadow-sm flex-1 flex items-center">
                                <Image
                                    src="/assets/sairam-logo2-BsAIYXw5.png"
                                    alt="UN Sustainable Development Goals"
                                    width={800}
                                    height={40}
                                    className="w-full h-auto object-contain"
                                />
                            </div>
                            <div className="rounded-xl overflow-hidden bg-white p-2 shadow-sm flex-1 flex items-center">
                                <Image
                                    src="/assets/sairam-logo1-BVt3-ItC.png"
                                    alt="Sairam SDG Action Program, EOMS, RAISE"
                                    width={800}
                                    height={40}
                                    className="w-full h-auto object-contain"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Credits Row ── */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-sm">
                                <Image src="/assets/SAIRAM-ROUND-LOGO.png" alt="Sairam" width={22} height={22} className="object-contain" />
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                                <span>Built with</span>
                                <Heart size={13} className="text-red-400 fill-red-400 animate-pulse" />
                                <span>for Sairam by</span>
                                <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">EduMate</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <a href="https://github.com/AravindS2006/edumate" target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors font-medium">
                                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
                                Contribute
                            </a>
                            <span className="text-slate-700">•</span>
                            <a href="https://www.linkedin.com/in/aravindselvan-c" target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors font-medium">
                                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 01.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z" /></svg>
                                Aravind
                            </a>
                        </div>
                    </div>
                    <p className="text-center text-[10px] text-slate-700 font-medium">© {new Date().getFullYear()} EduMate • Sri Sairam Institutions, Chennai</p>
                </div>
            </footer>
        </div>
    );
}

/* ═══════════════════════ Sub-Components ═══════════════════════ */

function ProfileRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
            <Icon size={13} className="text-slate-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">{label}</p>
                <p className="text-xs font-semibold text-slate-700 truncate">{value}</p>
            </div>
        </div>
    );
}

interface StatCardProps {
    icon: React.ElementType;
    label: string;
    value: string;
    accent: string;
    badge?: string;
    badgeOk?: boolean;
}

function StatCard({ icon: Icon, label, value, accent, badge, badgeOk }: StatCardProps) {
    const gradients: Record<string, string> = {
        cyan: 'from-cyan-500/15 to-cyan-500/5',
        indigo: 'from-indigo-500/15 to-indigo-500/5',
        rose: 'from-rose-500/15 to-rose-500/5',
        violet: 'from-violet-500/15 to-violet-500/5',
        amber: 'from-amber-500/15 to-amber-500/5', // Added
        emerald: 'from-emerald-500/15 to-emerald-500/5', // Added
    };
    const iconColors: Record<string, string> = {
        cyan: 'text-cyan-400', indigo: 'text-indigo-400',
        rose: 'text-rose-400', violet: 'text-violet-400',
        amber: 'text-amber-400', emerald: 'text-emerald-400', // Added
    };

    return (
        <motion.div variants={fadeUp}
            className="group rounded-2xl p-4 border border-slate-200/60 bg-white  flex flex-col justify-between h-[140px] hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:border-slate-300">
            <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl bg-gradient-to-br ${gradients[accent]}`}>
                    <Icon size={16} className={iconColors[accent]} />
                </div>
                {badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeOk === true ? 'bg-emerald-500/10 text-emerald-400' :
                        badgeOk === false ? 'bg-amber-500/10 text-amber-400' :
                            'text-slate-500'}`}>
                        {badge}
                    </span>
                )}
            </div>
            <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{label}</p>
                <p className="text-2xl font-black text-slate-800 leading-none mt-0.5 tabular-nums">{value}</p>
            </div>
        </motion.div>
    );
}

function BarStat({ label, pct, color }: { label: string; pct: number; color: string }) {
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">{label}</span>
                <span className="text-slate-800 font-bold tabular-nums">{pct.toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                    className={`h-full rounded-full bg-gradient-to-r ${color}`} />
            </div>
        </div>
    );
}

function EligibilityRow({ label, ok }: { label: string; ok: boolean }) {
    return (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-xs text-slate-500 font-medium">{label}</span>
            {ok
                ? <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400"><CheckCircle2 size={14} /> Eligible</span>
                : <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400"><XCircle size={14} /> Not Eligible</span>}
        </div>
    );
}

function FeeBox({ label, value, green }: { label: string; value: string; green?: boolean }) {
    return (
        <div className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{label}</p>
            <p className={`text-sm font-black mt-0.5 ${green ? 'text-emerald-400' : 'text-slate-700'}`}>{value}</p>
        </div>
    );
}

function FamilyCard({ label, name, occupation, mobile }: { label: string; name: string; occupation: string; mobile: string }) {
    return (
        <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{label}</p>
            <p className="text-sm font-bold text-slate-700 mt-0.5">{name}</p>
            <div className="flex items-center gap-3 mt-1">
                {occupation && <span className="text-[11px] text-slate-500 font-medium">{occupation}</span>}
                {mobile && <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1"><Phone size={10} />{mobile}</span>}
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
            <span className="text-2xl font-black text-white">{fallback}</span>
        </div>
    );
}
