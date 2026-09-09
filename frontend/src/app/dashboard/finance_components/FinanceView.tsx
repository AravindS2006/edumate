'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle2, AlertTriangle, Download, Calendar, DollarSign, ArrowUpRight, ShieldCheck } from 'lucide-react';

export interface FeeItem {
  feeGroupId?: number;
  feeGroupName?: string;
  totalAmount?: number;
  paidAmount?: number;
  balanceAmount?: number;
  dueDate?: string;
  status?: string;
  [key: string]: any;
}

interface FinanceViewProps {
  feesData?: FeeItem[];
  examStatus?: any;
  loading?: boolean;
}

export function FinanceView({ feesData = [], examStatus, loading = false }: FinanceViewProps) {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');

  // Compute totals
  const { totalAmount, totalPaid, totalBalance } = useMemo(() => {
    let amt = 0;
    let paid = 0;
    let bal = 0;

    if (feesData && feesData.length > 0) {
      feesData.forEach(item => {
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
  }, [feesData, examStatus]);

  const filteredFees = useMemo(() => {
    if (!feesData) return [];
    if (filter === 'PENDING') return feesData.filter(f => (f.balanceAmount || 0) > 0);
    if (filter === 'PAID') return feesData.filter(f => (f.balanceAmount || 0) <= 0);
    return feesData;
  }, [feesData, filter]);

  const isAllClear = totalBalance === 0;

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
            Track your semester tuition, hostel, transport, and examination dues.
          </p>
        </div>

        {/* Status Banner */}
        <div className={`px-4 py-2.5 rounded-2xl border flex items-center gap-2 text-xs font-black uppercase tracking-wider ${
          isAllClear
            ? 'bg-emerald-50 border-emerald-200/80 text-emerald-700'
            : 'bg-amber-50 border-amber-200/80 text-amber-700'
        }`}>
          {isAllClear ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{isAllClear ? 'All Dues Cleared' : `Pending Due: ₹${totalBalance.toLocaleString('en-IN')}`}</span>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
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
            ₹{totalAmount.toLocaleString('en-IN')}
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
            ₹{totalPaid.toLocaleString('en-IN')}
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
            ₹{totalBalance.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {totalBalance === 0 ? 'No balance remaining' : 'Please clear dues before the exam session'}
          </p>
        </div>
      </div>

      {/* Breakdown Table Section */}
      <div className="rounded-3xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-800">Fee Component Breakdown</h3>
            <p className="text-xs text-slate-500 font-medium">Detailed schedule of dues, receipts, and allocations</p>
          </div>

          {/* Filter Pills */}
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
                {tab === 'ALL' ? 'All Records' : tab === 'PENDING' ? 'Pending' : 'Paid'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            <div className="h-12 bg-slate-100 rounded-2xl animate-pulse" />
            <div className="h-12 bg-slate-100 rounded-2xl animate-pulse" />
          </div>
        ) : filteredFees.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <h4 className="text-base font-bold text-slate-800">No fee dues recorded</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Your college portal reports zero outstanding dues for the current academic session.
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
                  <th className="px-5 py-3.5 text-right">Balance</th>
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
                        <Calendar size={13} className="text-slate-400" />
                        <span>{fee.dueDate || 'Current Session'}</span>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold">
                        ₹{Number(fee.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-emerald-600">
                        ₹{Number(fee.paidAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className={`px-5 py-4 text-right font-black ${bal > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        ₹{bal.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isPaid ? 'Paid' : 'Due'}
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

      {/* Online Payment Notice Card */}
      <div className="p-5 rounded-3xl border border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-800">Fee Payment Gateway Note</h4>
          <p className="text-xs text-slate-500">
            For online fee clearance, Sairam ERP processes transactions via the official Razorpay payment portal at college premises.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm shrink-0 flex items-center gap-1.5"
        >
          <Download size={14} />
          <span>Export Fee Statement</span>
        </button>
      </div>
    </div>
  );
}
