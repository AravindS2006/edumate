'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, BookOpen, GraduationCap, BarChart3,
    FileText, LogOut, AlertCircle, Loader2,
    User, TrendingUp, Award, Users,
    CheckCircle2, XCircle, Mail, Phone, Bus,
    Download, X, ChevronRight, Sparkles, Heart
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AttendanceCalendar } from '@/components/AttendanceCalendar';
import { CourseAttendance } from '@/components/CourseAttendance';
import { BottomNav, type NavTab } from '@/components/BottomNav';
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
    raw_data?: any;
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

// Use relative URLs so Next.js rewrites proxy to backend (avoids CORS)
const API = '';

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



    // ... (keep existing state definitions)

    const [stats, setStats] = useState<StatsData | null>(null);
    const [academic, setAcademic] = useState<AcademicData | null>(null);
    const [personal, setPersonal] = useState<PersonalData | null>(null);
    const [acadPct, setAcadPct] = useState<AcademicPercentage | null>(null);
    const [parentData, setParentData] = useState<ParentData | null>(null);

    // Initial loading state can be false if we have cached data
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
    const [attendanceCourse, setAttendanceCourse] = useState<any[]>([]);
    const [leaveData, setLeaveData] = useState<any[]>([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceError, setAttendanceError] = useState<string | null>(null);

    // Bottom nav tab
    const [activeTab, setActiveTab] = useState<NavTab>('home');

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

        if (!token) { router.push('/'); return; }

        setStudtblId(id);

        const institutionId = localStorage.getItem('institutionId') || 'SEC';
        const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`,
            'X-Institution-Id': institutionId
        };
        const eid = encodeURIComponent(id);

        const fetchData = async () => {
            try {
                // Fetch all data concurrently
                const [statsRes, personalRes, academicRes, acadPctRes, parentRes] = await Promise.all([
                    fetch(`${API}/api/dashboard/stats?studtblId=${eid}`, { headers }),
                    fetch(`${API}/api/student/personal?studtblId=${eid}`, { headers }),
                    fetch(`${API}/api/student/academic?studtblId=${eid}`, { headers }),
                    fetch(`${API}/api/student/academic-percentage?studtblId=${eid}`, { headers }),
                    fetch(`${API}/api/student/parent?studtblId=${eid}`, { headers })
                ]);

                // Parse responses
                const [statsData, personalData, academicData, acadPctData, parentData] = await Promise.all([
                    statsRes.ok ? statsRes.json() : null,
                    personalRes.ok ? personalRes.json() : null,
                    academicRes.ok ? academicRes.json() : null,
                    acadPctRes.ok ? acadPctRes.json() : null,
                    parentRes.ok ? parentRes.json() : null
                ]);

                if (statsData) setStats(statsData);
                if (personalData) setPersonal(personalData);
                if (academicData) setAcademic(academicData);
                if (acadPctData) setAcadPct(acadPctData);
                if (parentData) setParentData(parentData);

            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
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
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'X-Institution-Id': localStorage.getItem('institutionId') || 'SEC'
                    }
                },
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
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    'X-Institution-Id': localStorage.getItem('institutionId') || 'SEC'
                },
                body: JSON.stringify(payload),
            });

            const contentType = res.headers.get('content-type') || '';

            if (res.ok && (contentType.includes('pdf') || contentType.includes('octet-stream'))) {
                // Success: got PDF binary
                const blob = await res.blob();
                if (blob.size > 500) {
                    // Ensure blob has correct PDF MIME type for inline viewing
                    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
                    const url = URL.createObjectURL(pdfBlob);
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
                    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
                    const url = URL.createObjectURL(pdfBlob);
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
            setAttendanceError(null);
            const headers = {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'X-Institution-Id': localStorage.getItem('institutionId') || 'SEC'
            };

            // Use IDs from the academic record (backend normalizes to snake_case for both SEC and SIT)
            const params = new URLSearchParams({
                studtblId,
                academicYearId: String(academic.academic_year_id ?? 14),
                branchId: String(academic.branch_id ?? 2),
                semesterId: String(academic.semester ?? 6),
                yearOfStudyId: String(academic.year_of_study_id ?? 3),
                sectionId: String(academic.section_id ?? 1)
            });

            try {
                const [dailyRes, leaveRes, courseRes, examRes] = await Promise.all([
                    fetch(`/api/attendance/daily-detail?${params}`, { headers }),
                    fetch(`/api/attendance/leave-status?${params}`, { headers }),
                    fetch(`/api/attendance/course-detail?${params}`, { headers }),
                    fetch(`/api/student/exam-status?${params}`, { headers })
                ]);

                const errors: string[] = [];

                // Process Exam Status (Arrears) - Update existing stats
                const examJson = await examRes.json().catch(() => ({}));
                if (examRes.ok && !examJson.error) {
                    setStats(prev => {
                        if (!prev) return null;
                        return {
                            ...prev,
                            arrears: examJson.arrears_current || 0,
                            // Optionally update OD if dashboard was 0 but this has value?
                            // od_percentage: prev.od_percentage || examJson.od_pct || 0 
                        };
                    });
                }

                const dailyJson = await dailyRes.json().catch(() => ({}));
                if (dailyRes.ok && dailyJson.data) {
                    setAttendanceDaily(Array.isArray(dailyJson.data) ? dailyJson.data : []);
                } else if (dailyJson.error) errors.push(dailyJson.error);

                const leaveJson = await leaveRes.json().catch(() => ({}));
                if (leaveRes.ok && leaveJson.data) {
                    setLeaveData(Array.isArray(leaveJson.data) ? leaveJson.data : []);
                } else if (leaveJson.error) errors.push(leaveJson.error);

                const courseJson = await courseRes.json().catch(() => ({}));
                if (courseRes.ok && courseJson.data) {
                    setAttendanceCourse(Array.isArray(courseJson.data) ? courseJson.data : []);
                } else if (courseJson.error) errors.push(courseJson.error);

                if (errors.length > 0) setAttendanceError(errors.join('. '));
            } catch (err) {
                console.error("Failed to load attendance", err);
                setAttendanceError('Network error. Please check your connection.');
            } finally {
                setAttendanceLoading(false);
            }
        };

        fetchAttendance();
    }, [studtblId, academic]);

    /* ── Blocking Loading screen ── */
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-indigo-600" size={40} />
                    <p className="text-slate-500 font-medium animate-pulse">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

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
        <div className="min-h-[100dvh] bg-slate-50 text-slate-800 overflow-x-hidden pb-24 md:pb-28">

            {/* ── Ambient background ── */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] bg-indigo-100/50 blur-[180px] rounded-full" />
                <div className="absolute top-[20%] -right-[15%] w-[50%] h-[50%] bg-cyan-100/40 blur-[160px] rounded-full" />
                <div className="absolute bottom-[-20%] left-[30%] w-[40%] h-[40%] bg-violet-100/30 blur-[140px] rounded-full" />
            </div>

            {/* ═══════════════════════ HEADER ═══════════════════════ */}
            <header className="sticky top-0 z-40 border-b border-slate-200/60 backdrop-blur-2xl bg-white/90">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-white flex items-center justify-center shadow-md shadow-indigo-100 ring-1 ring-slate-100 overflow-hidden">
                            <Image src="/assets/SAIRAM-ROUND-LOGO.png" alt="Sairam" width={28} height={28} className="object-contain" />
                        </div>
                        <div className="leading-tight">
                            <p className="text-sm font-extrabold tracking-tight text-slate-800">EduMate</p>
                            <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-[0.2em] hidden sm:block">Sairam Student Portal</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="hidden md:block text-[11px] text-slate-500 font-medium">
                            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        <button onClick={() => { localStorage.clear(); router.push('/'); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 hover:border-red-200 transition-all active:scale-95">
                            <LogOut size={14} /> <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* ═══════════════════════ BODY (Tabbed) ═══════════════════════ */}
            <motion.main initial="hidden" animate="visible" variants={stagger}
                className="max-w-[1400px] mx-auto px-3 sm:px-8 py-3 sm:py-4 min-h-[calc(100vh-8rem)]">

                <AnimatePresence mode="wait">
                    {activeTab === 'home' && (
                        <motion.div
                            key="home"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 12 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="space-y-3 sm:space-y-4"
                        >
                            {/* ── Greeting ── */}
                            <motion.div variants={fadeUp} className="space-y-1">
                                <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-800">
                                    {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400">{firstName}</span> 👋
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-500 font-medium">Here&apos;s your academic overview for today.</p>
                            </motion.div>

                            {/* ━━━━━━━━━━ ROW 1: Stats Cards (4 items) ━━━━━━━━━━ */}
                            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-4">
                                <div onClick={() => document.getElementById('attendance-section')?.scrollIntoView({ behavior: 'smooth' })} className="cursor-pointer transition-transform active:scale-95">
                                    <StatCard icon={Calendar} label="Attendance" value={`${attendPct}%`}
                                        accent="cyan" badge={attendPct >= 75 ? '✓ Good' : '⚠ Low'}
                                        badgeOk={attendPct >= 75} />
                                </div>
                                <StatCard icon={TrendingUp} label="CGPA" value={cgpa.toFixed(2)}
                                    accent="indigo" badge="/ 10.00" />
                                <StatCard icon={XCircle} label="Absent" value={`${absentPct.toFixed(1)}%`}
                                    accent="rose" badge={`${(100 - attendPct - odPct).toFixed(1)}% net`} />
                            </motion.div>

                            {/* ━━━━━━━━━━ ROW 2: Analytics (Attendance Ring + Quick Info) ━━━━━━━━━━ */}
                            <div className="space-y-3 sm:space-y-4">

                                {/* Attendance Ring + Breakdown */}
                                <motion.div id="attendance-section" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                                    <div className="rounded-2xl p-4 sm:p-5 border border-slate-200/60 bg-white flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
                                        {/* Ring */}
                                        <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
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
                                    </div>
                                </motion.div>

                                {/* Quick Info */}
                                <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                                    className="rounded-2xl border border-slate-200/60 bg-white overflow-hidden">
                                    <div className="p-4 sm:p-5 space-y-2">
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

                            {/* Home tab footer branding - compact */}
                            <motion.div variants={fadeUp} className="pt-4 flex justify-center">
                                <div className="flex items-center gap-2 text-slate-400 text-xs">
                                    <span>Built with</span><Heart size={12} className="text-red-400 fill-red-400" /><span>by Sairamite</span>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {activeTab === 'profile' && (
                        <motion.div
                            key="profile"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 12 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="space-y-3 sm:space-y-4"
                        >
                            {/* ── Profile Card ── */}
                            {(!personal || !academic) ? null : (
                                <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                                    <div className="relative rounded-2xl overflow-hidden border border-slate-200/60 bg-white shadow-2xl shadow-slate-200/50">
                                        <div className="h-20 sm:h-28 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500" />
                                            <div className="absolute inset-0 opacity-30"
                                                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
                                        </div>
                                        <div className="relative -mt-10 sm:-mt-12 flex justify-center">
                                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ring-4 ring-white overflow-hidden bg-slate-900 shadow-2xl shadow-indigo-500/20">
                                                <ProfileImage studtblId={studtblId} documentId={personal?.photo_id} fallback={initials} />
                                            </div>
                                        </div>
                                        <div className="px-3 sm:px-5 pb-4 sm:pb-5 pt-2 sm:pt-3 text-center space-y-2 sm:space-y-3">
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
                                        <div className="px-5 py-3 border-t border-slate-100/80 flex items-center gap-3 bg-white">
                                            <img src="https://student.sairam.edu.in/assets/sairam-founder-SphLKZaX.png" alt="Founder"
                                                className="h-10 w-10 rounded-full object-cover border border-slate-200 flex-shrink-0" />
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 italic">&quot;Success is a journey, not a destination.&quot;</p>
                                                <p className="text-[9px] text-slate-500">— MJF. Ln. Leo Muthu, Founder Chairman</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ── Debug Section ── */}
                            {stats?.raw_data && (
                                <motion.div variants={fadeUp} className="mt-8 p-4 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden">
                                    <details className="group">
                                        <summary className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-500 uppercase tracking-widest list-none">
                                            <span className="transition group-open:rotate-90">▶</span> Debug: Raw Backend Data
                                        </summary>
                                        <pre className="mt-4 text-[10px] text-slate-600 font-mono overflow-auto max-h-60 bg-white p-3 rounded-lg border border-slate-200">
                                            {JSON.stringify(stats.raw_data, null, 2)}
                                        </pre>
                                    </details>
                                </motion.div>
                            )}

                            {/* ━━━━━━━━━━ Academic History + Family ━━━━━━━━━━ */}
                            {
                                (acadPct?.records?.length || parentData?.father_name || parentData?.mother_name) && (
                                    <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
                                        className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">

                                        {acadPct && acadPct.records && acadPct.records.length > 0 && (
                                            <motion.div variants={fadeUp}
                                                className="rounded-2xl p-4 sm:p-5 border border-slate-200/60 bg-white">
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
                                                className="rounded-2xl p-4 sm:p-5 border border-slate-200/60 bg-white">
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
                                    </motion.div>
                                )
                            }
                        </motion.div>
                    )}

                    {activeTab === 'attendance' && (
                        <motion.div
                            key="attendance"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 12 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="space-y-3 sm:space-y-4"
                        >
                            {/* ── Attendance error banner ── */}
                            {attendanceError && (
                                <div className="rounded-xl p-3 bg-amber-50 border border-amber-200 flex items-center gap-2">
                                    <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
                                    <p className="text-sm text-amber-800">{attendanceError}</p>
                                </div>
                            )}
                            {/* ── Attendance Calendar Section ── */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400">
                                        <Calendar size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-800">Attendance Tracker</h2>
                                        <p className="text-[10px] text-slate-500">Daily status & leave record</p>
                                    </div>
                                </div>

                                <AttendanceCalendar
                                    dailyData={attendanceDaily}
                                    leaveData={leaveData}
                                    loading={attendanceLoading}
                                />
                            </div>

                            {/* ── Course Attendance Gauges ── */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                                        <BookOpen size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-800">Course-wise Attendance</h2>
                                        <p className="text-[10px] text-slate-500">Subject performance tracker</p>
                                    </div>
                                </div>

                                <CourseAttendance
                                    courses={attendanceCourse}
                                    loading={attendanceLoading}
                                />
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'reports' && (
                        <motion.div
                            key="reports"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 12 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="space-y-3 sm:space-y-4"
                        >
                            {/* ━━━━━━━━━━ Reports ━━━━━━━━━━ */}
                            <div
                                className="rounded-2xl border border-slate-200/60 bg-white overflow-hidden">

                                {/* Report Header */}
                                <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 border-b border-slate-100">
                                    <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-indigo-500/10"><BarChart3 size={16} className="text-indigo-400" /></div>
                                        Academic Reports
                                    </h3>
                                    <div className="flex bg-slate-50 rounded-xl p-1 border border-slate-100">
                                        {(['attendance', 'cat', 'endsem'] as const).map(t => (
                                            <button key={t} onClick={() => loadReport(t)}
                                                className={`px-3 sm:px-5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-lg transition-all duration-300 ${activeReport === t
                                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-slate-800 shadow-lg shadow-indigo-500/25'
                                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                                                    }`}>
                                                {t === 'attendance' ? 'Attendance' : t === 'cat' ? 'CAT Marks' : 'End Sem'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Report Body */}
                                <div className="p-4 sm:p-6 min-h-[200px] sm:min-h-[280px] relative">
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
                                                    {(reportSemesters || []).map((s: any) => (
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
                                                            className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center gap-1.5">
                                                            <Download size={13} /> Download
                                                        </a>
                                                        <button onClick={() => { setPdfUrl(null); setSelectedSemester(null); }}
                                                            className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 hover:bg-slate-100 transition-all flex items-center gap-1.5 border border-slate-200/60">
                                                            <X size={13} /> Close
                                                        </button>
                                                    </div>
                                                </div>
                                                <object data={pdfUrl} type="application/pdf" className="w-full h-[500px] rounded-xl border border-slate-200/60 bg-white">
                                                    <div className="flex flex-col items-center justify-center h-[500px] gap-4 bg-slate-50 rounded-xl border border-slate-200/60">
                                                        <FileText size={40} className="text-slate-400" />
                                                        <p className="text-sm text-slate-500 font-medium">PDF preview is not available in your browser</p>
                                                        <a href={pdfUrl} download={`${activeReport}_report.pdf`}
                                                            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg transition-all flex items-center gap-2">
                                                            <Download size={16} /> Download Report
                                                        </a>
                                                    </div>
                                                </object>
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
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.main>

            {/* ═══════════════════════ BOTTOM NAV ═══════════════════════ */}
            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

            {/* ═══════════════════════ FOOTER (Desktop only) ═══════════════════════ */}
            <footer className="hidden md:block mt-auto border-t border-slate-100/80 bg-white/95">
                <div className="max-w-[1400px] mx-auto px-3 sm:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4">

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
                                <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Sairamite</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <a href="https://github.com/AravindS2006/edumate" target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors font-medium">
                                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
                                Contribute
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
            className="group rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200/60 bg-white flex flex-col justify-between h-[110px] sm:h-[140px] hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:border-slate-300">
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
                const institutionId = localStorage.getItem('institutionId') || 'SEC';
                const res = await fetch(
                    `${API}/api/profile/image?studtblId=${encodeURIComponent(studtblId)}&documentId=${encodeURIComponent(documentId)}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'X-Institution-Id': institutionId
                        }
                    },
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
