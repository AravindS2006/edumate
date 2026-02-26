'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, AlertCircle, Loader2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const fadeUp = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function CourseDetailsTab({ studtblId, academic }: { studtblId: string; academic: any }) {
    const [courses, setCourses] = useState<any[]>([]);
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

                // Typical required query params for student course details based on Sairam API expectations
                const params = new URLSearchParams({
                    studtblId: studtblId,
                    regulationId: String(academic.regulation_id || '12'),
                    branchId: String(academic.branch_id || ''),
                    semesterId: String(academic.semester_id || academic.semester || ''),
                    pageNumber: '1',
                    pageSize: '100'
                });

                const res = await fetch(`${API}/api/profile/course-details?${params}`, { headers });

                if (res.ok) {
                    const json = await res.json();
                    setCourses(json?.data || json || []);
                } else {
                    setError('Failed to load course details.');
                }
            } catch (err) {
                setError('Network error loading courses.');
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
                <h3 className="text-xl font-bold text-slate-800 mb-2">Error Loading Courses</h3>
                <p className="text-slate-500 max-w-sm">{error}</p>
            </div>
        );
    }

    const hasCourses = Array.isArray(courses) && courses.length > 0;

    if (!hasCourses) {
        return (
            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-center">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                    <BookOpen size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No Courses Found</h3>
                <p className="text-slate-500 max-w-sm">No course details are available for the current semester.</p>
            </div>
        );
    }

    return (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="text-indigo-500" size={18} />
                Semester Course Plan
            </h3>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 rounded-tl-xl text-center">S.No</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Subject Code</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Subject Name</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 text-center">Credits</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 rounded-tr-xl">Type</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {courses.map((course, index) => {
                            const code = course.subjectCode || course.SubjectCode || course.courseCode || course.CourseCode || course.subject_code || 'N/A';
                            const name = course.subjectName || course.SubjectName || course.courseName || course.CourseName || course.subject_name || 'Unknown';
                            const creds = course.credits || course.Credits || course.credit || course.Credit || '-';
                            const type = course.subjectType || course.SubjectType || course.courseType || course.CourseType || course.subject_type || 'Core';

                            return (
                                <tr key={index} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-4 text-sm font-medium text-slate-600 text-center">{index + 1}</td>
                                    <td className="py-3 px-4 text-sm font-bold text-indigo-700">{code}</td>
                                    <td className="py-3 px-4 text-sm font-medium text-slate-800">{name}</td>
                                    <td className="py-3 px-4 text-sm font-medium text-slate-600 text-center">{creds}</td>
                                    <td className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">{type}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
}
