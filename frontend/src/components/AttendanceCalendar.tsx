import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, XCircle, CheckCircle2, AlertCircle } from 'lucide-react';

interface DailyAttendance {
    attendanceDate: string;
    attendance: Record<string, string>; // "1": "P", "2": "A" etc.
}

interface LeaveRecord {
    fromDate: string;
    toDate: string;
    reasonName: string;
    leaveStatus: string;
}

interface AttendanceCalendarProps {
    dailyData: DailyAttendance[];
    leaveData: LeaveRecord[];
    loading: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export function AttendanceCalendar({ dailyData, leaveData, loading }: AttendanceCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Helper to format date as YYYY-MM-DD
    const formatDateKey = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    // Process data into a map for easy lookup
    const attendanceMap = useMemo(() => {
        const map = new Map<string, DailyAttendance>();
        dailyData.forEach(item => {
            // API date might be YYYY-MM-DDT00:00:00, ensure we just get YYYY-MM-DD
            const key = item.attendanceDate.split('T')[0];
            map.set(key, item);
        });
        return map;
    }, [dailyData]);

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        setSelectedDate(null);
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        setSelectedDate(null);
    };

    const renderCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const blanks = Array(firstDay).fill(null);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        return [...blanks, ...days].map((day, index) => {
            if (!day) return <div key={`blank-${index}`} className="h-10 w-10" />;

            const dateObj = new Date(year, month, day);
            const dateKey = formatDateKey(dateObj);
            const data = attendanceMap.get(dateKey);

            // Determine Status
            let statusColor = 'bg-slate-800/50 text-slate-400'; // Default
            let isAbsent = false;
            let isPresent = false;
            let isHoliday = false;

            if (data) {
                const statuses = Object.values(data.attendance);
                const presentCount = statuses.filter(s => s === 'P' || s === 'OD').length;
                const absentCount = statuses.filter(s => s === 'A').length;

                if (absentCount > 0 && presentCount > 0) {
                    statusColor = 'bg-orange-500/20 text-orange-400 border border-orange-500/30'; // Partial
                    isAbsent = true;
                } else if (absentCount > 0) {
                    statusColor = 'bg-red-500/20 text-red-400 border border-red-500/30'; // Full Absent
                    isAbsent = true;
                } else if (presentCount > 0) {
                    statusColor = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'; // Full Present
                    isPresent = true;
                } else {
                    // Likely holiday or no class
                    statusColor = 'bg-blue-500/10 text-blue-400';
                    isHoliday = true;
                }
            }

            const isSelected = selectedDate === dateKey;

            return (
                <motion.button
                    key={dateKey}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDate(dateKey)}
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors relative
            ${isSelected ? 'ring-2 ring-white shadow-lg shadow-purple-500/20 z-10' : ''}
            ${statusColor}
          `}
                >
                    {day}
                    {/* Dot indicators */}
                    <div className="absolute -bottom-1 flex gap-0.5">
                        {isAbsent && <div className="w-1 h-1 rounded-full bg-red-500" />}
                        {isPresent && <div className="w-1 h-1 rounded-full bg-emerald-500" />}
                    </div>
                </motion.button>
            );
        });
    };

    // Get details for selected date
    const selectedDayData = selectedDate ? attendanceMap.get(selectedDate) : null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Calendar View */}
            <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <CalendarIcon className="text-purple-400" size={20} />
                        {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-full text-slate-300 transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-full text-slate-300 transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Days Header */}
                <div className="grid grid-cols-7 mb-4 text-center">
                    {DAYS.map(day => (
                        <div key={day} className="text-xs font-bold text-slate-500 uppercase tracking-wider py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-y-4 justify-items-center">
                    {loading ? (
                        // Skeleton loader for grid
                        Array.from({ length: 35 }).map((_, i) => (
                            <div key={i} className="h-10 w-10 rounded-full bg-white/5 animate-pulse" />
                        ))
                    ) : (
                        renderCalendarDays()
                    )}
                </div>

                {/* Legend */}
                <div className="mt-8 flex gap-4 justify-center text-xs text-slate-400">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Present</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Absent</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500" /> Partial</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400" /> Holiday</div>
                </div>
            </div>

            {/* Detail View (Side Panel) */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col h-full rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="text-blue-400" size={18} />
                    Daily Breakdown
                </h3>

                <AnimatePresence mode="wait">
                    {selectedDate ? (
                        <motion.div
                            key={selectedDate}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex-1"
                        >
                            <div className="text-sm text-slate-400 mb-4 font-mono border-b border-white/10 pb-2">
                                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>

                            {selectedDayData ? (
                                <div className="space-y-3">
                                    {Object.entries(selectedDayData.attendance).map(([period, status]) => (
                                        <div key={period} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/20 transition-colors">
                                            <span className="text-slate-300 font-medium">Period {period}</span>
                                            {status === 'P' || status === 'OD' ? (
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${status === 'OD' ? 'bg-purple-500/20 text-purple-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                                    {status === 'OD' ? 'On Duty' : 'Present'}
                                                </span>
                                            ) : status === 'A' ? (
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300">
                                                    Absent
                                                </span>
                                            ) : (
                                                <span className="text-slate-600 text-xs italic">No Class</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
                                    <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center">
                                        <CalendarIcon size={24} className="opacity-50" />
                                    </div>
                                    <span>No data for this date</span>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-64 text-slate-500 text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                                <CalendarIcon size={32} className="text-blue-400/50" />
                            </div>
                            <p>Select a date to view <br /> period-wise details</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
