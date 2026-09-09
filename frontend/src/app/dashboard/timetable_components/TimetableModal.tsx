'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Calendar, Printer, BookOpen } from 'lucide-react';
import { DayTimetable, TimeSlotData } from './TimetableCard';

interface TimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  timetableData: DayTimetable[];
  studentInfo?: {
    name?: string;
    regNo?: string;
    branch?: string;
    semester?: string | number;
    section?: string;
  };
}

const ALL_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function TimetableModal({ isOpen, onClose, timetableData, studentInfo }: TimetableModalProps) {
  const [activeDay, setActiveDay] = useState<string>('ALL');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const filteredDays: DayTimetable[] = activeDay === 'ALL'
    ? (timetableData?.length ? timetableData : ALL_DAYS.map(d => ({ day: d, timeSlots: {} })))
    : timetableData.filter(d => d.day.toUpperCase() === activeDay.toUpperCase());

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
        >
          {/* Top Bar */}
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-600">
                <Clock size={22} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                  Master Weekly Timetable
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {studentInfo?.branch || 'Engineering'} • Semester {studentInfo?.semester || '—'} {studentInfo?.section ? `(Sec ${studentInfo.section})` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                title="Print Timetable"
              >
                <Printer size={15} />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-white flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveDay('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeDay === 'ALL'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 bg-slate-100/70 hover:bg-slate-100'
              }`}
            >
              All Days
            </button>
            {ALL_DAYS.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => setActiveDay(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeDay === day
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 bg-slate-100/70 hover:bg-slate-100'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Timetable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {filteredDays.map((dayItem) => {
              const slots = Object.entries(dayItem.timeSlots || {}) as [string, string][];
              return (
                <div key={dayItem.day} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                      {dayItem.day}
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">({slots.length} periods)</span>
                  </div>

                  {slots.length === 0 ? (
                    <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-400 font-medium">
                      No periods scheduled for this day.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {slots.map(([time, rawText], idx) => {
                        const rawStr = String(rawText || '');
                        const parts = rawStr.split('~').map((s: string) => s.trim());
                        const codeTitle = parts[0] || '—';
                        const faculty = parts[1] || '';
                        const fullName = parts[2] || '';
                        const isLab = rawStr.toLowerCase().includes('lab');

                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
                              isLab
                                ? 'border-purple-200 bg-purple-50/30'
                                : 'border-slate-200/80 bg-white hover:border-cyan-200'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Clock size={11} className="text-slate-400" />
                                  {time}
                                </span>
                                {isLab ? (
                                  <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-purple-100 text-purple-700">
                                    Lab
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-slate-100 text-slate-500">
                                    Theory
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-extrabold text-slate-800 leading-snug line-clamp-2">
                                {fullName || codeTitle}
                              </div>
                              <div className="text-[11px] font-semibold text-slate-500 truncate">
                                {codeTitle}
                              </div>
                            </div>
                            {faculty && (
                              <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] font-medium text-slate-400 truncate">
                                Faculty: {faculty}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Bar */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>Sairam College ERP Academic Timetable</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
