'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Calendar, BookOpen, ExternalLink, Sparkles } from 'lucide-react';

export interface TimeSlotData {
  time: string;
  raw: string;
  courseCode: string;
  courseName: string;
  facultyInfo: string;
  isLab: boolean;
}

export interface DayTimetable {
  day: string;
  timeSlots: Record<string, string>;
}

interface TimetableCardProps {
  timetableData: DayTimetable[];
  loading?: boolean;
  onOpenFullModal?: () => void;
}

const DAYS_MAP: Record<number, string> = {
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
  6: 'SAT',
  0: 'MON' // fallback Sunday to Monday
};

function parseSlotString(raw: string): { courseCode: string; courseName: string; facultyInfo: string; isLab: boolean } {
  if (!raw) return { courseCode: '—', courseName: 'Free / Self Study', facultyInfo: '', isLab: false };

  // Format: "20CSPL601-AILABAILAB ~ 42524 ~ Artificial Intelligence Laboratory"
  // or "20ECPC603-WC ~ 42530"
  const parts = raw.split('~').map(s => s.trim());
  const firstPart = parts[0] || '';
  const faculty = parts[1] || '';
  const fullName = parts[2] || '';

  const dashIndex = firstPart.indexOf('-');
  const courseCode = dashIndex > -1 ? firstPart.substring(0, dashIndex) : firstPart;
  const shortName = dashIndex > -1 ? firstPart.substring(dashIndex + 1) : firstPart;
  const courseName = fullName || shortName || 'Course';

  const isLab = raw.toLowerCase().includes('lab') || courseCode.toLowerCase().includes('pl');

  return {
    courseCode,
    courseName,
    facultyInfo: faculty ? `Faculty: ${faculty}` : '',
    isLab
  };
}

export function TimetableCard({ timetableData, loading = false, onOpenFullModal }: TimetableCardProps) {
  // Current day
  const todayDayCode = useMemo(() => {
    const dayIndex = new Date().getDay();
    return DAYS_MAP[dayIndex] || 'MON';
  }, []);

  const [selectedDay, setSelectedDay] = useState<string>(todayDayCode);

  const availableDays = useMemo(() => {
    if (!timetableData || timetableData.length === 0) {
      return ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    }
    return timetableData.map(d => d.day);
  }, [timetableData]);

  const currentDayData = useMemo(() => {
    return timetableData?.find(d => d.day.toUpperCase() === selectedDay.toUpperCase());
  }, [timetableData, selectedDay]);

  const slotsList: TimeSlotData[] = useMemo(() => {
    if (!currentDayData || !currentDayData.timeSlots) return [];
    return Object.entries(currentDayData.timeSlots).map(([time, raw]) => {
      const parsed = parseSlotString(raw);
      return {
        time,
        raw,
        ...parsed
      };
    });
  }, [currentDayData]);

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              Class Timetable & Schedule
              {selectedDay === todayDayCode && (
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-700">
                  Today
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 font-medium">Daily lecture hours and laboratory sessions</p>
          </div>
        </div>

        {/* Day Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {availableDays.map(d => {
            const isSelected = selectedDay === d;
            const isToday = d === todayDayCode;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDay(d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all relative shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 bg-slate-100/70 hover:bg-slate-100'
                }`}
              >
                {d}
                {isToday && !isSelected && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots List */}
      <div className="p-4 sm:p-5">
        {loading ? (
          <div className="space-y-3 py-6">
            <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
          </div>
        ) : slotsList.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Calendar size={20} />
            </div>
            <p className="text-sm font-bold text-slate-700">No scheduled classes for {selectedDay}</p>
            <p className="text-xs text-slate-400">Enjoy your holiday or utilize this time for self study!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDay}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="space-y-2.5"
              >
                {slotsList.map((slot, index) => (
                  <div
                    key={index}
                    className={`p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      slot.isLab
                        ? 'border-purple-200/80 bg-purple-50/30 hover:bg-purple-50/60'
                        : 'border-slate-200/70 bg-white hover:border-indigo-200 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs shrink-0 flex items-center gap-1.5">
                        <Clock size={12} className="text-slate-400" />
                        <span>{slot.time}</span>
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-800">
                            {slot.courseName}
                          </span>
                          {slot.isLab ? (
                            <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-purple-100 text-purple-700">
                              Lab Session
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-slate-100 text-slate-600">
                              Theory
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                          <span className="font-semibold text-slate-600">{slot.courseCode}</span>
                          {slot.facultyInfo && (
                            <>
                              <span>•</span>
                              <span>{slot.facultyInfo}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Footer actions */}
        {onOpenFullModal && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Total periods today: {slotsList.length}</span>
            <button
              type="button"
              onClick={onOpenFullModal}
              className="text-cyan-600 hover:text-cyan-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>View Full Weekly Grid</span>
              <ExternalLink size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
