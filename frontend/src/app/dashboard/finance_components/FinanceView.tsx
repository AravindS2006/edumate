'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Download,
  Calendar,
  DollarSign,
  ShieldCheck,
  Building,
  GraduationCap,
  Info,
  ChevronDown,
  ChevronUp,
  Receipt,
  Check
} from 'lucide-react';

export interface FeeItem {
  feeGroupId?: number;
  feeGroupName?: string;
  totalAmount?: number;
  paidAmount?: number;
  balanceAmount?: number;
  dueDate?: string;
  status?: string;
  academicYear?: string;
  semester?: string | number;
  [key: string]: any;
}

interface FinanceViewProps {
  feesData?: any;
  examStatus?: any;
  academic?: any;
  loading?: boolean;
}

export function FinanceView({
  feesData,
  examStatus,
  academic,
  loading = false
}: FinanceViewProps) {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [showNotes, setShowNotes] = useState(false);

  // Normalize feesData whether passed as an array or as an object { data, notes, currency, isAllClear }
  const rawItems: FeeItem[] = useMemo(() => {
    if (!feesData) return [];
    if (Array.isArray(feesData)) return feesData;
    if (Array.isArray(feesData.data)) return feesData.data;
    return [];
  }, [feesData]);

  const staticNotes: any[] = useMemo(() => {
    if (feesData && typeof feesData === 'object' && Array.isArray(feesData.notes)) {
      return feesData.notes;
    }
    return [];
  }, [feesData]);

  const currencySymbol: string = useMemo(() => {
    if (feesData && typeof feesData === 'object' && feesData.currency?.currencySymbol) {
      return feesData.currency.currencySymbol;
    }
    return '₹';
  }, [feesData]);

  // Compute totals from fee items, or fallback to examStatus fields
  const { totalAmount, totalPaid, totalBalance } = useMemo(() => {
    let amt = 0;
    let paid = 0;
    let bal = 0;

    if (rawItems.length > 0) {
      rawItems.forEach(item => {
        amt += Number(item.totalAmount || 0);
        paid += Number(item.paidAmount || 0);
        bal += Number(item.balanceAmount || 0);
      });
    } else if (examStatus) {
      amt = Number(examStatus.total_fees || 0);
      paid = Number(examStatus.paid_online || 0);
      bal = Number(examStatus.previous_due || 0);
    }

    return { totalAmount: amt, totalPaid: paid, totalBalance: bal };
  }, [rawItems, examStatus]);

  const filteredFees = useMemo(() => {
    if (!rawItems || rawItems.length === 0) return [];
    if (filter === 'PENDING') return rawItems.filter(f => Number(f.balanceAmount || 0) > 0);
    if (filter === 'PAID') return rawItems.filter(f => Number(f.balanceAmount || 0) <= 0);
    return rawItems;
  }, [rawItems, filter]);

  const isAllClear = totalBalance === 0;
  const isFeesEligible = examStatus?.is_fees_eligible ?? isAllClear;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600">
              <CreditCard size={28} />
            </span>
            Finance & Fee Management
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Track semester tuition, hostel, examination clearance, and payment schedules.
          </p>
        </div>

        {/* Status Banner */}
        <div className={`px-4 py-2.5 rounded-2xl border flex items-center gap-2 text-xs font-black uppercase tracking-wider ${
          isAllClear
            ? 'bg-emerald-50 border-emerald-200/80 text-emerald-700 shadow-xs'
            : 'bg-amber-50 border-amber-200/80 text-amber-700 shadow-xs'
        }`}>
          {isAllClear ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{isAllClear ? 'All Semester Dues Cleared' : `Pending Due: ${currencySymbol}${totalBalance.toLocaleString('en-IN')}`}</span>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Fees */}
        <div className="p-5 rounded-3xl border border-slate-200/70 bg-white shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Total Assessed</span>
            <div className="p-1.5 rounded-xl bg-slate-100 text-slate-600">
              <CreditCard size={14} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tight">
            {currencySymbol}{totalAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 font-medium">Academic semester fees assessed</p>
        </div>

        {/* Total Paid */}
        <div className="p-5 rounded-3xl border border-emerald-200/70 bg-emerald-50/30 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-600 uppercase tracking-wider">
            <span>Total Paid</span>
            <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700">
              <ShieldCheck size={14} />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700 tracking-tight">
            {currencySymbol}{totalPaid.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-emerald-600 font-medium">Successfully processed payments</p>
        </div>

        {/* Outstanding Balance */}
        <div className={`p-5 rounded-3xl border shadow-sm space-y-2 ${
          totalBalance > 0
            ? 'border-amber-200/80 bg-amber-50/40 text-amber-900'
            : 'border-slate-200/70 bg-white text-slate-800'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Outstanding Balance</span>
            <div className={`p-1.5 rounded-xl ${totalBalance > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
              <DollarSign size={14} />
            </div>
          </div>
          <div className={`text-3xl font-black tracking-tight ${totalBalance > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
            {currencySymbol}{totalBalance.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {totalBalance === 0 ? 'Zero outstanding balance' : 'Please settle pending dues before the exam period'}
          </p>
        </div>
      </div>

      {/* Official Clearance Card (Shown when balance is zero or all clear) */}
      {isAllClear && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 shadow-sm relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                <ShieldCheck size={14} className="text-emerald-700" />
                <span>Verified Institutional Fee Clearance</span>
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">
                No Outstanding Dues on Your Account
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                All semester tuition, institutional dues, and laboratory fees have been settled.
                {isFeesEligible && (
                  <span className="font-semibold text-emerald-800 block mt-1">
                    ✓ Cleared for Hall Ticket Generation and End-Semester University Examinations.
                  </span>
                )}
              </p>
            </div>

            {/* Clearance Metadata Pill Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
              <div className="p-3 bg-white/90 backdrop-blur-sm rounded-2xl border border-emerald-100 text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department</span>
                <span className="text-xs font-black text-slate-700 block truncate">{academic?.dept || 'B.E / B.Tech'}</span>
              </div>
              <div className="p-3 bg-white/90 backdrop-blur-sm rounded-2xl border border-emerald-100 text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Semester</span>
                <span className="text-xs font-black text-slate-700 block">Sem {academic?.semester || 6}</span>
              </div>
              <div className="p-3 bg-white/90 backdrop-blur-sm rounded-2xl border border-emerald-100 text-center space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fee Status</span>
                <span className="text-xs font-black text-emerald-600 block">{examStatus?.fee_status || 'Nil Dues'}</span>
              </div>
            </div>
          </div>

          {/* Sub-fee Allocations breakdown from examStatus */}
          {examStatus && (examStatus.trust_office_fees !== undefined || examStatus.hostel_fees !== undefined || examStatus.book_fees !== undefined) && (
            <div className="mt-5 pt-4 border-t border-emerald-100/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 border border-emerald-50">
                <span className="text-slate-500 font-medium">Trust Office Fees:</span>
                <span className="font-bold text-slate-800">{currencySymbol}{Number(examStatus.trust_office_fees || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 border border-emerald-50">
                <span className="text-slate-500 font-medium">Hostel / Amenity Dues:</span>
                <span className="font-bold text-slate-800">{currencySymbol}{Number(examStatus.hostel_fees || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 border border-emerald-50">
                <span className="text-slate-500 font-medium">Book & Library Fees:</span>
                <span className="font-bold text-slate-800">{currencySymbol}{Number(examStatus.book_fees || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Breakdown Table Section */}
      <div className="rounded-3xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">Fee Component Breakdown</h3>
            <p className="text-xs text-slate-500 font-medium">
              Schedule of fees, dues, and payment allocation records
            </p>
          </div>

          {/* Filter Pills */}
          {rawItems.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
              {(['ALL', 'PENDING', 'PAID'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filter === tab
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab === 'ALL' ? `All (${rawItems.length})` : tab === 'PENDING' ? 'Pending Dues' : 'Cleared'}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            <div className="h-12 bg-slate-100 rounded-2xl animate-pulse" />
            <div className="h-12 bg-slate-100 rounded-2xl animate-pulse" />
          </div>
        ) : filteredFees.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 size={28} />
            </div>
            <h4 className="text-base font-bold text-slate-800">No Pending Dues Recorded</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Your college portal reports zero outstanding tuition or examination dues for the current academic session. All registered fees are fully reconciled.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Fee Category</th>
                  <th className="px-5 py-3.5">Due Date</th>
                  <th className="px-5 py-3.5 text-right">Total Amount</th>
                  <th className="px-5 py-3.5 text-right">Paid Amount</th>
                  <th className="px-5 py-3.5 text-right">Balance Due</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredFees.map((fee, i) => {
                  const bal = Number(fee.balanceAmount || 0);
                  const isPaid = bal <= 0;
                  return (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-800">
                        {fee.feeGroupName || 'Tuition & Academic Fee'}
                      </td>
                      <td className="px-5 py-4 text-slate-500 flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400 shrink-0" />
                        <span>{fee.dueDate || 'Current Session'}</span>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold">
                        {currencySymbol}{Number(fee.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-emerald-600">
                        {currencySymbol}{Number(fee.paidAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className={`px-5 py-4 text-right font-black ${bal > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {currencySymbol}{bal.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isPaid ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* College Static Policy Notes Section */}
      {staticNotes.length > 0 && (
        <div className="rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Info size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Fee Payment Policy & Instructions</h4>
                <p className="text-xs text-slate-500 font-medium">Official Sairam ERP payment terms and bank reconciliation guidelines</p>
              </div>
            </div>
            <div className="text-slate-400">
              {showNotes ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </button>

          <AnimatePresence>
            {showNotes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-5 pb-5 border-t border-slate-100 space-y-2 text-xs text-slate-600 bg-slate-50/40"
              >
                {staticNotes.map((note: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 pt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <p className="leading-relaxed">{note.description || note.note || JSON.stringify(note)}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Online Payment Notice Card */}
      <div className="p-5 rounded-3xl border border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-emerald-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Receipt size={16} className="text-emerald-600" />
            Institutional Payment Gateway Note
          </h4>
          <p className="text-xs text-slate-500 max-w-xl">
            For online fee clearance, Sairam ERP processes fee transactions via Razorpay / Axis Bank college gateway. Payments update within 24-48 hours.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm shrink-0 flex items-center gap-1.5"
        >
          <Download size={14} />
          <span>Export Fee Statement</span>
        </button>
      </div>
    </div>
  );
}

