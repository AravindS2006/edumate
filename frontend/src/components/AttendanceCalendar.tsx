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
    // Helper to format date as YYYY-MM-DD
    const formatDateKey = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Process data into a map for easy lookup
    const attendanceMap = useMemo(() => {
        const map = new Map<string, DailyAttendance>();
        (dailyData || []).forEach(item => {
            if (!item?.attendanceDate) return;
            // API date might be YYYY-MM-DDT00:00:00, ensure we just get YYYY-MM-DD
            const key = String(item.attendanceDate).split('T')[0];
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
            let statusColor = 'bg-slate-100 text-slate-400'; // Default
            let isAbsent = false;
            let isPresent = false;
            let isHoliday = false;

            if (data?.attendance && typeof data.attendance === 'object') {
                const statuses = Object.values(data.attendance);
                // Normalize status check
                const isStatusPresent = (s: string) => ['P', 'Present'].some(v => s && s.toUpperCase().startsWith(v.toUpperCase()));
                const isStatusAbsent = (s: string) => ['A', 'Ab', 'Absent', 'L', 'Leave'].some(v => s && s.toUpperCase().startsWith(v.toUpperCase()));
                const isStatusOD = (s: string) => ['OD', 'On Duty'].some(v => s && s.toUpperCase().startsWith(v.toUpperCase()));

                const presentCount = statuses.filter(s => isStatusPresent(s)).length;
                const absentCount = statuses.filter(s => isStatusAbsent(s)).length;
                const odCount = statuses.filter(s => isStatusOD(s)).length;

                if (odCount > 0 && absentCount === 0 && presentCount === 0) {
                    statusColor = 'bg-purple-500/20 text-purple-400 border border-purple-500/30'; // Full OD
                    isPresent = true; // Still counts as present for dots
                } else if (absentCount > 0 && (presentCount > 0 || odCount > 0)) {
                    statusColor = 'bg-orange-500/20 text-orange-400 border border-orange-500/30'; // Partial
                    isAbsent = true;
                } else if (absentCount > 0) {
                    statusColor = 'bg-red-500/20 text-red-400 border border-red-500/30'; // Full Absent
                    isAbsent = true;
                } else if (presentCount > 0 || odCount > 0) {
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
            ${isSelected ? 'ring-2 ring-indigo-400 shadow-lg shadow-purple-500/20 z-10' : ''}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Calendar View */}
            <div className="md:col-span-2 bg-white border border-slate-200/60 shadow-lg shadow-slate-100/50 rounded-2xl p-4 sm:p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <CalendarIcon className="text-purple-400" size={20} />
                        {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Days Header */}
                <div className="grid grid-cols-7 mb-4">
                    {DAYS.map(day => (
                        <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2 sm:gap-3">
                    {renderCalendarDays()}
                </div>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-4 justify-center">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" /> Present
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-3 h-3 rounded-full bg-rose-500" /> Absent
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-3 h-3 rounded-full bg-purple-500" /> On Duty
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-3 h-3 rounded-full bg-amber-500" /> Holiday
                    </div>
                </div>
            </div>

            {/* Detail View (Side Panel) */}
            <div className="bg-white border border-slate-200/60 shadow-lg shadow-slate-100/50 rounded-2xl p-6 flex flex-col h-full">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
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
                            <div className="text-sm text-slate-400 mb-4 font-mono border-b border-slate-200 pb-2">
                                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>

                            {selectedDayData?.attendance && typeof selectedDayData.attendance === 'object' ? (
                                <div className="space-y-3">
                                    {Object.entries(selectedDayData.attendance).map(([period, status]) => (
                                        <div key={period} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-300 transition-colors">
                                            <span className="text-slate-600 font-medium">Period {period}</span>
                                            {['P', 'Present', 'OD', 'On Duty'].some(v => status && status.toUpperCase().startsWith(v.toUpperCase())) ? (
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.toUpperCase().includes('OD') ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {status.toUpperCase().includes('OD')
                                                        ? (status.includes('-') ? status.split('-')[1].trim() : 'On Duty')
                                                        : 'Present'}
                                                </span>
                                            ) : ['A', 'Ab', 'Absent', 'L', 'Leave'].some(v => status && status.toUpperCase().startsWith(v.toUpperCase())) ? (
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                                    Absent
                                                </span>
                                            ) : (
                                                <span className="text-slate-600 text-xs italic">{status || 'No Data'}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                                        <CalendarIcon size={24} className="opacity-50" />
                                    </div>
                                    <span>No data for this date</span>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="no-selection"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 text-sm italic h-64"
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
