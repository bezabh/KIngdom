import React, { useEffect, useState } from 'react';
import {
  Check,
  Code2,
  CreditCard,
  Download,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';
import { UserProfile } from '../../types';
import {
  deleteAllUserTranslatorData,
  exportAllUserTranslatorData,
} from '../../services/translatorSuiteService';
import { useOptionalTranslationActions } from '../../context/TranslationServiceContext';
import { getTranslatorThemeTokens, TranslatorThemeMode } from './translatorTheme';

interface TranslatorSuiteSettingsModalProps {
  isOpen: boolean;
  initialTab?: 'plans' | 'api' | 'privacy';
  theme: TranslatorThemeMode;
  user?: UserProfile;
  onClose: () => void;
  onOpenPaymentCheckout?: () => void;
}

export const TranslatorSuiteSettingsModal: React.FC<TranslatorSuiteSettingsModalProps> = ({
  isOpen,
  initialTab = 'plans',
  theme,
  user,
  onClose,
  onOpenPaymentCheckout,
}) => {
  const t = getTranslatorThemeTokens(theme);
  const { subscription, cancelSubscription, setSelectedPlanType } = useSubscription();
  const translationActions = useOptionalTranslationActions();
  const [tab, setTab] = useState<'plans' | 'api' | 'privacy'>(initialTab);
  const [apiEndpoints, setApiEndpoints] = useState<Array<{ method: string; path: string; summary: string }>>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      fetch('/api/docs')
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d.endpoints)) setApiEndpoints(d.endpoints);
        })
        .catch(() => {});
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handlePlanSelect = async (tier: 'free' | 'pro' | 'enterprise') => {
    setStatusMsg(null);
    if (tier === 'free') {
      const res = await cancelSubscription('Switched to Free Explorer plan');
      setStatusMsg(res.success ? 'Subscription cancelled at period end.' : res.error || 'Cancelled.');
      return;
    }
    setSelectedPlanType('pro_monthly');
    if (onOpenPaymentCheckout) {
      onClose();
      onOpenPaymentCheckout();
      return;
    }
    setStatusMsg('Please open the PayPal checkout view to activate Axumite Pro.');
  };

  const handleExportMyData = async () => {
    const json = await exportAllUserTranslatorData(user);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axumite-translator-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMsg('Personal translator archive exported as JSON.');
  };

  const handleDeleteAllData = async () => {
    const res = await deleteAllUserTranslatorData(user);
    await translationActions?.refreshOfflinePacks(false);
    setConfirmDelete(false);
    setStatusMsg(`Cleared all local offline packs, sessions, and ${res.deletedCount} cloud translator records.`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className={`w-full max-w-4xl max-h-[88vh] rounded-3xl overflow-hidden flex flex-col ${t.pageShell}`}>
        {/* Modal Header */}
        <div className={`px-5 py-4 flex items-center justify-between border-b ${t.border}`}>
          <div className="flex items-center gap-2.5">
            <Sparkles className={`w-5 h-5 ${t.goldText}`} />
            <h3 className={`text-base font-extrabold ${t.textPrimary}`}>
              Subscription Plans, Privacy Controls & API Docs
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl cursor-pointer ${t.secondaryButton}`}
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`px-5 py-2.5 flex flex-wrap gap-2 border-b ${t.border}`}>
          {[
            { id: 'plans', label: 'Free / Pro / Premium Plans', icon: CreditCard },
            { id: 'privacy', label: 'Privacy & Data Deletion', icon: ShieldAlert },
            { id: 'api', label: 'API Documentation', icon: Code2 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  tab === item.id ? t.primaryButton : t.secondaryButton
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {statusMsg && (
            <div className={`rounded-xl p-3 text-xs font-semibold ${t.goldBadge}`}>
              {statusMsg}
            </div>
          )}

          {tab === 'plans' && (
            <div className="space-y-4">
              <div className={`rounded-2xl p-3.5 text-xs flex flex-wrap items-center justify-between gap-2 ${t.subCardBg}`}>
                <span>
                  Current Plan: <strong className={t.goldText}>{subscription.planName}</strong> ({subscription.status})
                </span>
                <span className={t.textMuted}>
                  Verified PayPal Billing: Payment details are secured by PayPal & never stored in app databases.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Free */}
                <div className={`rounded-2xl p-4 space-y-3 flex flex-col justify-between ${t.cardBg}`}>
                  <div className="space-y-2">
                    <h4 className={`text-sm font-extrabold ${t.textPrimary}`}>Free</h4>
                    <p className={`text-xl font-black ${t.goldText}`}>$0 / mo</p>
                    <ul className={`text-xs space-y-1.5 ${t.textSecondary}`}>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Limited daily translations</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Basic text & voice translation</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Ethiopic Fidel word breakdown</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePlanSelect('free')}
                    className={`w-full min-h-[40px] rounded-xl text-xs cursor-pointer ${t.secondaryButton}`}
                  >
                    {subscription.tier === 'free' ? 'Current Plan' : 'Select Free'}
                  </button>
                </div>

                {/* Pro */}
                <div className={`rounded-2xl p-4 space-y-3 flex flex-col justify-between ${t.cardBg}`}>
                  <div className="space-y-2">
                    <h4 className={`text-sm font-extrabold ${t.textPrimary}`}>Pro</h4>
                    <p className={`text-xl font-black ${t.goldText}`}>$9.99 / mo</p>
                    <ul className={`text-xs space-y-1.5 ${t.textSecondary}`}>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Extended AI voice translation</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Camera OCR & Screen Capture</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Two-person Conversation mode</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Cloud translation history</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePlanSelect('pro')}
                    className={`w-full min-h-[40px] rounded-xl text-xs cursor-pointer ${t.primaryButton}`}
                  >
                    {subscription.tier === 'pro' ? 'Active Plan (Manage)' : 'Upgrade to Pro'}
                  </button>
                </div>

                {/* Premium / Imperial */}
                <div className={`rounded-2xl p-4 space-y-3 flex flex-col justify-between ${t.cardBg}`}>
                  <div className="space-y-2">
                    <h4 className={`text-sm font-extrabold ${t.textPrimary}`}>Premium</h4>
                    <p className={`text-xl font-black ${t.goldText}`}>$29.99 / mo</p>
                    <ul className={`text-xs space-y-1.5 ${t.textSecondary}`}>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Live WebRTC translated calls</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Downloadable offline language packs</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Multi-page Camera PDF export</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Highest API & voice quotas</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePlanSelect('enterprise')}
                    className={`w-full min-h-[40px] rounded-xl text-xs cursor-pointer ${t.primaryButton}`}
                  >
                    {subscription.tier === 'enterprise' ? 'Active Plan (Manage)' : 'Upgrade to Premium'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'privacy' && (
            <div className="space-y-4">
              <div className={`rounded-2xl p-4 space-y-2 text-xs ${t.cardBg}`}>
                <h4 className={`text-sm font-bold ${t.textPrimary}`}>Data Protection & User Controls</h4>
                <p className={t.textMuted}>
                  Camera frames and screen captures require explicit user permission per session and are never captured in the background. You can export your translator history or permanently erase all stored voice logs, call transcripts, OCR scans, and offline language packs anytime.
                </p>
                <div className="flex flex-wrap gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleExportMyData}
                    className={`min-h-[42px] px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer ${t.secondaryButton}`}
                  >
                    <Download className="w-4 h-4" />
                    <span>Export My Data (JSON)</span>
                  </button>

                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className={`min-h-[42px] px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer ${t.dangerButton}`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete All My Translator Data</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteAllData}
                        className="min-h-[42px] px-4 rounded-xl text-xs font-bold bg-rose-600 text-white cursor-pointer"
                      >
                        Confirm Permanent Deletion
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className={`min-h-[42px] px-3 rounded-xl text-xs cursor-pointer ${t.secondaryButton}`}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'api' && (
            <div className="space-y-2.5">
              <p className={`text-xs ${t.textMuted}`}>
                Live server endpoint catalog (<code className="font-mono">GET /api/docs</code>):
              </p>
              <div className="space-y-2">
                {apiEndpoints.map((ep, idx) => (
                  <div key={idx} className={`rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs ${t.subCardBg}`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${t.goldBadge}`}>
                        {ep.method}
                      </span>
                      <code className={`font-mono font-semibold ${t.textPrimary}`}>{ep.path}</code>
                    </div>
                    <span className={t.textMuted}>{ep.summary}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
