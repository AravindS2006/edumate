'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Search, Calendar, Award, CheckCircle2, XCircle, FileText, Download, Building2, Users, ArrowRight } from 'lucide-react';

export interface InterviewDrive {
  interviewId: number;
  companyName: string;
  companyCode?: string;
  interviewDate?: string;
  applyLastDate?: string;
  salaryPackage?: string;
  ugcgpa?: number;
  historyOfArrear?: number;
  tenthPercentage?: number;
  twelthPercentage?: number;
  interviewProcess?: string;
  status?: string;
  [key: string]: any;
}

interface PlacementViewProps {
  interviewsData?: InterviewDrive[];
  studentCgpa?: number;
  studentArrears?: number;
  resumeData?: any;
  loading?: boolean;
}

export function PlacementView({
  interviewsData = [],
  studentCgpa = 0,
  studentArrears = 0,
  resumeData,
  loading = false
}: PlacementViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ELIGIBLE'>('ALL');

  const drivesWithEligibility = useMemo(() => {
    return (interviewsData || []).map(drive => {
      const minCgpa = Number(drive.ugcgpa || 0);
      const maxArrears = Number(drive.historyOfArrear ?? 99);

      const isCgpaEligible = minCgpa === 0 || studentCgpa >= minCgpa;
      const isArrearsEligible = studentArrears <= maxArrears;
      const isEligible = isCgpaEligible && isArrearsEligible;

      return {
        ...drive,
        isEligible,
        minCgpa,
        maxArrears
      };
    });
  }, [interviewsData, studentCgpa, studentArrears]);

  const filteredDrives = useMemo(() => {
    return drivesWithEligibility.filter(d => {
      const matchesSearch = !searchTerm ||
        (d.companyName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (d.companyCode?.toLowerCase() || '').includes(searchTerm.toLowerCase());

      const matchesFilter = filter === 'ALL' || d.isEligible;

      return matchesSearch && matchesFilter;
    });
  }, [drivesWithEligibility, searchTerm, filter]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-violet-500/10 text-violet-600">
              <Briefcase size={28} />
            </span>
            Training & Placement Hub
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Campus recruitment drives, interview schedules, and personalized eligibility tracking.
          </p>
        </div>

        {/* Student Placement Status Pill */}
        <div className="flex items-center gap-2 p-2 px-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-xs font-bold text-slate-700 shrink-0">
          <span>Your CGPA: <strong className="text-indigo-600 font-black">{studentCgpa.toFixed(2)}</strong></span>
          <span className="text-slate-300">•</span>
          <span>Arrears: <strong className={studentArrears === 0 ? "text-emerald-600 font-black" : "text-rose-600 font-black"}>{studentArrears}</strong></span>
        </div>
      </div>

      {/* Resume Card Banner */}
      <div className="p-4 sm:p-5 rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-500/20">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Student Master Resume & Profile
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Verified by Sairam Training & Placement Cell for all ongoing recruitment cycles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
            Profile Active
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search companies (e.g. Photon, Zoho, MRF)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-medium focus:outline-none focus:border-violet-500 transition-colors shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'ALL'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All Drives ({drivesWithEligibility.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('ELIGIBLE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === 'ELIGIBLE'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Eligible Only ({drivesWithEligibility.filter(d => d.isEligible).length})
          </button>
        </div>
      </div>

      {/* Drives Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-56 bg-slate-100 rounded-3xl animate-pulse" />
          <div className="h-56 bg-slate-100 rounded-3xl animate-pulse" />
          <div className="h-56 bg-slate-100 rounded-3xl animate-pulse" />
        </div>
      ) : filteredDrives.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-slate-200/70 bg-white shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Building2 size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-800">No recruitment drives found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm ? `No companies matching "${searchTerm}"` : "Placement cell hasn't published new drives for this semester yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredDrives.map((drive) => (
              <motion.div
                key={drive.interviewId}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-5 rounded-3xl border border-slate-200/70 bg-white hover:border-violet-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top line: Eligibility tag & Package */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                      drive.isEligible
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {drive.isEligible ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      <span>{drive.isEligible ? 'Eligible' : 'Ineligible'}</span>
                    </span>

                    {drive.salaryPackage && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs">
                        {drive.salaryPackage}
                      </span>
                    )}
                  </div>

                  {/* Company Name */}
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 leading-snug">
                      {drive.companyName}
                    </h3>
                    {drive.companyCode && (
                      <span className="text-xs font-semibold text-slate-400">
                        {drive.companyCode}
                      </span>
                    )}
                  </div>

                  {/* Criteria info */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Min CGPA Required:</span>
                      <span className="font-bold text-slate-700">{drive.minCgpa ? drive.minCgpa.toFixed(2) : 'No Cutoff'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Max Arrears Allowed:</span>
                      <span className="font-bold text-slate-700">{drive.maxArrears === 99 ? 'No Limit' : drive.maxArrears}</span>
                    </div>
                  </div>

                  {/* Interview Dates */}
                  <div className="space-y-1 text-xs text-slate-500 font-medium">
                    {drive.applyLastDate && drive.applyLastDate !== '0001-01-01T00:00:00' && (
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-violet-500" />
                        <span>Apply By: <strong className="text-slate-700">{new Date(drive.applyLastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                      </div>
                    )}
                    {drive.interviewDate && drive.interviewDate !== '0001-01-01T00:00:00' && (
                      <div className="flex items-center gap-2">
                        <Users size={13} className="text-indigo-500" />
                        <span>Interview: <strong className="text-slate-700">{new Date(drive.interviewDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Selection Process Footer */}
                {drive.interviewProcess && (
                  <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium truncate">
                    Rounds: {drive.interviewProcess}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
