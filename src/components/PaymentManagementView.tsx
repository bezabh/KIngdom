import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Play,
  Users,
  XCircle,
  Calendar,
  Eye,
  Lock,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSubscription } from '../context/SubscriptionContext';
import { authorizedPayPalFetch } from '../lib/paypalClient';
import { exportPaymentsToCSV, exportPaymentsToPDF } from '../utils/adminDataExport';
import { PaymentTransaction } from '../types';

interface AdminSubscriptionRow {
  uid: string;
  email: string;
  displayName: string;
  provider: 'paypal';
  paypalSubscriptionId: string;
  paypalPlanId: string;
  planType: 'pro_monthly' | 'pro_yearly';
  status: string;
  currency: string;
  amount: number;
  billingFrequency: 'MONTH' | 'YEAR';
  startDate: string;
  nextBillingDate: string | null;
  cancelAtPeriodEnd: boolean;
  mode: 'sandbox' | 'live';
  integrationMethod: string;
  updatedAt: string;
}

interface AdminPaymentRow {
  uid: string;
  email: string;
  provider: 'paypal';
  paypalTransactionId: string;
  paypalSubscriptionId: string;
  planType: 'pro_monthly' | 'pro_yearly';
  amount: number;
  currency: string;
  paymentStatus: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'REVERSED';
  paymentDate: string;
  mode: 'sandbox' | 'live';
}

interface AdminOverviewData {
  metrics: {
    totalActiveProSubscribers: number;
    monthlySubscribers: number;
    yearlySubscribers: number;
    successfulPayments: number;
    failedPayments: number;
    cancelledSubscriptions: number;
    verifiedRevenue: number;
    currency: string;
  };
  subscriptions: AdminSubscriptionRow[];
  payments: AdminPaymentRow[];
  config: any;
  settings: any;
}

interface SandboxTestCaseResult {
  id: number;
  name: string;
  passed: boolean;
  details: string;
}

