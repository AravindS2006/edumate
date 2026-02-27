'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, AlertCircle, Loader2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') : 'https://edumate-1-7nj8.onrender.com';

const fadeUp = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function AchievementsTab({ studtblId }: { studtblId: string }) {
    const [studies, setStudies] = useState<any[]>([]);
    const [amcat, setAmcat] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!studtblId) return;
            try {
                const token = localStorage.getItem('token');
                const institutionId = localStorage.getItem('institutionId') || 'SEC';
                const headers = {
                    Authorization: `Bearer ${token}`,
                    'X-Institution-Id': institutionId
                };
                const eid = encodeURIComponent(studtblId);

                const [studiesRes, amcatRes] = await Promise.all([
                    fetch(`${API}/api/profile/achievements/studies?studtblId=${eid}`, { headers }),
                    fetch(`${API}/api/profile/achievements/amcat?studtblId=${eid}&academicYearId=14`, { headers }) // Default academic year
                ]);

                if (studiesRes.ok) {
                    const studiesJson = await studiesRes.json();
                    setStudies(studiesJson?.data || studiesJson || []);
                }
                if (amcatRes.ok) {
                    const amcatJson = await amcatRes.json();
                    setAmcat(amcatJson?.data || amcatJson || []);
                }
            } catch (err) {
                setError('Network error loading achievements.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [studtblId]);

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
                <h3 className="text-xl font-bold text-slate-800 mb-2">Error Loading Achievements</h3>
                <p className="text-slate-500 max-w-sm">{error}</p>
            </div>
        );
    }

    const hasStudies = Array.isArray(studies) && studies.length > 0;
    const hasAmcat = Array.isArray(amcat) && amcat.length > 0;

    if (!hasStudies && !hasAmcat) {
        return (
            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-center">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                    <Award size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No Achievements Found</h3>
                <p className="text-slate-500 max-w-sm">There are no achievements or PGPA records available for your profile.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {hasStudies && (
                <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Award className="text-indigo-500" size={18} />
                        PGPA Achievements
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-4">
                        {studies.map((item, i) => (
                            <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <p className="text-[12px] font-bold text-slate-500 uppercase mb-2">Achievement</p>
                                <p className="text-[13px] sm:text-sm font-semibold text-slate-800 mb-1">{item.studiesName || item.activity_Name || item.Activity_Name || item.title || 'Details'}</p>
                                <p className="text-[11px] font-medium text-slate-500">Score: {item.score || item.Score || item.Date || 'N/A'}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {hasAmcat && (
                <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Award className="text-indigo-500" size={18} />
                        AMCAT Performance
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-4">
                        {amcat.map((item, i) => (
                            <div key={i} className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                                <p className="text-[12px] font-bold text-indigo-500 uppercase mb-2">AMCAT Metric</p>
                                <p className="text-[13px] sm:text-sm font-semibold text-slate-800 mb-1">{item.headerName || item.HeaderName || 'Metric'}</p>
                                <p className="text-[11px] font-bold text-indigo-600 border-t border-indigo-100/50 mt-2 pt-2">{item.value || item.Value || '0.00'}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
