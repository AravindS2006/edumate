'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Play, ShieldAlert, CheckCircle2, AlertCircle, Copy } from 'lucide-react';

export default function DebugSIT() {
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(0);

    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const runDiagnostics = async () => {
        if (!confirm("This will make live API calls using your current session. Continue?")) return;

        setLoading(true);
        setLogs([]);
        setStep(1);
        addLog("🚀 Starting SIT Diagnostics...");

        const token = localStorage.getItem('token');
        const studtblId = localStorage.getItem('studtblId');
        const institutionId = localStorage.getItem('institutionId');

        addLog(`📍 Config: Inst=${institutionId}, ID=${studtblId ? studtblId.substring(0, 5) + '...' : 'Missing'}`);

        if (!token || !studtblId) {
            addLog("❌ Error: No valid session found. Please log in first.");
            setLoading(false);
            return;
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'X-Institution-Id': institutionId || 'SEC'
        };

        try {
            // STEP 0: HEALTH CHECK
            addLog("\n🔍 STEP 0: Checking API Health...");
            try {
                const healthRes = await fetch('/api/health');
                addLog(`✅ API Health Status: ${healthRes.status} ${healthRes.statusText}`);
                if (!healthRes.ok) {
                    const text = await healthRes.text();
                    addLog(`❌ API Health Response: ${text.substring(0, 100)}`);
                    setLoading(false);
                    return;
                }
            } catch (hErr: any) {
                addLog(`❌ API Unreachable: ${hErr.message}`);
                setLoading(false);
                return;
            }

            // STEP 1: ACADEMIC DETAILS
            addLog("\n🔍 STEP 1: Fetching Academic Details...");
            const acadRes = await fetch(`/api/student/academic?studtblId=${encodeURIComponent(studtblId)}`, { headers });
            addLog(`📡 Response Status: ${acadRes.status} ${acadRes.statusText}`);

            let acadJson;
            const acadText = await acadRes.text();
            try {
                acadJson = JSON.parse(acadText);
            } catch (e) {
                addLog(`❌ Failed to parse Academic JSON. Response: ${acadText.substring(0, 100)}...`);
                setLoading(false);
                return;
            }

            if (acadRes.ok) {
                addLog("✅ Academic Data Received:");
                addLog(JSON.stringify(acadJson, null, 2));
                setStep(2);

                const { semester, academic_year_id, branch_id, year_of_study_id, section_id } = acadJson;

                if (academic_year_id) {
                    const params = new URLSearchParams({
                        studtblId,
                        academicYearId: String(academic_year_id),
                        branchId: String(branch_id),
                        semesterId: String(semester),
                        yearOfStudyId: String(year_of_study_id),
                        sectionId: String(section_id)
                    });

                    // STEP 2: DAILY ATTENDANCE
                    addLog(`\n🔍 STEP 2: Testing Daily Attendance (Year=${academic_year_id}, Sem=${semester})...`);
                    const attRes = await fetch(`/api/attendance/daily-detail?${params}`, { headers });
                    if (attRes.ok) {
                        const attJson = await attRes.json();
                        addLog(`✅ Attendance Status: ${attRes.status}`);
                        const items = attJson.data || attJson;
                        if (Array.isArray(items) && items.length > 0) {
                            addLog(`📦 Daily Item Keys: ${Object.keys(items[0]).join(', ')}`);
                            addLog(`📝 Sample Item: ${JSON.stringify(items[0])}`);
                        } else {
                            addLog(`⚠️ Daily Data is empty or not an array.`);
                        }
                    } else {
                        addLog(`❌ Attendance Failed: ${attRes.status}`);
                    }

                    // STEP 2b: COURSE ATTENDANCE
                    addLog(`\n🔍 STEP 2b: Testing Course-wise Attendance...`);
                    const courseRes = await fetch(`/api/attendance/course-detail?${params}`, { headers });
                    if (courseRes.ok) {
                        const courseJson = await courseRes.json();
                        addLog(`✅ Course Data Status: ${courseRes.status}`);
                        const items = courseJson.data || courseJson;
                        if (Array.isArray(items) && items.length > 0) {
                            addLog(`📦 Course Item Keys: ${Object.keys(items[0]).join(', ')}`);
                            addLog(`📝 Sample Item: ${JSON.stringify(items[0])}`);
                        } else {
                            addLog(`⚠️ Course Data is empty.`);
                        }
                    } else {
                        addLog(`❌ Course Data Failed: ${courseRes.status}`);
                    }
                } else {
                    addLog("⚠️ Skipping Step 2: academic_year_id missing in Step 1.");
                }
            } else {
                addLog(`❌ Academic Fetch Error: ${acadRes.status}`);
            }

            // STEP 3: REPORT MENU
            addLog("\n🔍 STEP 3: Fetching Report Menu...");
            const repRes = await fetch(`/api/reports/menu`, { headers });
            if (repRes.ok) {
                const repJson = await repRes.json();
                addLog(`✅ Report Menu: Found ${repJson?.data?.length || 0} categories.`);

                // STEP 3b: CAT REPORT FILTERS
                addLog("\n🔍 STEP 3b: Fetching CAT Report Filters...");
                const catRes = await fetch(`/api/reports?type=cat&studtblId=${encodeURIComponent(studtblId)}`, { headers });
                if (catRes.ok) {
                    const catJson = await catRes.json();
                    addLog(`📦 CAT Filter Payload: ${JSON.stringify(catJson).substring(0, 300)}...`);
                } else {
                    addLog(`❌ CAT Filter Failed: ${catRes.status}`);
                }
            } else {
                addLog(`❌ Report Menu Failed: ${repRes.status}`);
            }

            setStep(3);
            addLog("\n🏁 Diagnostics Completed.");

        } catch (e: any) {
            addLog(`\n💥 CRITICAL ERROR: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const copyLogs = () => {
        navigator.clipboard.writeText(logs.join('\n'));
        alert("Logs copied to clipboard!");
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 font-mono">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-emerald-400 flex items-center gap-3">
                            <Terminal size={28} /> SIT Debug Console
                        </h1>
                        <p className="text-slate-500 mt-2">Run this tool to diagnose API compatibility issues.</p>
                    </div>
                    <button
                        onClick={runDiagnostics}
                        disabled={loading}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'}`}
                    >
                        {loading ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <Play size={18} />}
                        {loading ? 'Running...' : 'Run Diagnostics'}
                    </button>
                </div>

                {/* Info Box */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex gap-4">
                    <ShieldAlert className="text-amber-400 flex-shrink-0" />
                    <div className="text-sm text-slate-400 space-y-1">
                        <p className="font-bold text-slate-300">Privacy Notice</p>
                        <p>This tool makes real API calls using your session. It does not store passwords.</p>
                        <p>Please copy the logs below and share them with the developer to fix the SIT compatibility issues.</p>
                    </div>
                </motion.div>

                {/* Log Window */}
                <div className="relative group">
                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={copyLogs} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors" title="Copy logs">
                            <Copy size={16} />
                        </button>
                    </div>
                    <div className="h-[600px] rounded-xl bg-black border border-slate-800 p-4 overflow-y-auto whitespace-pre-wrap text-xs md:text-sm leading-relaxed shadow-2xl shadow-black">
                        {logs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-700 gap-4">
                                <Terminal size={48} />
                                <p>Ready to trace. Click "Run Diagnostics" to begin.</p>
                            </div>
                        ) : (
                            logs.map((log, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`${log.includes('❌') || log.includes('💥') ? 'text-red-400' : log.includes('✅') ? 'text-emerald-400' : log.includes('⚠️') ? 'text-amber-400' : 'text-slate-300'} border-b border-white/5 py-1`}
                                >
                                    {log}
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* Progress Indicators */}
                <div className="grid grid-cols-3 gap-4">
                    <StatusStep step={1} current={step} label="Fetch API IDs" />
                    <StatusStep step={2} current={step} label="Test Attendance" />
                    <StatusStep step={3} current={step} label="Test Reports" />
                </div>
            </div>
        </div>
    );
}

function StatusStep({ step, current, label }: { step: number; current: number; label: string }) {
    const status = current > step ? 'complete' : current === step ? 'active' : 'pending';
    const colors = {
        complete: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        active: 'bg-blue-500/10 border-blue-500/30 text-blue-400 animate-pulse',
        pending: 'bg-slate-800/50 border-slate-800 text-slate-600'
    };

    return (
        <div className={`p-3 rounded-lg border text-center text-xs font-bold transition-colors ${colors[status]}`}>
            <div className="flex items-center justify-center gap-2">
                {status === 'complete' ? <CheckCircle2 size={14} /> : status === 'active' ? <AlertCircle size={14} /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-current opacity-30" />}
                {label}
            </div>
        </div>
    );
}
