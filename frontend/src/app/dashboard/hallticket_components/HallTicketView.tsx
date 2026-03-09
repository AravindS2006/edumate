import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, AlertCircle, CheckCircle2, Loader2, BookOpen, User, Calendar, CreditCard, ChevronRight, Check } from 'lucide-react';

interface HallTicketProps {
    studtblId: string;
    academic: any;
    API: string;
    token: string;
    institutionId: string;
}

export default function HallTicketView({ studtblId, academic, API, token, institutionId }: HallTicketProps) {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

    // Dynamic Selectors State
    const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>(academic?.academic_year_id?.toString() || '');
    const [selectedSemesterType, setSelectedSemesterType] = useState<string>(academic?.semester_type || '');
    const [academicOptions, setAcademicOptions] = useState<any[]>([]);

    const [data, setData] = useState<{
        history: any;
        subjects: any;
        mentorSubjects: any;
        selectedSubject: any;
        notes: any;
        downloadStatus: any;
        attendanceObj: any; // We'll grab this from page load if possible, or just mock it since this view lacks the full state 
        stats: any;
    }>({
        history: null, subjects: null, mentorSubjects: null, selectedSubject: null, notes: null, downloadStatus: null, attendanceObj: null, stats: null
    });

    // 1. Fetch Academic Options Once
    useEffect(() => {
        if (!academic) return;
        const fetchOptions = async () => {
            try {
                const headers = { Authorization: `Bearer ${token}`, 'X-Institution-Id': institutionId };
                const res = await fetch(`${API}/api/hallticket/academic-year-sem?programmeId=${academic.program_id ?? 1}`, { headers });
                const json = await res.json();
                if (json.success && json.data) {
                    setAcademicOptions(json.data);
                    // Set defaults if empty
                    if (!selectedAcademicYearId && json.data[0]?.academicYearId) {
                        setSelectedAcademicYearId(String(json.data[0].academicYearId));
                    }
                    if (!selectedSemesterType && json.data[0]?.semesterType) {
                        setSelectedSemesterType(json.data[0].semesterType);
                    }
                }
            } catch (e) {
                console.error(e);
                if (!selectedAcademicYearId) setSelectedAcademicYearId(academic?.academic_year_id?.toString() || '14');
                if (!selectedSemesterType) setSelectedSemesterType(academic?.semester_type || 'Even');
            }
        };
        fetchOptions();
    }, [academic, API, token, institutionId]);

    // 2. Fetch Dependent Data whenever selections change
    useEffect(() => {
        if (!studtblId || !academic || !selectedAcademicYearId || !selectedSemesterType) return;
        const fetchAll = async () => {
            setLoading(true);
            const headers = { Authorization: `Bearer ${token}`, 'X-Institution-Id': institutionId };
            const params = new URLSearchParams({
                studtblId,
                academicYearId: selectedAcademicYearId,
                branchId: String(academic.branch_id ?? 2),
                semesterId: String(academic.semester ?? 6), // Keeping static as it's not provided by the endpoint dropdown, but usually inferred or passed anyway
                yearOfStudyId: String(academic.year_of_study_id ?? 3),
                sectionId: String(academic.section_id ?? 1),
                programmeId: String(academic.program_id ?? 1),
                semesterType: selectedSemesterType
            });

            try {
                const [histRes, subRes, dlRes, notesRes, attRes, statsRes] = await Promise.all([
                    fetch(`${API}/api/hallticket/history?studtblId=${encodeURIComponent(studtblId)}`, { headers }),
                    fetch(`${API}/api/hallticket/subject-details?${params}`, { headers }),
                    fetch(`${API}/api/hallticket/download-status?${params}`, { headers }),
                    fetch(`${API}/api/hallticket/notes`, { headers }),
                    fetch(`${API}/api/attendance/course-detail?${params}`, { headers }),
                    fetch(`${API}/api/dashboard/stats?studtblId=${encodeURIComponent(studtblId)}`, { headers })
                ]);

                const historyJson = await histRes.json().catch(() => null);
                const subjectsJson = await subRes.json().catch(() => null);
                const dlStatusJson = await dlRes.json().catch(() => null);
                const notesJson = await notesRes.json().catch(() => null);
                const attJson = await attRes.json().catch(() => null);
                const statsJson = await statsRes.json().catch(() => null);

                setData(prev => ({
                    ...prev,
                    history: historyJson,
                    subjects: subjectsJson,
                    downloadStatus: dlStatusJson,
                    notes: notesJson,
                    attendanceObj: attJson,
                    stats: statsJson
                }));
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        fetchAll();
    }, [studtblId, academic, selectedAcademicYearId, selectedSemesterType, API, token, institutionId]);

    // Derived states
    const subjectsList = data.subjects?.data || [];
    const historyList = data.history?.data || [];
    const isEligible = data.downloadStatus?.success === true;

    // Attendance percentage: use pre-calculated value from dashboard stats (same source as home section)
    // Fall back to computing from course hours if stats are unavailable
    const attendPctFromStats = data.stats?.attendance_percentage;
    const attendPctRaw = data.attendanceObj?.data?.reduce((acc: any, curr: any) => {
        acc.p += curr.present_hrs || 0;
        acc.t += curr.total_hrs || 0;
        return acc;
    }, { p: 0, t: 0 }) || { p: 0, t: 0 };
    const attendPctFromCourses = attendPctRaw.t > 0 ? ((attendPctRaw.p / attendPctRaw.t) * 100).toFixed(2) : null;
    const attendPct = attendPctFromStats != null
        ? Number(attendPctFromStats).toFixed(2)
        : (attendPctFromCourses ?? '0.00');

    // Parse History grouped by Semester
    const groupedHistory = useMemo(() => {
        const groups: Record<string, {
            semesterName: string;
            totalCredits: number;
            amountPaid: number;
            items: any[];
        }> = {};

        historyList.forEach((item: any) => {
            const sem = item.semester_Name || 'Unknown';
            if (!groups[sem]) {
                groups[sem] = {
                    semesterName: sem,
                    totalCredits: item.totalCreditPerSemester || 0,
                    amountPaid: item.totalFees || 0,
                    items: []
                };
            }
            groups[sem].items.push(item);
        });

        return Object.values(groups).sort((a, b) => b.semesterName.localeCompare(a.semesterName)); // Descending roughly
    }, [historyList]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
            <p className="text-slate-500 font-medium tracking-tight">Fetching HallTicket Details...</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto pb-20 space-y-4 sm:space-y-6">

            {/* Header Selectors (Dynamic Data) */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-600 font-bold p-2 bg-indigo-50 rounded-lg shrink-0">
                    <BookOpen size={20} /> Hall Ticket Configuration
                </div>
                <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Academic Year</span>
                        <select
                            value={selectedAcademicYearId}
                            onChange={(e) => setSelectedAcademicYearId(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-1.5 font-bold outline-none focus:border-indigo-500 transition-colors cursor-pointer hover:bg-slate-100"
                        >
                            {/* Unique Academic Years from endpoint */}
                            {Array.from(new Set(academicOptions.map(o => o.academicYearName))).map(name => {
                                const opt = academicOptions.find(o => o.academicYearName === name);
                                return <option key={name} value={opt?.academicYearId}>{name}</option>
                            })}
                            {academicOptions.length === 0 && <option value={academic?.academic_year_id ?? 14}>{academic?.current_academic_year || '2024-2025'}</option>}
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Semester Type</span>
                        <select
                            value={selectedSemesterType}
                            onChange={(e) => setSelectedSemesterType(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-1.5 font-bold outline-none focus:border-indigo-500 transition-colors cursor-pointer hover:bg-slate-100"
                        >
                            {/* Unique Semester Types from endpoint based on current active year */}
                            {Array.from(new Set(academicOptions.filter(o => String(o.academicYearId) === selectedAcademicYearId).map(o => o.semesterType))).map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                            {academicOptions.length === 0 && <option value={academic?.semester_type || 'Even'}>{academic?.semester_type || 'Even'}</option>}
                        </select>
                    </div>
                </div>
                {isEligible && (
                    <button onClick={() => window.print()} className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 text-sm sm:text-base">
                        <Download size={16} /> Download
                    </button>
                )}
            </div>

            {/* Custom Tabs */}
            <div className="flex items-center gap-6 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('current')}
                    className={`pb-3 font-bold text-sm sm:text-base border-b-2 transition-colors ${activeTab === 'current' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    Select subjects to appear
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`pb-3 font-bold text-sm sm:text-base border-b-2 transition-colors ${activeTab === 'history' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    History
                </button>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'current' ? (
                    <motion.div
                        key="current"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 lg:grid-cols-4 gap-6"
                    >
                        {/* Table View */}
                        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                                <h3 className="font-bold text-slate-700">Subjects</h3>
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-full">
                                    Credits {subjectsList.reduce((acc: number, cur: any) => acc + (cur.credit || 0), 0)}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="text-xs text-slate-500 bg-slate-50/50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">Semester</th>
                                            <th className="px-4 py-3 font-semibold">Course Code</th>
                                            <th className="px-4 py-3 font-semibold">Course Name</th>
                                            <th className="px-4 py-3 font-semibold text-center">Credit</th>
                                            <th className="px-4 py-3 font-semibold text-right">Fee</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {subjectsList.length > 0 ? subjectsList.map((sub: any, i: number) => {
                                            const isArrear = sub.attemptType?.toLowerCase() === 'arrear';
                                            return (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className={`px-4 py-3.5 font-bold ${isArrear ? 'text-rose-500' : 'text-indigo-600'}`}>{sub.semesterName}</td>
                                                    <td className={`px-4 py-3.5 font-bold ${isArrear ? 'text-rose-600' : 'text-slate-700'}`}>{sub.course_Code}</td>
                                                    <td className={`px-4 py-3.5 font-medium ${isArrear ? 'text-rose-600' : 'text-slate-600'} whitespace-normal min-w-[200px]`}>{sub.course_Name}</td>
                                                    <td className="px-4 py-3.5 font-bold text-slate-700 text-center">{sub.credit}</td>
                                                    <td className="px-4 py-3.5 font-bold text-rose-500 text-right">{sub.subjectAmountText || 'TBD'}</td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-medium">No subjects available for registration.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Status Sidebar */}
                        <div className="space-y-4">
                            <h3 className="font-extrabold text-indigo-900 text-lg px-1">Status</h3>
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-6">

                                <div className="flex gap-3">
                                    <div className="mt-1 flex-shrink-0 text-indigo-500"><User size={24} /></div>
                                    <div className="flex-1 space-y-1">
                                        <h4 className="text-sm font-bold text-indigo-900">Attendance</h4>
                                        <p className={`text-xl font-black tracking-tight ${parseFloat(attendPct as string) >= 75 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {attendPct}%
                                        </p>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-2">
                                            <div
                                                className={`h-full rounded-full ${parseFloat(attendPct as string) >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                                style={{ width: `${Math.min(100, Math.max(0, parseFloat(attendPct as string)))}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100 w-full" />

                                <div className="flex gap-3 items-center">
                                    <div className="flex-shrink-0 text-indigo-500"><CreditCard size={24} /></div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-indigo-900">Fees Due Amount</h4>
                                        <div className="flex items-center gap-1">
                                            <p className="text-emerald-500 font-bold whitespace-nowrap">No Due</p>
                                            <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={16} />
                                        </div>
                                        <p className="text-xs text-indigo-400 font-medium mt-0.5 whitespace-nowrap">Status Updated Today</p>
                                    </div>
                                </div>
                            </div>

                            {/* Important Notice */}
                            <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-5">
                                <h4 className="text-rose-600 font-bold flex items-center gap-2 mb-2">
                                    <AlertCircle size={16} /> Important Notice
                                </h4>
                                <p className="text-xs text-rose-500 leading-relaxed font-medium">
                                    {isEligible ? "You are eligible to download your hall ticket. Please verify all details." : "You are not eligible to apply for your semester hall ticket. Once resolved, you can proceed with your application. If you need help, please reach out to your mentor. Thank you!"}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                    >
                        {/* Native Table styling mimicking layout */}
                        <div className="overflow-x-auto pb-4">
                            <table className="w-full text-left text-sm align-top whitespace-nowrap">
                                <thead className="text-xs text-indigo-400 bg-white border-b border-indigo-100">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">Semester</th>
                                        <th className="px-4 py-4 font-bold">Date</th>
                                        <th className="px-4 py-4 font-bold">Course Code</th>
                                        <th className="px-4 py-4 font-bold">Course Details</th>
                                        <th className="px-4 py-4 font-bold text-center">Credit</th>
                                        <th className="px-4 py-4 font-bold text-right">Fee</th>
                                        <th className="px-4 py-4 font-bold pl-8">Mentor's Note</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {groupedHistory.map((group, gIdx) => (
                                        <React.Fragment key={gIdx}>
                                            {group.items.map((item, iIdx) => (
                                                <tr key={iIdx} className="hover:bg-slate-50/50 transition-colors">
                                                    {iIdx === 0 ? (
                                                        <td rowSpan={group.items.length} className="px-6 py-4 align-top border-r border-slate-100 bg-slate-50/30">
                                                            <div className="space-y-4 sticky top-4">
                                                                <h4 className="text-lg font-black text-indigo-600">{group.semesterName}</h4>
                                                                <div>
                                                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Credits</p>
                                                                    <p className="font-bold text-slate-800">{group.totalCredits}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Amount Paid</p>
                                                                    <p className="font-bold text-slate-800">₹ {group.amountPaid.toFixed(2)}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    ) : null}

                                                    <td className="px-4 py-4 font-medium text-slate-600">{item.examDateAndSession?.trim() || '--'}</td>
                                                    <td className="px-4 py-4 font-bold text-slate-700">{item.course_Code}</td>
                                                    <td className="px-4 py-4 font-bold text-slate-600 whitespace-normal min-w-[200px]">{item.course_Name}</td>
                                                    <td className="px-4 py-4 font-bold text-slate-700 text-center">{item.credit}</td>
                                                    <td className="px-4 py-4 font-bold text-slate-700 text-right">₹ {item.feeAmount?.toFixed(2) || '0.00'}</td>
                                                    <td className="px-4 py-4 pl-8">
                                                        {item.approved_Remarks && (
                                                            <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-3 flex gap-2 w-full max-w-[280px] whitespace-normal">
                                                                <div className="text-emerald-500 flex-shrink-0 mt-0.5">
                                                                    <BookOpen size={16} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-emerald-800 mb-1">{item.user_Name}</p>
                                                                    <p className="text-xs text-slate-500 leading-relaxed font-medium">{item.approved_Remarks}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                    {groupedHistory.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">No history available to display.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
