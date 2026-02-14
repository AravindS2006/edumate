import React from 'react';
import { motion } from 'framer-motion';

interface CourseData {
    id: number;
    courseId: number;
    courseCode: string;
    courseName: string;
    attendancePercentage: number;
}

interface CourseAttendanceProps {
    courses: CourseData[];
    loading: boolean;
}

export function CourseAttendance({ courses, loading }: CourseAttendanceProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-40 rounded-2xl bg-white border border-slate-100 animate-pulse" />
                ))}
            </div>
        );
    }

    if (!courses || courses.length === 0) {
        return null; // Don't show anything if no data
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {courses.map((course, index) => (
                <CourseGauge key={course.courseId || index} course={course} index={index} />
            ))}
        </div>
    );
}

function CourseGauge({ course, index }: { course: any; index: number }) {
    const percentage = course?.attendancePercentage ?? 0;

    // Gradient colors based on percentage (inline to avoid styled-jsx issues)
    const color1 = percentage >= 85 ? '#34d399' : percentage >= 75 ? '#818cf8' : percentage >= 65 ? '#fbbf24' : '#fb7185';
    const color2 = percentage >= 85 ? '#14b8a6' : percentage >= 75 ? '#06b6d4' : percentage >= 65 ? '#f59e0b' : '#f43f5e';

    const gradientId = `gaugeGrad-${course?.courseCode ?? 'c'}-${index}`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col items-center gap-3 hover:shadow-xl hover:shadow-slate-200/50 transition-all hover:-translate-y-1"
        >
            <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={color1} />
                            <stop offset="100%" stopColor={color2} />
                        </linearGradient>
                    </defs>
                    <circle
                        cx="50" cy="50" r="44"
                        fill="none"
                        stroke="rgba(0,0,0,0.03)"
                        strokeWidth="8"
                    />
                    <motion.circle
                        cx="50" cy="50" r="44"
                        fill="none"
                        stroke={`url(#${gradientId})`}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={276.4}
                        initial={{ strokeDashoffset: 276.4 }}
                        animate={{ strokeDashoffset: 276.4 - (276.4 * percentage) / 100 }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 + index * 0.05 }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl sm:text-2xl font-black text-slate-800 tabular-nums">{Math.round(percentage)}%</span>
                </div>
            </div>

            <div className="text-center">
                <p className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider mb-1 group-hover:scale-105 transition-transform">
                    {course?.courseCode ?? '—'}
                </p>
                <p className="text-[11px] sm:text-xs font-bold text-slate-600 line-clamp-2 leading-tight px-1">
                    {course?.courseName ?? '—'}
                </p>
            </div>
        </motion.div>
    );
}