export const PaymentManagementView: React.FC = () => {
  const { language } = useLanguage();
  const { refreshSubscriptionStatus } = useSubscription();

  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'subscriptions' | 'payments' | 'settings' | 'sandbox-tests'>(
    'subscriptions'
  );

  // Selected detail record modal
  const [selectedSubRecord, setSelectedSubRecord] = useState<AdminSubscriptionRow | null>(null);

  // Admin runtime pricing & Live guard form
  const [monthlyPriceInput, setMonthlyPriceInput] = useState('9.99');
  const [yearlyPriceInput, setYearlyPriceInput] = useState('79.99');
  const [currencyInput, setCurrencyInput] = useState('EUR');
  const [sandboxPlanMonthlyInput, setSandboxPlanMonthlyInput] = useState('');
  const [sandboxPlanYearlyInput, setSandboxPlanYearlyInput] = useState('');
  const [livePlanMonthlyInput, setLivePlanMonthlyInput] = useState('');
  const [livePlanYearlyInput, setLivePlanYearlyInput] = useState('');
  const [pendingLiveConfirm, setPendingLiveConfirm] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Sandbox 10-point test runner state
  const [testResults, setTestResults] = useState<SandboxTestCaseResult[]>([]);
  const [testSummary, setTestSummary] = useState<{ passCount: number; totalCount: number } | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const loadAdminOverview = useCallback(async (query: string = '') => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const qs = query ? `?search=${encodeURIComponent(query)}` : '';
      const { ok, status, data } = await authorizedPayPalFetch(`/api/paypal/admin/overview${qs}`);
      if (!ok || !data?.success) {
        if (status === 401 || status === 403) {
          setAuthError(data?.error || 'Verified administrator credentials required.');
        } else {
          setAuthError(data?.error || 'Failed to load PayPal admin overview.');
        }
        return;
      }

      setOverview(data);
      if (data.settings) {
        setMonthlyPriceInput(String(data.settings.monthlyPrice ?? 9.99));
        setYearlyPriceInput(String(data.settings.yearlyPrice ?? 79.99));
        setCurrencyInput(String(data.settings.currency ?? 'EUR'));
        setSandboxPlanMonthlyInput(String(data.settings.sandboxPlanMonthlyId ?? ''));
        setSandboxPlanYearlyInput(String(data.settings.sandboxPlanYearlyId ?? ''));
        setLivePlanMonthlyInput(String(data.settings.livePlanMonthlyId ?? ''));
        setLivePlanYearlyInput(String(data.settings.livePlanYearlyId ?? ''));
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Unable to connect to PayPal admin endpoints.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdminOverview(searchQuery);
  }, [loadAdminOverview, searchQuery]);

  const handleSaveSettings = async (targetMode?: 'sandbox' | 'live', confirmLiveActivation: boolean = false) => {
    setIsSavingSettings(true);
    try {
      const { ok, data } = await authorizedPayPalFetch('/api/paypal/admin/settings', {
        method: 'POST',
        body: JSON.stringify({
          monthlyPrice: Number(monthlyPriceInput),
          yearlyPrice: Number(yearlyPriceInput),
          currency: currencyInput,
          sandboxPlanMonthlyId: sandboxPlanMonthlyInput.trim(),
          sandboxPlanYearlyId: sandboxPlanYearlyInput.trim(),
          livePlanMonthlyId: livePlanMonthlyInput.trim(),
          livePlanYearlyId: livePlanYearlyInput.trim(),
          mode: targetMode,
          confirmLiveActivation,
        }),
      });

      if (!ok || !data?.success) {
        showToast('error', data?.error || 'Could not update PayPal settings.');
        return;
      }

      setPendingLiveConfirm(false);
      showToast('success', 'PayPal server pricing & mode configuration saved.');
      await loadAdminOverview(searchQuery);
      await refreshSubscriptionStatus();
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleRunSandboxTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    setTestSummary(null);
    try {
      const { ok, data } = await authorizedPayPalFetch('/api/paypal/sandbox-tests/run', {
        method: 'POST',
      });
      if (!ok || !data?.success) {
        showToast('error', data?.error || 'Sandbox verification suite failed.');
        return;
      }
      setTestResults(data.results || []);
      setTestSummary({ passCount: data.passCount, totalCount: data.totalCount });
      showToast(
        data.allPassed ? 'success' : 'error',
        `Sandbox Suite: ${data.passCount}/${data.totalCount} tests passed.`
      );
      await loadAdminOverview(searchQuery);
    } finally {
      setIsRunningTests(false);
    }
  };

  const mapPaymentsForExport = (): PaymentTransaction[] => {
    if (!overview?.payments) return [];
    return overview.payments.map((p, i) => ({
      id: p.paypalTransactionId || `pp-${i}`,
      transactionId: p.paypalTransactionId,
      userId: p.uid,
      customerName: p.email.split('@')[0],
      customerEmail: p.email,
      planName: p.planType === 'pro_yearly' ? 'Axumite Pro Yearly' : 'Axumite Pro Monthly',
      billingCycle: p.planType === 'pro_yearly' ? 'Annual' : 'Monthly',
      amount: p.amount,
      currency: p.currency,
      paymentMethod: `PayPal (${p.mode.toUpperCase()})`,
      status:
        p.paymentStatus === 'COMPLETED'
          ? 'Completed'
          : p.paymentStatus === 'REFUNDED' || p.paymentStatus === 'REVERSED'
          ? 'Refunded'
          : 'Pending',
      timestamp: p.paymentDate,
      tokensCredited: 0,
      invoiceNumber: p.paypalTransactionId,
      notes: `Subscription: ${p.paypalSubscriptionId}`,
    }));
  };

  const metrics = overview?.metrics || {
    totalActiveProSubscribers: 0,
    monthlySubscribers: 0,
    yearlySubscribers: 0,
    successfulPayments: 0,
    failedPayments: 0,
    cancelledSubscriptions: 0,
    verifiedRevenue: 0,
    currency: 'EUR',
  };

  return (
    <div className="space-y-6 pb-12 text-slate-100">
      {toastMessage && (
        <div
          className={`fixed top-24 right-6 z-50 px-4 py-2.5 rounded-xl border shadow-2xl flex items-center gap-2 text-xs font-semibold ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500 text-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-[#120F1D] via-[#0E0C17] to-[#0A0812] border border-[#8E6D28]/30 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1">
              <CreditCard className="w-6 h-6 text-[#E1C47D]" />
              <h1 className="text-xl sm:text-2xl font-black font-cinzel metallic-gold-shimmer tracking-wide">
                {language === 'ti' ? 'ናይ PayPal ምሕደራ (Admin)' : 'PAYPAL SUBSCRIPTION & REVENUE ADMIN'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40">
                {overview?.settings?.mode === 'live' ? 'LIVE MODE' : 'SANDBOX DEFAULT'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Verified administrator billing governance for PayPal subscriptions, webhook payments, and Live mode activation guard.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void loadAdminOverview(searchQuery)}
              disabled={isLoading}
              className="px-3.5 py-2 bg-[#1A162B] hover:bg-[#25203D] border border-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => {
                exportPaymentsToCSV(mapPaymentsForExport());
                showToast('success', 'Verified PayPal payments exported as CSV.');
              }}
              className="px-3.5 py-2 bg-[#1A162B] hover:bg-[#25203D] border border-amber-500/40 text-amber-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                exportPaymentsToPDF(mapPaymentsForExport());
                showToast('success', 'PayPal financial ledger exported as PDF.');
              }}
              className="px-3.5 py-2 bg-[#1A162B] hover:bg-[#25203D] border border-[#8E6D28]/50 text-[#F3E5AB] text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#E1C47D]" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {authError && (
        <div className="bg-rose-950/50 border border-rose-500/50 rounded-2xl p-5 flex items-center gap-3 text-xs text-rose-200">
          <Lock className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      {/* 7 Admin KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <div className="bg-[#0B0914] border border-[#8E6D28]/30 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
            <span>Active Pro</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400 font-mono">
            {metrics.totalActiveProSubscribers}
          </div>
        </div>

        <div className="bg-[#0B0914] border border-[#8E6D28]/30 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
            <span>Monthly Subs</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {metrics.monthlySubscribers}
          </div>
        </div>

        <div className="bg-[#0B0914] border border-[#8E6D28]/30 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
            <span>Yearly Subs</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-[#F3E5AB] font-mono">
            {metrics.yearlySubscribers}
          </div>
        </div>

        <div className="bg-[#0B0914] border border-[#8E6D28]/30 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
            <span>Successful</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-300 font-mono">
            {metrics.successfulPayments}
          </div>
        </div>

        <div className="bg-[#0B0914] border border-[#8E6D28]/30 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
            <span>Failed</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-400 font-mono">
            {metrics.failedPayments}
          </div>
        </div>

        <div className="bg-[#0B0914] border border-[#8E6D28]/30 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
            <span>Cancelled</span>
            <XCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-300 font-mono">
            {metrics.cancelledSubscriptions}
          </div>
        </div>

        <div className="bg-[#0B0914] border border-[#8E6D28]/30 rounded-xl p-4 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold">
            <span>Verified Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400 font-mono">
            {metrics.verifiedRevenue.toFixed(2)} <span className="text-xs">{metrics.currency}</span>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex items-center gap-2 border-b border-[#8E6D28]/30 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('subscriptions')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
            activeSubTab === 'subscriptions'
              ? 'bg-[#1D1830] text-[#F3E5AB] border border-[#C5A059]/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Subscriptions ({overview?.subscriptions?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('payments')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
            activeSubTab === 'payments'
              ? 'bg-[#1D1830] text-[#F3E5AB] border border-[#C5A059]/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Verified Payments ({overview?.payments?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('settings')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeSubTab === 'settings'
              ? 'bg-[#1D1830] text-[#F3E5AB] border border-[#C5A059]/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Plan Pricing & Live Guard</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('sandbox-tests')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeSubTab === 'sandbox-tests'
              ? 'bg-[#1D1830] text-[#F3E5AB] border border-[#C5A059]/60'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>10-Point Sandbox Suite</span>
        </button>
      </div>

      {/* SubTab 1: Searchable Subscriptions */}
      {activeSubTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="bg-[#0B0914] border border-[#8E6D28]/30 rounded-xl p-4 flex items-center gap-3">
            <Search className="w-4 h-4 text-[#C5A059] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by UID, customer email, PayPal subscription ID, or status..."
              className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          <div className="bg-[#0B0914] border border-[#8E6D28]/30 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-[#120F1E] border-b border-[#8E6D28]/30 text-[10px] uppercase font-bold text-[#C5A059]">
                  <tr>
                    <th className="py-3.5 px-4">Subscriber</th>
                    <th className="py-3.5 px-4">PayPal Subscription ID</th>
                    <th className="py-3.5 px-4">Plan & Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Next Billing / Paid-Through</th>
                    <th className="py-3.5 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#8E6D28]/15">
                  {!overview?.subscriptions?.length ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No PayPal subscription records matching your search.
                      </td>
                    </tr>
                  ) : (
                    overview.subscriptions.map((sub) => (
                      <tr key={sub.paypalSubscriptionId} className="hover:bg-[#141022]">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{sub.displayName || sub.email}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {sub.email} • {sub.uid}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#F3E5AB]">
                          {sub.paypalSubscriptionId}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold">{sub.planType}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {sub.amount.toFixed(2)} {sub.currency} / {sub.billingFrequency}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1A162B] border border-slate-700">
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                          {sub.nextBillingDate
                            ? new Date(sub.nextBillingDate).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedSubRecord(sub)}
                            className="p-1.5 rounded-lg bg-[#1A162B] hover:bg-[#25203D] border border-slate-700 text-[#F3E5AB] cursor-pointer"
                            title="Inspect subscription record"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 2: Payment History */}
      {activeSubTab === 'payments' && (
        <div className="bg-[#0B0914] border border-[#8E6D28]/30 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-[#120F1E] border-b border-[#8E6D28]/30 text-[10px] uppercase font-bold text-[#C5A059]">
                <tr>
                  <th className="py-3.5 px-4">PayPal Transaction ID</th>
                  <th className="py-3.5 px-4">Customer Email</th>
                  <th className="py-3.5 px-4">Subscription ID</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8E6D28]/15">
                {!overview?.payments?.length ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No PayPal payment records yet.
                    </td>
                  </tr>
                ) : (
                  overview.payments.map((pay) => (
                    <tr key={pay.paypalTransactionId} className="hover:bg-[#141022]">
                      <td className="py-3 px-4 font-mono text-[11px] text-[#F3E5AB]">
                        {pay.paypalTransactionId}
                      </td>
                      <td className="py-3 px-4">{pay.email}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {pay.paypalSubscriptionId}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {pay.amount.toFixed(2)} {pay.currency}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            pay.paymentStatus === 'COMPLETED'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {pay.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(pay.paymentDate).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab 3: Plan Pricing & Live Mode Guard */}
      {activeSubTab === 'settings' && (
        <div className="bg-[#0B0914] border border-[#8E6D28]/30 rounded-2xl p-6 space-y-5">
          <div>
            <h3 className="text-base font-bold font-cinzel text-[#F3E5AB]">
              Server-Side PayPal Plan Configuration & Live Mode Guard
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live pricing and Live checkout cannot activate without explicit administrator confirmation and Sandbox pass.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Monthly Price (pro_monthly)</label>
              <input
                type="number"
                step="0.01"
                value={monthlyPriceInput}
                onChange={(e) => setMonthlyPriceInput(e.target.value)}
                className="w-full bg-[#120F1E] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Yearly Price (pro_yearly)</label>
              <input
                type="number"
                step="0.01"
                value={yearlyPriceInput}
                onChange={(e) => setYearlyPriceInput(e.target.value)}
                className="w-full bg-[#120F1E] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Billing Currency</label>
              <select
                value={currencyInput}
                onChange={(e) => setCurrencyInput(e.target.value)}
                className="w-full bg-[#120F1E] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Sandbox Monthly Plan ID</label>
              <input
                type="text"
                value={sandboxPlanMonthlyInput}
                onChange={(e) => setSandboxPlanMonthlyInput(e.target.value)}
                placeholder="P-... (auto-provisioned if empty & credentials configured)"
                className="w-full bg-[#120F1E] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Sandbox Yearly Plan ID</label>
              <input
                type="text"
                value={sandboxPlanYearlyInput}
                onChange={(e) => setSandboxPlanYearlyInput(e.target.value)}
                placeholder="P-..."
                className="w-full bg-[#120F1E] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Live Monthly Plan ID</label>
              <input
                type="text"
                value={livePlanMonthlyInput}
                onChange={(e) => setLivePlanMonthlyInput(e.target.value)}
                placeholder="P-..."
                className="w-full bg-[#120F1E] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Live Yearly Plan ID</label>
              <input
                type="text"
                value={livePlanYearlyInput}
                onChange={(e) => setLivePlanYearlyInput(e.target.value)}
                placeholder="P-..."
                className="w-full bg-[#120F1E] border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              disabled={isSavingSettings}
              onClick={() => void handleSaveSettings('sandbox', false)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8E6D28] to-[#C5A059] text-black text-xs font-black cursor-pointer disabled:opacity-60"
            >
              Save Sandbox Plan Configuration
            </button>

            {overview?.settings?.mode !== 'live' ? (
              <button
                type="button"
                onClick={() => setPendingLiveConfirm(true)}
                className="px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-rose-200 text-xs font-bold cursor-pointer"
              >
                Request Live Mode Activation...
              </button>
            ) : (
              <button
                type="button"
                disabled={isSavingSettings}
                onClick={() => void handleSaveSettings('sandbox', false)}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black text-xs font-black cursor-pointer"
              >
                Revert to Sandbox Mode
              </button>
            )}
          </div>

          {pendingLiveConfirm && (
            <div className="bg-rose-950/50 border border-rose-500/50 rounded-xl p-4 space-y-3 text-xs">
              <p className="text-rose-200 font-semibold">
                Confirm Administrator Live Activation: Switching to Live PayPal charges real customer funds (€{monthlyPriceInput}/mo and €{yearlyPriceInput}/yr). Make sure Live PayPal credentials & Webhook ID are configured in server secrets first.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isSavingSettings}
                  onClick={() => void handleSaveSettings('live', true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  Confirm & Activate Live Mode
                </button>
                <button
                  type="button"
                  onClick={() => setPendingLiveConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold cursor-pointer"
                >
                  Keep Sandbox Mode
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SubTab 4: Automated 10-Point Sandbox Test Runner */}
      {activeSubTab === 'sandbox-tests' && (
        <div className="bg-[#0B0914] border border-[#8E6D28]/30 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold font-cinzel text-[#F3E5AB]">
                10-Point PayPal Sandbox Verification Suite
              </h3>
              <p className="text-xs text-slate-400">
                Tests Sandbox checkout, monthly & annual creation, approval verification, signed/invalid webhook verification, cancellation paid-through retention, payment failure revocation, Live guard, and Firestore sync.
              </p>
            </div>
            <button
              type="button"
              disabled={isRunningTests}
              onClick={handleRunSandboxTests}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#003087] to-[#0070BA] text-white text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60 shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isRunningTests ? 'Running Suite...' : 'Run Sandbox Test Suite'}</span>
            </button>
          </div>

          {testSummary && (
            <div className="text-xs font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-4 py-2.5">
              Passed {testSummary.passCount} / {testSummary.totalCount} verification checks.
            </div>
          )}

          {testResults.length > 0 && (
            <div className="space-y-2">
              {testResults.map((t) => (
                <div
                  key={t.id}
                  className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                    t.passed
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-100'
                      : 'bg-rose-950/30 border-rose-500/30 text-rose-100'
                  }`}
                >
                  <div>
                    <div className="font-bold">
                      {t.id}. {t.name}
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">{t.details}</div>
                  </div>
                  <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-black/40 shrink-0">
                    {t.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inspect Subscription Modal */}
      {selectedSubRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121422] border border-[#C5A059] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-cinzel text-base font-bold text-[#F3E5AB]">
                Subscription Record Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedSubRecord(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 font-mono bg-[#0B0914] p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block">UID</span>
                <span className="text-white break-all">{selectedSubRecord.uid}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Email</span>
                <span className="text-white break-all">{selectedSubRecord.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block">PayPal Sub ID</span>
                <span className="text-amber-300 break-all">{selectedSubRecord.paypalSubscriptionId}</span>
              </div>
              <div>
                <span className="text-slate-400 block">PayPal Plan ID</span>
                <span className="text-slate-200 break-all">{selectedSubRecord.paypalPlanId}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Status</span>
                <span className="text-emerald-300">{selectedSubRecord.status}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Method</span>
                <span className="text-sky-300">{selectedSubRecord.integrationMethod}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Start Date</span>
                <span className="text-slate-200">{new Date(selectedSubRecord.startDate).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Next Billing Date</span>
                <span className="text-slate-200">
                  {selectedSubRecord.nextBillingDate
                    ? new Date(selectedSubRecord.nextBillingDate).toLocaleString()
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
