import React from 'react';
import { X, Crown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { UserProfile } from '../types';
import { PaymentSystem } from './PaymentSystem';

interface PricingPlanComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile;
  onUpdateUser?: (updated: UserProfile) => void;
}

export const PricingPlanComparisonModal: React.FC<PricingPlanComparisonModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const { language } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#0B0D17] border border-[#8E6D28]/40 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl relative my-auto max-h-[94vh] flex flex-col text-slate-100">
        <div className="p-5 bg-[#121422] border-b border-[#8E6D28]/30 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#003087] to-[#0070BA] flex items-center justify-center text-white shadow-lg">
              <Crown className="w-5 h-5 text-[#F3E5AB]" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-cinzel text-white">
                {language === 'ti' ? 'ፕላናትን ክፍሊት PayPalን' : 'Axumite Pro Plans & PayPal Checkout'}
              </h2>
              <p className="text-xs text-slate-400">
                Monthly (€9.99/mo) & Yearly (€79.99/yr) PayPal recurring subscriptions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#1A1E33] hover:bg-[#252A47] text-slate-300 border border-slate-700 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto">
          <PaymentSystem user={user} initialSubTab="checkout" />
        </div>
      </div>
    </div>
  );
};
