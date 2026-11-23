import React, { useState, useEffect } from 'react';
import { 
  Crown, Shield, Zap, Sparkles, CheckCircle2, AlertTriangle, 
  RotateCcw, Search, Filter, ArrowUpRight, Check, X, Sliders, 
  RefreshCw, Users, Key, CreditCard, Activity, ChevronRight,
  TrendingUp, Clock, Info, ShieldCheck, Lock, ExternalLink
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSubscription } from '../context/SubscriptionContext';
import { authorizedPayPalFetch } from '../lib/paypalClient';

interface SaasUser {
  userId: string;
  email: string;
  plan: 'free' | 'premium' | 'enterprise' | 'pro_yearly' | 'pro_monthly';
  planName: string;
  isPremium: boolean;
  status: string;
  dailyRequestsUsed: number;
  dailyLimit: number;
  remainingToday: number;
  totalLifetimeRequests: number;
  customQuotaOverride: number | null;
  subscriptionId?: string;
  paypalCustomerId?: string;
  renewalDate?: string;
  joinedAt: string;
  lastActive: string;
}

export const SaasSubscriptionAdminDeck: React.FC = () => {
  const { language } = useLanguage();
  const isTigrinya = language === 'ti' || language === 'ti_tg';
  const { isProOrHigher } = useSubscription();

  const [users, setUsers] = useState<SaasUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [editingCustomQuotaUserId, setEditingCustomQuotaUserId] = useState<string | null>(null);
  const [customQuotaInput, setCustomQuotaInput] = useState<number>(5);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const toastTimerRef = React.useRef<number | null>(null);

  const normalizeSaasUser = (raw: any): SaasUser => {
    const plan = raw?.plan || 'free';
    const isPremium = typeof raw?.isPremium === 'boolean' ? raw.isPremium : plan !== 'free';
    const dailyLimit = Number(raw?.dailyLimit ?? (isPremium ? 1000 : 25)) || 25;
    const dailyRequestsUsed = Number(raw?.dailyRequestsUsed ?? 0) || 0;
    return {
      userId: String(raw?.userId || 'usr_guest'),
      email: String(raw?.email || raw?.userEmail || 'guest@axumite.ai'),
      plan,
      planName: String(raw?.planName || (isPremium ? 'Premium Pro' : 'Free Tier')),
      isPremium,
      status: String(raw?.status || 'none'),
      dailyRequestsUsed,
      dailyLimit,
      remainingToday: Number(raw?.remainingToday ?? Math.max(0, dailyLimit - dailyRequestsUsed)),
      totalLifetimeRequests: Number(raw?.totalLifetimeRequests ?? raw?.totalRequestsLifetime ?? 0),
      customQuotaOverride:
        raw?.customQuotaOverride !== undefined ? raw.customQuotaOverride : null,
      subscriptionId: raw?.subscriptionId,
      paypalCustomerId: raw?.paypalCustomerId,
      renewalDate: raw?.renewalDate,
      joinedAt: String(raw?.joinedAt || new Date().toISOString()),
      lastActive: String(raw?.lastActive || new Date().toISOString()),
    };
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { ok, data } = await authorizedPayPalFetch('/api/admin/saas/users');
      if (ok && Array.isArray(data?.users)) {
        setUsers(data.users.map(normalizeSaasUser));
      }
    } catch (err) {
      console.warn('Failed to fetch SaaS user list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const triggerToast = (msg: string) => {
    setActionSuccessMessage(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setActionSuccessMessage(null), 3500);
  };

  const handleManageUser = async (userId: string, action: string, extraData: any = {}) => {
    setIsProcessingAction(true);
    try {
      const { ok, data } = await authorizedPayPalFetch('/api/admin/saas/manage-user', {
        method: 'POST',
        body: JSON.stringify({ userId, action, ...extraData }),
      });
      if (ok && data?.success) {
        triggerToast(data.message || 'Action executed successfully.');
        await fetchUsers();
      } else {
        triggerToast(data?.error || 'Failed to update user SaaS state.');
      }
    } catch (e: any) {
      triggerToast(e.message || 'Network request failed.');
    } finally {
      setIsProcessingAction(false);
      setEditingCustomQuotaUserId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (u.email || '').toLowerCase().includes(q) ||
      (u.userId || '').toLowerCase().includes(q) ||
      (u.planName || '').toLowerCase().includes(q);
    
    if (!matchesSearch) return false;
    if (selectedPlanFilter === 'free') return !u.isPremium;
    if (selectedPlanFilter === 'premium') return u.isPremium;
    return true;
  });

  const totalUsers = users.length;
  const premiumCount = users.filter((u) => u.isPremium).length;
  const freeCount = users.filter((u) => !u.isPremium).length;
  const totalDailyAiUsage = users.reduce((acc, u) => acc + (u.dailyRequestsUsed || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview Metrics */}
      <div className="bg-gradient-to-br from-[#120F1F] via-[#1B142C] to-[#0D0B18] border border-[#8E6D28]/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#8E6D28]/25 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <Crown className="w-6 h-6 text-[#F3E5AB]" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {isTigrinya ? 'ናይ SaaS ምዝገባን ደረት ጠለባትን ምሕደራ' : 'SaaS Subscription & AI Rate Quota Engine'}
              </h2>
            </div>
            <p className="text-xs text-amber-200/80 mt-1 max-w-2xl">
              {isTigrinya
                ? 'ናይ ነጻ ተጠቀምቲ ደረት፣ ናይ ፕሪምየም ተጠቀምቲ ደረት ኣልቦ ግልጋሎትን PayPal ክፍሊትን ብቐጥታ ካብዚ ሓደ መድረኽ ምምሕዳር።'
                : 'Manage Free and Pro tiers, monitor daily AI quotas, PayPal subscriptions, and grant verified admin overrides.'}
            </p>
          </div>

          <button
            onClick={fetchUsers}
            disabled={loading}
            className="px-4 py-2.5 bg-[#2B1D45] hover:bg-[#3D2960] border border-[#C5A059]/40 text-[#F3E5AB] rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shadow-md self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{isTigrinya ? 'ሓድሽ ሓበሬታ ኣምጽእ' : 'Refresh State'}</span>
          </button>
        </div>

        {/* 4 Summary Stat Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-6 relative z-10">
          <div className="bg-[#0A0713]/80 border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>{isTigrinya ? 'ጠቕላላ ተጠቀምቲ' : 'Total SaaS Users'}</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-white">{totalUsers}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Active Directory</p>
          </div>

          <div className="bg-[#0A0713]/80 border border-amber-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between text-amber-300 text-xs mb-1">
              <span>{isTigrinya ? 'ፕሪምየም ምዝገባ' : 'Premium Subscribers'}</span>
              <Crown className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-300">{premiumCount}</p>
            <p className="text-[10px] text-amber-400/80 mt-0.5">Advanced Gemini Models &amp; Unlimited</p>
          </div>

          <div className="bg-[#0A0713]/80 border border-slate-700/40 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-300 text-xs mb-1">
              <span>{isTigrinya ? 'ነጻ ፕላን (5/መዓልቲ)' : 'Free Tier Users'}</span>
              <Zap className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-slate-200">{freeCount}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Strict 5 AI Requests / Day</p>
          </div>

          <div className="bg-[#0A0713]/80 border border-emerald-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between text-emerald-300 text-xs mb-1">
              <span>{isTigrinya ? 'ናይ ሎሚ AI ጠለባት' : 'AI Requests Today'}</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-300">{totalDailyAiUsage}</p>
            <p className="text-[10px] text-emerald-400/80 mt-0.5">Enforced Server-Side</p>
          </div>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionSuccessMessage && (
        <div className="bg-emerald-950/90 border border-emerald-500/50 rounded-2xl p-4 text-emerald-200 text-xs flex items-center justify-between shadow-xl animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{actionSuccessMessage}</span>
          </div>
          <button onClick={() => setActionSuccessMessage(null)} className="text-emerald-400 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#0E0B1A] border border-[#8E6D28]/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isTigrinya ? 'ብኢመይል ወይ መለለዪ ድለይ...' : 'Search by email or user ID...'}
            className="w-full pl-9 pr-3 py-2 bg-[#1A142A] border border-[#8E6D28]/25 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C5A059]"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setSelectedPlanFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              selectedPlanFilter === 'all'
                ? 'bg-[#C5A059] text-black'
                : 'bg-[#1D1630] text-slate-400 hover:text-white'
            }`}
          >
            All Plans ({totalUsers})
          </button>
          <button
            onClick={() => setSelectedPlanFilter('premium')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              selectedPlanFilter === 'premium'
                ? 'bg-amber-500 text-black'
                : 'bg-[#1D1630] text-amber-300/70 hover:text-amber-200'
            }`}
          >
            Premium ({premiumCount})
          </button>
          <button
            onClick={() => setSelectedPlanFilter('free')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              selectedPlanFilter === 'free'
                ? 'bg-blue-600 text-white'
                : 'bg-[#1D1630] text-slate-400 hover:text-white'
            }`}
          >
            Free Tier ({freeCount})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#0B0914] border border-[#8E6D28]/30 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#150F24] border-b border-[#8E6D28]/30 text-[11px] font-mono tracking-wider text-amber-300/80 uppercase">
                <th className="py-3.5 px-4">User &amp; Identity</th>
                <th className="py-3.5 px-4">Subscription Plan</th>
                <th className="py-3.5 px-4">Daily AI Quota (Today)</th>
                <th className="py-3.5 px-4">PayPal &amp; Billing</th>
                <th className="py-3.5 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#C5A059]" />
                    <p>Loading SaaS user database...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Info className="w-6 h-6 mx-auto mb-2 text-slate-500" />
                    <p>No SaaS users match your search criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isEditingQuota = editingCustomQuotaUserId === u.userId;
                  const isQuotaExceeded = !u.isPremium && u.dailyRequestsUsed >= u.dailyLimit;

                  return (
                    <tr key={u.userId} className="hover:bg-[#151026]/60 transition-colors">
                      {/* Identity */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-white flex items-center space-x-1.5">
                          <span>{u.email}</span>
                          {u.email === 'beckylove2004@gmail.com' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono border border-amber-500/40">
                              SUPER-ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                          ID: {u.userId} &bull; Joined: {new Date(u.joinedAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-4 px-4">
                        {u.isPremium ? (
                          <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/50 text-amber-300 font-bold text-[11px]">
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>{u.planName || 'Premium / Sovereign'}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-[11px]">
                            <Zap className="w-3 h-3 text-blue-400" />
                            <span>Free Tier</span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1">
                          Status: <span className="text-emerald-400 font-semibold uppercase">{u.status}</span>
                        </div>
                      </td>

                      {/* Daily Quota */}
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <span className={`font-mono font-bold ${isQuotaExceeded ? 'text-rose-400' : 'text-slate-200'}`}>
                            {u.dailyRequestsUsed} / {u.isPremium ? '∞ (10,000)' : u.dailyLimit}
                          </span>
                          {isQuotaExceeded && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/50 text-[9px] font-bold">
                              LIMIT REACHED
                            </span>
                          )}
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-36 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                          <div
                            className={`h-full rounded-full ${
                              u.isPremium
                                ? 'bg-amber-400'
                                : isQuotaExceeded
                                ? 'bg-rose-500'
                                : 'bg-blue-500'
                            }`}
                            style={{
                              width: u.isPremium
                                ? '10%'
                                : `${Math.min(100, (u.dailyRequestsUsed / Math.max(1, u.dailyLimit)) * 100)}%`,
                            }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Lifetime requests: {(u.totalLifetimeRequests || 0).toLocaleString()}
                        </div>
                      </td>

                      {/* PayPal Details */}
                      <td className="py-4 px-4">
                        <div className="text-[11px] font-mono text-slate-300">
                          {u.subscriptionId ? (
                            <span className="text-emerald-300 font-medium">Sub: {u.subscriptionId.slice(0, 14)}...</span>
                          ) : (
                            <span className="text-slate-500">No active PayPal sub</span>
                          )}
                        </div>
                        {u.renewalDate && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Renews: {new Date(u.renewalDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {/* Admin Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5 flex-wrap gap-y-1">
                          {/* Plan Switcher Button */}
                          {u.isPremium ? (
                            <button
                              onClick={() => handleManageUser(u.userId, 'downgrade_to_free')}
                              disabled={isProcessingAction}
                              className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Downgrade to Free tier (5 queries/day)"
                            >
                              Downgrade to Free
                            </button>
                          ) : (
                            <button
                              onClick={() => handleManageUser(u.userId, 'upgrade_to_premium', { planId: 'pro_yearly' })}
                              disabled={isProcessingAction}
                              className="px-2.5 py-1 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-black font-bold rounded-lg text-[11px] transition-all cursor-pointer shadow-md flex items-center space-x-1"
                              title="Instantly upgrade user to Premium"
                            >
                              <Crown className="w-3 h-3" />
                              <span>Upgrade to Premium</span>
                            </button>
                          )}

                          {/* Reset Daily Count Button */}
                          <button
                            onClick={() => handleManageUser(u.userId, 'reset_daily_usage')}
                            disabled={isProcessingAction}
                            className="px-2 py-1 bg-[#1F1733] hover:bg-[#2C2147] border border-[#C5A059]/30 text-amber-200 rounded-lg text-[11px] font-medium transition-colors cursor-pointer flex items-center space-x-1"
                            title="Reset daily usage to 0"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset (0/5)</span>
                          </button>

                          {/* Custom Quota Override Toggle */}
                          {isEditingQuota ? (
                            <div className="inline-flex items-center space-x-1 bg-[#1A142A] p-1 rounded-lg border border-[#C5A059]">
                              <input
                                type="number"
                                min="1"
                                max="1000"
                                value={customQuotaInput}
                                onChange={(e) => setCustomQuotaInput(parseInt(e.target.value, 10) || 5)}
                                className="w-14 px-1 py-0.5 bg-black text-white text-xs rounded text-center"
                              />
                              <button
                                onClick={() => handleManageUser(u.userId, 'set_custom_quota', { customQuota: customQuotaInput })}
                                className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingCustomQuotaUserId(null)}
                                className="p-1 bg-slate-700 hover:bg-slate-600 text-white rounded cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingCustomQuotaUserId(u.userId);
                                setCustomQuotaInput(u.dailyLimit);
                              }}
                              className="px-2 py-1 bg-[#1A142A] hover:bg-[#251D3D] border border-slate-700 text-slate-300 rounded-lg text-[11px] transition-colors cursor-pointer"
                              title="Set custom daily request limit"
                            >
                              Set Quota
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
