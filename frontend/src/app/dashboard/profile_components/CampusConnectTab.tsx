'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertCircle, Loader2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const fadeUp = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function CampusConnectTab({ studtblId }: { studtblId: string }) {
    const [data, setData] = useState<any>(null);
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
                const res = await fetch(`${API}/api/profile/identifiers?studtblId=${encodeURIComponent(studtblId)}`, { headers });

                if (res.ok) {
                    const json = await res.json();
                    const identData = json?.data?.[0] || json?.[0] || json?.data || json;
                    setData(identData);
                } else {
                    setError('Failed to load campus connect identifiers.');
                }
            } catch (err) {
                setError('Network error loading identifiers.');
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
                <h3 className="text-xl font-bold text-slate-800 mb-2">Error Loading Identifiers</h3>
                <p className="text-slate-500 max-w-sm">{error}</p>
            </div>
        );
    }

    if (!data || Object.keys(data).length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-center">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                    <Activity size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No Data Available</h3>
                <p className="text-slate-500 max-w-sm">There are no Campus Connect identifiers mapped to your profile.</p>
            </div>
        );
    }

    // Dynamically map all properties
    const identifiersList = Object.entries(data)
        .filter(([_, val]) => typeof val === 'string' || typeof val === 'number')
        .map(([key, val]) => {
            // Add spaces before capital letters and uppercase
            const formattedLabel = key.replace(/([A-Z])/g, ' $1').trim().toUpperCase();
            // Handle some specific known abbreviations better
            const finalLabel = formattedLabel === 'ABCID' ? 'ABC ID' :
                formattedLabel === 'UMIS ID' || formattedLabel === 'OMIS ID' ? 'UMIS ID' :
                    formattedLabel === 'NPTEL EMAIL ID' ? 'NPTEL EMAIL ID' :
                        formattedLabel === 'FIT INDIA ID' ? 'FIT INDIA ID' :
                            formattedLabel;

            return {
                label: finalLabel,
                value: String(val)
            };
        });

    return (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Activity className="text-indigo-500" size={18} />
                Campus Connect Identifiers
            </h3>

            {identifiersList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-4">
                    {identifiersList.map((item, i) => (
                        <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-2">{item.label}</p>
                            <p className="text-[14px] sm:text-base font-bold text-indigo-700 tracking-wide">{item.value}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-slate-50 rounded-xl p-4 overflow-x-auto text-xs text-slate-600 font-mono">
                    <pre>{JSON.stringify(data, null, 2)}</pre>
                </div>
            )}
        </motion.div>
    );
}
