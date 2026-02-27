'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, AlertCircle, Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') : 'https://edumate-1-7nj8.onrender.com';

const fadeUp = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function AttendanceLogTab({ studtblId, academic }: { studtblId: string; academic: any }) {
    const [overall, setOverall] = useState<any>(null);
    const [leave, setLeave] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!studtblId || !academic) {
                if (!academic) setLoading(false);
                return;
            }
            try {
                const token = localStorage.getItem('token');
                const institutionId = localStorage.getItem('institutionId') || 'SEC';
                const headers = {
                    Authorization: `Bearer ${token}`,
                    'X-Institution-Id': institutionId
                };

                const params = new URLSearchParams({
                    studtblId: studtblId,
                    academicYearId: String(academic.academic_year_id || '14'),
                    branchId: String(academic.branch_id || ''),
                    yearOfStudyId: String(academic.year_of_study_id || ''),
                    semesterId: String(academic.semester_id || academic.semester || ''),
                    sectionId: String(academic.section_id || '')
                });

                const [overallRes, leaveRes] = await Promise.all([
                    fetch(`${API}/api/attendance/overall-detail?${params}`, { headers }).catch(() => null),
                    fetch(`${API}/api/attendance/leave-status?${params}`, { headers }).catch(() => null)
                ]);

                if (overallRes?.ok) {
                    const json = await overallRes.json();
                    setOverall(json?.data || json);
                }

                if (leaveRes?.ok) {
                    const json = await leaveRes.json();
                    setLeave(json?.data || json || []);
                }

                if (!overallRes?.ok && !leaveRes?.ok) {
                    setError('Failed to load attendance logs.');
                }
            } catch (err) {
                setError('Network error loading attendance logs.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [studtblId, academic]);

    if (!academic) {
        return (
            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-center">
                <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
                <p className="text-slate-500">Waiting for academic profile...</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-red-100 shadow-sm p-6 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Error Loading Attendance Log</h3>
                <p className="text-slate-500 max-w-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="text-indigo-500" size={18} />
                    Overall Semester Attendance
                </h3>

                {overall ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-1">Total Hours</p>
                            <p className="text-xl sm:text-2xl font-black text-slate-800">{overall.TotalWorkingHours || overall.total_hours || '0'}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-center">
                            <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-2"><CheckCircle2 size={14} /></div>
                            <p className="text-[10px] sm:text-xs font-bold text-green-700 uppercase mb-1">Present Hours</p>
                            <p className="text-xl sm:text-2xl font-black text-green-800">{overall.PresentHours || overall.present_hours || '0'}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-center">
                            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2"><Clock size={14} /></div>
                            <p className="text-[10px] sm:text-xs font-bold text-amber-700 uppercase mb-1">OD Hours</p>
                            <p className="text-xl sm:text-2xl font-black text-amber-800">{overall.ODHours || overall.od_hours || '0'}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-center">
                            <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2"><XCircle size={14} /></div>
                            <p className="text-[10px] sm:text-xs font-bold text-rose-700 uppercase mb-1">Absent Hours</p>
                            <p className="text-xl sm:text-2xl font-black text-rose-800">{overall.AbsentHours || overall.absent_hours || '0'}</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4 text-slate-500 text-sm font-medium">No overall attendance data available.</div>
                )}
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="text-indigo-500" size={18} />
                    Leave History
                </h3>

                {leave && leave.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 rounded-tl-xl">Date</th>
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Type</th>
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Reason</th>
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Status</th>
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 rounded-tr-xl">Hours</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leave.map((record, index) => (
                                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-4 text-sm font-bold text-slate-700 whitespace-nowrap">{record.fromDate || record.Date || record.ApplicationDate || '-'}</td>
                                        <td className="py-3 px-4 text-xs font-bold tracking-wide uppercase">
                                            <span className={`px-2 py-0.5 rounded-md ${record.leaveType?.includes('OD') || record.TypeOfLeave?.includes('OD') ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {record.leaveType || record.TypeOfLeave || 'Absent'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm font-medium text-slate-600 max-w-[200px] truncate">{record.reason || record.Reason || '-'}</td>
                                        <td className="py-3 px-4 text-xs font-bold tracking-wide uppercase text-slate-500">{record.status || record.Status || 'Applied'}</td>
                                        <td className="py-3 px-4 text-sm font-medium text-slate-800">{record.noOfHours || record.TotalDays || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-sm font-medium">No leave history found for the current semester.</div>
                )}
            </motion.div>
        </div>
    );
}
