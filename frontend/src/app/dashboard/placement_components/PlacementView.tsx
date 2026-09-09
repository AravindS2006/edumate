'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Search,
  Calendar,
  Award,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Building2,
  Users,
  ArrowRight,
  ExternalLink,
  MapPin,
  Clock,
  Layers,
  Sparkles,
  ChevronRight,
  X
} from 'lucide-react';

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
  eligibleStatus?: string;
  jobType?: string;
  venue?: string;
  reportingTime?: string;
  skills?: string;
  designation?: string;
  status?: string;
  [key: string]: any;
}

interface PlacementViewProps {
  interviewsData?: any;
  internshipsData?: any;
  studentCgpa?: number;
  studentArrears?: number;
  resumeData?: any;
  loading?: boolean;
}

export function PlacementView({
  interviewsData,
  internshipsData,
  studentCgpa = 0,
  studentArrears = 0,
  resumeData,
  loading = false
}: PlacementViewProps) {
  const [activeTab, setActiveTab] = useState<'DRIVES' | 'INTERNSHIPS'>('DRIVES');
  const [searchTerm, setSearchTerm] = useState('');
  const [driveFilter, setDriveFilter] = useState<'ALL' | 'ELIGIBLE'>('ALL');
  const [selectedDrive, setSelectedDrive] = useState<InterviewDrive | null>(null);

  // Normalize interviews list
  const drivesList: InterviewDrive[] = useMemo(() => {
    if (!interviewsData) return [];
    if (Array.isArray(interviewsData)) return interviewsData;
    if (Array.isArray(interviewsData.data)) return interviewsData.data;
    return [];
  }, [interviewsData]);

  // Clean and format salary package string (fixes upstream encoding issues like ?5,00,000)
  const formatSalary = (pkg?: string) => {
    if (!pkg) return '';
    return pkg.replace(/\?/g, '₹').trim();
  };

  const drivesWithEligibility = useMemo(() => {
    return drivesList.map(drive => {
      const minCgpa = Number(drive.ugcgpa || 0);
      const maxArrears = Number(drive.historyOfArrear ?? 99);

      const isCgpaEligible = minCgpa === 0 || studentCgpa >= minCgpa;
      const isArrearsEligible = studentArrears <= maxArrears;

      // Honor upstream eligibleStatus if provided, otherwise compute from criteria
      const upstreamStatus = drive.eligibleStatus ? drive.eligibleStatus.trim() : '';
      let isEligible = isCgpaEligible && isArrearsEligible;
      if (upstreamStatus) {
        const lower = upstreamStatus.toLowerCase();
        isEligible = lower.includes('eligible') && !lower.includes('not') && !lower.includes('ineligible');
      }

      return {
        ...drive,
        isEligible,
        isCgpaEligible,
        isArrearsEligible,
        minCgpa,
        maxArrears,
        formattedSalary: formatSalary(drive.salaryPackage)
      };
    });
  }, [drivesList, studentCgpa, studentArrears]);

  const filteredDrives = useMemo(() => {
    return drivesWithEligibility.filter(d => {
      const matchesSearch = !searchTerm ||
        (d.companyName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (d.companyCode?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (d.designation?.toLowerCase() || '').includes(searchTerm.toLowerCase());

      const matchesFilter = driveFilter === 'ALL' || d.isEligible;
      return matchesSearch && matchesFilter;
    });
  }, [drivesWithEligibility, searchTerm, driveFilter]);

  // Normalize internships data
  const internshipCompanies: any[] = useMemo(() => {
    if (!internshipsData) return [];
    return internshipsData.companies || [];
  }, [internshipsData]);

  const internshipHistory: any[] = useMemo(() => {
    if (!internshipsData) return [];
    return internshipsData.history || [];
  }, [internshipsData]);

  const filteredInternshipCompanies = useMemo(() => {
    if (!searchTerm) return internshipCompanies;
    return internshipCompanies.filter(c =>
      (c.companyName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [internshipCompanies, searchTerm]);

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
            Campus recruitment drives, interview schedules, and industrial internship opportunities.
          </p>
        </div>

        {/* Student Placement Status Pill */}
        <div className="flex items-center gap-2.5 p-2 px-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-xs font-bold text-slate-700 shrink-0">
          <span>Your CGPA: <strong className="text-indigo-600 font-black">{studentCgpa.toFixed(2)}</strong></span>
          <span className="text-slate-300">•</span>
          <span>Standing Arrears: <strong className={studentArrears === 0 ? "text-emerald-600 font-black" : "text-rose-600 font-black"}>{studentArrears}</strong></span>
        </div>
      </div>

      {/* Resume Card Banner */}
      <div className="p-4 sm:p-5 rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-500/20">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Training & Placement Profile Verified
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Registered with Sairam Center for Career Development & Campus Placement Cell.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
            Active Candidate
          </span>
        </div>
      </div>

      {/* Main Sub-Navigation: Drives vs Internships */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab('DRIVES'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'DRIVES'
                ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Briefcase size={15} />
            <span>Campus Placement Drives ({drivesWithEligibility.length})</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('INTERNSHIPS'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'INTERNSHIPS'
                ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers size={15} />
            <span>Internship Partners ({internshipCompanies.length})</span>
          </button>
        </div>

        {activeTab === 'DRIVES' && (
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setDriveFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                driveFilter === 'ALL'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Drives ({drivesWithEligibility.length})
            </button>
            <button
              type="button"
              onClick={() => setDriveFilter('ELIGIBLE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                driveFilter === 'ELIGIBLE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Eligible Only ({drivesWithEligibility.filter(d => d.isEligible).length})
            </button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={activeTab === 'DRIVES' ? "Search companies (e.g. Zoho, Photon, MRF)..." : "Search internship partner companies..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-medium focus:outline-none focus:border-violet-500 transition-colors shadow-xs"
        />
      </div>

      {/* TAB 1: PLACEMENT DRIVES */}
      {activeTab === 'DRIVES' && (
        <>
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
                {searchTerm ? `No drives matching "${searchTerm}"` : "Placement cell hasn't published new recruitment drives for this cycle."}
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
                    onClick={() => setSelectedDrive(drive)}
                    className="p-5 rounded-3xl border border-slate-200/70 bg-white hover:border-violet-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4 cursor-pointer group"
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
                          <span>{drive.isEligible ? 'Eligible' : 'Not Eligible'}</span>
                        </span>

                        {drive.formattedSalary && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs">
                            {drive.formattedSalary}
                          </span>
                        )}
                      </div>

                      {/* Company Name */}
                      <div>
                        <h3 className="text-base font-extrabold text-slate-800 leading-snug group-hover:text-violet-600 transition-colors">
                          {drive.companyName}
                        </h3>
                        {drive.companyCode && (
                          <span className="text-xs font-semibold text-slate-400">
                            {drive.companyCode}
                          </span>
                        )}
                      </div>

                      {/* Criteria summary */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Cutoff CGPA:</span>
                          <span className="font-bold text-slate-700">{drive.minCgpa ? drive.minCgpa.toFixed(2) : 'No Cutoff'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Max Arrears:</span>
                          <span className="font-bold text-slate-700">{drive.maxArrears === 99 ? 'No Limit' : drive.maxArrears}</span>
                        </div>
                      </div>

                      {/* Schedule info */}
                      <div className="space-y-1 text-xs text-slate-500 font-medium">
                        {drive.applyLastDate && drive.applyLastDate !== '0001-01-01T00:00:00' && (
                          <div className="flex items-center gap-2">
                            <Calendar size={13} className="text-violet-500 shrink-0" />
                            <span>Apply By: <strong className="text-slate-700">{new Date(drive.applyLastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                          </div>
                        )}
                        {drive.interviewDate && drive.interviewDate !== '0001-01-01T00:00:00' && (
                          <div className="flex items-center gap-2">
                            <Users size={13} className="text-indigo-500 shrink-0" />
                            <span>Drive Date: <strong className="text-slate-700">{new Date(drive.interviewDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-violet-600 font-bold">
                      <span>View Specifications</span>
                      <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* TAB 2: INTERNSHIPS & INDUSTRY PARTNERS */}
      {activeTab === 'INTERNSHIPS' && (
        <div className="space-y-6">
          {/* Student Internship Registrations / History */}
          {internshipHistory.length > 0 && (
            <div className="p-5 rounded-3xl border border-slate-200/80 bg-white shadow-xs space-y-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span>Your Registered Internships ({internshipHistory.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {internshipHistory.map((item: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-sm">{item.companyName || 'Partner Organization'}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold uppercase text-[10px]">
                        {item.status || 'Approved'}
                      </span>
                    </div>
                    <p className="text-slate-500 font-medium">Domain: {item.internshipType || 'Core Engineering'}</p>
                    <div className="text-slate-400">Duration: {item.startDate || 'N/A'} - {item.endDate || 'N/A'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved Partner Directory */}
          <div className="p-5 rounded-3xl border border-slate-200/80 bg-white shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Institutional Internship Partners Directory
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Verified technology and manufacturing organizations recognized by Sairam for credit-bearing industrial training.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredInternshipCompanies.slice(0, 60).map((company: any) => (
                <div
                  key={company.id || company.companyName}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-violet-200 hover:shadow-xs transition-all flex items-center gap-3"
                >
                  <div className="p-2 rounded-xl bg-violet-100 text-violet-700 shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-800 truncate" title={company.companyName}>
                      {company.companyName}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Approved Partner
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {filteredInternshipCompanies.length > 60 && (
              <p className="text-xs text-center text-slate-400 font-medium pt-2">
                Showing top 60 of {filteredInternshipCompanies.length} partner companies. Use search above to locate specific organizations.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Drive Details Modal */}
      <AnimatePresence>
        {selectedDrive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      selectedDrive.isEligible ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {selectedDrive.isEligible ? 'Eligible to Apply' : 'Not Eligible'}
                    </span>
                    {selectedDrive.formattedSalary && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-violet-600 text-white">
                        {selectedDrive.formattedSalary}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-slate-800">
                    {selectedDrive.companyName}
                  </h3>
                  {selectedDrive.companyCode && (
                    <span className="text-xs text-slate-400 font-semibold block">{selectedDrive.companyCode}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDrive(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Eligibility Checkpoints */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                <h4 className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px]">
                  Eligibility Breakdown
                </h4>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    {selectedDrive.isCgpaEligible ? (
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-rose-600 shrink-0" />
                    )}
                    <span>CGPA Cutoff: <strong>{selectedDrive.minCgpa ? selectedDrive.minCgpa.toFixed(2) : 'None'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedDrive.isArrearsEligible ? (
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle size={14} className="text-rose-600 shrink-0" />
                    )}
                    <span>Max Arrears: <strong>{selectedDrive.maxArrears === 99 ? 'No limit' : selectedDrive.maxArrears}</strong></span>
                  </div>
                </div>
              </div>

              {/* Recruitment Schedule */}
              <div className="space-y-2.5 text-xs text-slate-600">
                <h4 className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px]">
                  Recruitment Dates & Venue
                </h4>
                {selectedDrive.applyLastDate && selectedDrive.applyLastDate !== '0001-01-01T00:00:00' && (
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-violet-500 shrink-0" />
                    <span>Application Deadline: <strong>{new Date(selectedDrive.applyLastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
                  </div>
                )}
                {selectedDrive.interviewDate && selectedDrive.interviewDate !== '0001-01-01T00:00:00' && (
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-indigo-500 shrink-0" />
                    <span>Interview Date: <strong>{new Date(selectedDrive.interviewDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
                  </div>
                )}
                {selectedDrive.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-emerald-500 shrink-0" />
                    <span>Venue: <strong>{selectedDrive.venue}</strong></span>
                  </div>
                )}
              </div>

              {/* Selection Process Rounds */}
              {selectedDrive.interviewProcess && (
                <div className="p-4 rounded-2xl bg-violet-50/50 border border-violet-100 space-y-1 text-xs">
                  <h4 className="font-extrabold text-violet-900 uppercase tracking-wider text-[11px]">
                    Selection Process Rounds
                  </h4>
                  <p className="text-violet-700 font-medium leading-relaxed">
                    {selectedDrive.interviewProcess}
                  </p>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDrive(null)}
                  className="w-full py-2.5 rounded-2xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-900 transition-colors shadow-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

