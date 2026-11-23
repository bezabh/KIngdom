import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Smartphone,
  Building2,
  Globe,
  Plus,
  Check,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  Star,
  AlertCircle,
  RefreshCw,
  X,
  Lock,
  Sparkles,
  Wallet,
  HelpCircle,
} from 'lucide-react';
import {
  AddPaymentMethodInput,
  CardBrand,
  PaymentMethodType,
  SavedPaymentMethod,
  SupportedCurrency,
  UserProfile,
} from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  addPaymentMethod,
  detectCardBrand,
  fetchPaymentMethods,
  formatCardNumber,
  formatExpiry,
  mapMethodTypeToDisplayLabel,
  PAYMENT_METHODS_UPDATED_EVENT,
  removePaymentMethod,
  setDefaultPaymentMethod,
  validateCardLuhn,
} from '../services/paymentMethodService';

interface PaymentMethodsManagerProps {
  user?: UserProfile;
  mode?: 'panel' | 'modal';
  isOpen?: boolean;
  onClose?: () => void;
  onSelectMethod?: (method: SavedPaymentMethod) => void;
  selectedMethodId?: string;
  onMethodsChanged?: (methods: SavedPaymentMethod[]) => void;
  defaultOpenAddForm?: boolean;
}

const BANK_PRESETS = [
  {
    name: 'Commercial Bank of Eritrea / Tigray (CBE)',
    swift: 'CBOEERAS',
    country: 'Eritrea / Ethiopia',
    currency: 'ERN' as SupportedCurrency,
  },
  {
    name: 'Bank of Eritrea (BOE)',
    swift: 'BERTERAS',
    country: 'Eritrea',
    currency: 'ERN' as SupportedCurrency,
  },
  {
    name: 'Himbol Remittance & Nakfa Pay',
    swift: 'HIMBERAS',
    country: 'Eritrea / Diaspora',
    currency: 'USD' as SupportedCurrency,
  },
  {
    name: 'International SWIFT / IBAN Wire',
    swift: 'AXUMERAAXXX',
    country: 'Global',
    currency: 'USD' as SupportedCurrency,
  },
];

export const PaymentMethodsManager: React.FC<PaymentMethodsManagerProps> = ({
  user,
  mode = 'panel',
  isOpen = true,
  onClose,
  onSelectMethod,
  selectedMethodId,
  onMethodsChanged,
  defaultOpenAddForm = false,
}) => {
  const { language } = useLanguage();
  const isTi = language === 'ti' || language === 'ti_tg';

  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<'all' | 'card' | 'mobile' | 'bank' | 'wallet'>('all');
  const [showAddForm, setShowAddForm] = useState<boolean>(defaultOpenAddForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Payment Method Form State
  const [methodType, setMethodType] = useState<PaymentMethodType>('card');
  const [labelInput, setLabelInput] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(user?.name || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [showCvvHelp, setShowCvvHelp] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState('+251 9');
  const [walletEmail, setWalletEmail] = useState(user?.email || '');
  const [bankName, setBankName] = useState(BANK_PRESETS[0].name);
  const [bankAccount, setBankAccount] = useState('');
  const [swiftCode, setSwiftCode] = useState(BANK_PRESETS[0].swift);
  const [currency, setCurrency] = useState<SupportedCurrency>('USD');
  const [setAsDefault, setSetAsDefault] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const loadMethods = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await fetchPaymentMethods(user?.id, user?.email);
      setMethods(list);
      onMethodsChanged?.(list);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.email, onMethodsChanged]);

  useEffect(() => {
    if (isOpen) {
      loadMethods();
    }
  }, [isOpen, loadMethods]);

  useEffect(() => {
    const handleUpdated = (e: Event) => {
      const custom = e as CustomEvent<{ methods?: SavedPaymentMethod[] }>;
      if (Array.isArray(custom.detail?.methods)) {
        setMethods(custom.detail.methods);
      }
    };
    window.addEventListener(PAYMENT_METHODS_UPDATED_EVENT, handleUpdated);
    return () => window.removeEventListener(PAYMENT_METHODS_UPDATED_EVENT, handleUpdated);
  }, []);

  useEffect(() => {
    if (user?.name && !cardHolder) setCardHolder(user.name);
    if (user?.email && !walletEmail) setWalletEmail(user.email);
  }, [user?.name, user?.email, cardHolder, walletEmail]);

  if (mode === 'modal' && !isOpen) return null;

  const detectedBrand: CardBrand = detectCardBrand(cardNumber);
  const isCardNumberValid = cardNumber.replace(/\D/g, '').length >= 13 && validateCardLuhn(cardNumber);

  const resetForm = () => {
    setLabelInput('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setBankAccount('');
    setPhoneNumber('+251 9');
    setFeedback(null);
  };

  const handleTypeSelect = (nextType: PaymentMethodType) => {
    setMethodType(nextType);
    setFeedback(null);
    if (nextType === 'telebirr' || nextType === 'cbe_birr') {
      setCurrency('ETB');
    } else if (nextType === 'bank_wire') {
      setCurrency('ERN');
    } else {
      setCurrency('USD');
    }
  };

  const handleSubmitNewMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSaving(true);

    try {
      const payload: AddPaymentMethodInput = {
        userId: user?.id,
        userEmail: user?.email,
        type: methodType,
        label: labelInput.trim() || undefined,
        currency,
        setAsDefault,
      };

      if (methodType === 'card') {
        payload.cardNumber = cardNumber;
        payload.holderName = cardHolder.trim() || user?.name || 'Axumite Member';
        payload.expiry = cardExpiry;
        payload.cvv = cardCvv;
      } else if (methodType === 'telebirr' || methodType === 'cbe_birr') {
        payload.phoneNumber = phoneNumber;
      } else if (methodType === 'bank_wire') {
        payload.bankName = bankName;
        payload.accountNumber = bankAccount;
        payload.swiftCode = swiftCode;
        payload.holderName = cardHolder.trim() || user?.name;
      } else {
        payload.email = walletEmail.trim() || user?.email;
      }

      const updated = await addPaymentMethod(payload);
      setMethods(updated);
      onMethodsChanged?.(updated);
      resetForm();
      setShowAddForm(false);
      setFeedback({
        type: 'success',
        text: isTi
          ? 'ሓድሽ ናይ ክፍሊት መንገዲ ብውሑስ መንገዲ ተዓቂቡ ኣሎ!'
          : 'New payment method tokenized and saved securely!',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || (isTi ? 'ምዕቃብ ኣይተኻእለን።' : 'Could not save payment method.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMakeDefault = async (methodId: string) => {
    setBusyId(methodId);
    setFeedback(null);
    try {
      const updated = await setDefaultPaymentMethod(methodId, user?.id, user?.email);
      setMethods(updated);
      onMethodsChanged?.(updated);
      setFeedback({
        type: 'success',
        text: isTi ? 'ቀንዲ (Default) ናይ ክፍሊት መንገዲ ተቐይሩ ኣሎ።' : 'Default payment method updated.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (methodId: string) => {
    setBusyId(methodId);
    setFeedback(null);
    try {
      const updated = await removePaymentMethod(methodId, user?.id, user?.email);
      setMethods(updated);
      onMethodsChanged?.(updated);
      setConfirmDeleteId(null);
      setFeedback({
        type: 'success',
        text: isTi ? 'ናይ ክፍሊት መንገዲ ተደምሲሱ ኣሎ።' : 'Payment method removed.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const filteredMethods = methods.filter((m) => {
    if (filterType === 'all') return true;
    if (filterType === 'card') return m.type === 'card';
    if (filterType === 'mobile') return m.type === 'telebirr' || m.type === 'cbe_birr';
    if (filterType === 'bank') return m.type === 'bank_wire';
    return m.type === 'google_pay' || m.type === 'apple_pay' || m.type === 'paypal';
  });

  const renderMethodIcon = (m: SavedPaymentMethod) => {
    switch (m.type) {
      case 'card':
        return (
          <div className="w-11 h-8 rounded-lg bg-gradient-to-br from-[#1C2E52] to-[#0A1326] border border-[#C5A059]/40 flex items-center justify-center text-[10px] font-black text-[#F3E5AB] uppercase shadow-inner shrink-0">
            {m.brand === 'mastercard' ? 'MC' : m.brand === 'amex' ? 'AMEX' : m.brand === 'discover' ? 'DISC' : 'VISA'}
          </div>
        );
      case 'telebirr':
      case 'cbe_birr':
        return (
          <div className="w-11 h-8 rounded-lg bg-gradient-to-br from-cyan-600/30 to-sky-900/40 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
        );
      case 'bank_wire':
        return (
          <div className="w-11 h-8 rounded-lg bg-gradient-to-br from-emerald-600/25 to-emerald-950/50 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-11 h-8 rounded-lg bg-gradient-to-br from-amber-500/25 to-amber-900/40 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
        );
    }
  };

  const content = (
    <div className="bg-[#121422] border border-[#8E6D28]/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 text-slate-100">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8E6D28] to-[#C5A059] flex items-center justify-center text-black shadow-md shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-cinzel text-base sm:text-lg font-black text-[#F3E5AB]">
                {isTi ? 'ናይ ክፍሊት መንገድታት (Payment Methods)' : 'Saved Payment Methods'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#1A1E33] text-amber-300 border border-[#8E6D28]/40">
                {methods.length}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isTi
                ? 'ካርድ፣ ቴሌብር፣ CBE ብር፣ ባንክ ሓዋላ ወይ ዲጂታል ዋሌት ብውሑስ መንገዲ ወስኹን ኣመሓድሩን።'
                : 'Add & manage Cards, Telebirr, CBE Birr, Eritrean/SWIFT Bank Wires, Google Pay, Apple Pay & PayPal.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            id="btn-toggle-add-payment-method"
            onClick={() => {
              setShowAddForm((prev) => !prev);
              setFeedback(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center space-x-1.5 transition-all cursor-pointer shadow ${
              showAddForm
                ? 'bg-[#1A1E33] text-slate-200 border border-slate-700 hover:bg-[#242A44]'
                : 'bg-gradient-to-r from-[#8E6D28] to-[#C5A059] text-black hover:brightness-110'
            }`}
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>
              {showAddForm
                ? isTi ? 'ዕጾ (Close)' : 'Close Form'
                : isTi ? 'ሓድሽ መንገዲ ክፍሊት ወስኽ' : 'Add Payment Method'}
            </span>
          </button>

          {mode === 'modal' && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#1A1E33] text-slate-400 hover:text-white border border-slate-700 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/70 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Add Payment Method Form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmitNewMethod}
          className="bg-[#0E101D] border border-[#C5A059]/40 rounded-2xl p-4 sm:p-5 space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#F3E5AB] flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{isTi ? 'ሓድሽ ናይ ክፍሊት መንገዲ ምምዝጋብ' : 'Add New Payment Method'}</span>
            </h4>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
              <Lock className="w-3 h-3" />
              <span>PCI-Safe Tokenization</span>
            </span>
          </div>

          {/* 7 Method Type Selector Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {(
              [
                { id: 'card', label: isTi ? 'ካርድ (Card)' : 'Card', icon: CreditCard },
                { id: 'telebirr', label: 'Telebirr', icon: Smartphone },
                { id: 'cbe_birr', label: 'CBE Birr', icon: Smartphone },
                { id: 'bank_wire', label: isTi ? 'ባንክ / SWIFT' : 'Bank Wire', icon: Building2 },
                { id: 'google_pay', label: 'Google Pay', icon: Globe },
                { id: 'apple_pay', label: 'Apple Pay', icon: Wallet },
                { id: 'paypal', label: 'PayPal', icon: Globe },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const active = methodType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  id={`add-method-type-${opt.id}`}
                  onClick={() => handleTypeSelect(opt.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-b from-[#2A2210] to-[#1A162B] border-[#C5A059] text-[#F3E5AB] shadow-md'
                      : 'bg-[#151828] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px] text-center leading-tight">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Dynamic Fields per Payment Method Type */}
          {methodType === 'card' && (
            <div className="space-y-3 pt-1">
              {/* Live Mini 3D Preview Strip */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#0C203F] via-[#13294E] to-[#1D1536] border border-white/10 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-amber-300">
                    {detectedBrand.toUpperCase()} • {isCardNumberValid ? 'LUHN VALID ✓' : 'CARD PREVIEW'}
                  </div>
                  <div className="font-mono text-sm font-bold text-white tracking-widest">
                    {cardNumber.replace(/\D/g, '').length >= 4
                      ? `•••• •••• •••• ${cardNumber.replace(/\D/g, '').slice(-4)}`
                      : '•••• •••• •••• ••••'}
                  </div>
                  <div className="text-[10px] text-slate-300 font-mono">
                    {(cardHolder || 'CARDHOLDER NAME').toUpperCase()} • {cardExpiry || 'MM/YY'}
                  </div>
                </div>
                <CreditCard className="w-7 h-7 text-[#F3E5AB]/70" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {isTi ? 'ሽም በዓል ካርድ (Cardholder Name)' : 'Cardholder Name'}
                  </label>
                  <input
                    id="input-pm-holder"
                    type="text"
                    required
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="Becky Love"
                    className="w-full bg-[#151828] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {isTi ? 'ቑጽሪ ካርድ (Card Number)' : 'Card Number'}
                  </label>
                  <input
                    id="input-pm-card-number"
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                    className="w-full bg-[#151828] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {isTi ? 'ዕለት መወዳእታ (Expiry MM/YY)' : 'Expiry Date (MM/YY)'}
                  </label>
                  <input
                    id="input-pm-expiry"
                    type="text"
                    required
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    placeholder="09/28"
                    maxLength={5}
                    className="w-full bg-[#151828] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1">
                    <span>CVV / CVC</span>
                    <button
                      type="button"
                      onClick={() => setShowCvvHelp((v) => !v)}
                      className="text-slate-400 hover:text-amber-300 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </label>
                  <input
                    id="input-pm-cvv"
                    type="password"
                    required
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    maxLength={4}
                    className="w-full bg-[#151828] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {showCvvHelp && (
                <div className="text-[11px] text-slate-300 bg-[#151828] border border-slate-700 rounded-xl p-2.5">
                  {isTi
                    ? 'CVV ንምርግጋጽ ጥራይ ይጥቀም እዩ — ኣብ ዳታቤዝና ፈጺሙ ኣይዕቀብን እዩ።'
                    : 'CVV is used once for verification and is NEVER stored in our database.'}
                </div>
              )}
            </div>
          )}

          {(methodType === 'telebirr' || methodType === 'cbe_birr') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {methodType === 'telebirr'
                    ? isTi ? 'ናይ ቴሌብር ስልኪ ቑጽሪ' : 'Telebirr Mobile Number'
                    : isTi ? 'ናይ CBE ብር ስልኪ ቑጽሪ' : 'CBE Birr Mobile Number'}
                </label>
                <input
                  id="input-pm-phone"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+251 911 234 567"
                  className="w-full bg-[#151828] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {isTi ? 'መለለዪ ሽም (Optional Nickname)' : 'Wallet Nickname (Optional)'}
                </label>
                <input
                  type="text"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder={methodType === 'telebirr' ? 'Personal Telebirr' : 'CBE Birr Wallet'}
                  className="w-full bg-[#151828] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          {methodType === 'bank_wire' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {isTi ? 'ባንክ ምረጹ (Bank Institution)' : 'Bank Institution'}
                </label>
                <select
                  value={bankName}
                  onChange={(e) => {
                    const preset = BANK_PRESETS.find((b) => b.name === e.target.value);
                    setBankName(e.target.value);
                    if (preset) {
                      setSwiftCode(preset.swift);
                      setCurrency(preset.currency);
                    }
                  }}
                  className="w-full bg-[#151828] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {BANK_PRESETS.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {isTi ? 'ቑጽሪ ሕሳብ / IBAN' : 'Account Number / IBAN'}
                </label>
                <input
                  id="input-pm-bank-account"
                  type="text"
                  required
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="20194829103 or ER92..."
                  className="w-full bg-[#151828] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">SWIFT / BIC Code</label>
                <input
                  type="text"
                  value={swiftCode}
                  onChange={(e) => setSwiftCode(e.target.value.toUpperCase())}
                  placeholder="CBOEERAS"
                  className="w-full bg-[#151828] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono uppercase text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {isTi ? 'ሽም ወናኒ ሕሳብ' : 'Account Holder Name'}
                </label>
                <input
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="Account Holder"
                  className="w-full bg-[#151828] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          {(methodType === 'google_pay' || methodType === 'apple_pay' || methodType === 'paypal') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {methodType === 'paypal'
                    ? 'PayPal Email Address'
                    : methodType === 'google_pay'
                    ? 'Google Account Email'
                    : 'Apple ID Email'}
                </label>
                <input
                  id="input-pm-wallet-email"
                  type="email"
                  required
                  value={walletEmail}
                  onChange={(e) => setWalletEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#151828] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {isTi ? 'መለለዪ ሽም (Optional Label)' : 'Display Label (Optional)'}
                </label>
                <input
                  type="text"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder={mapMethodTypeToDisplayLabel(methodType, isTi)}
                  className="w-full bg-[#151828] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          {/* Currency & Default Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <div className="flex items-center space-x-3">
              <label className="text-[11px] font-semibold text-slate-300">
                {isTi ? 'ቀንዲ ገንዘብ:' : 'Currency:'}
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                className="bg-[#151828] border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-[#F3E5AB]"
              >
                <option value="USD">USD ($)</option>
                <option value="ERN">ERN (Nfk)</option>
                <option value="ETB">ETB (Br)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (CA$)</option>
                <option value="AUD">AUD (AU$)</option>
              </select>

              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer ml-2">
                <input
                  type="checkbox"
                  checked={setAsDefault}
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0 cursor-pointer"
                />
                <span>{isTi ? 'ቀንዲ (Default) ግበሮ' : 'Set as default'}</span>
              </label>
            </div>

            <div className="flex items-center space-x-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl bg-[#1A1E33] text-slate-300 text-xs font-bold hover:bg-[#232944] cursor-pointer"
              >
                {isTi ? 'ሰርዝ' : 'Cancel'}
              </button>
              <button
                type="submit"
                id="btn-save-payment-method"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#8E6D28] to-[#C5A059] text-black text-xs font-black flex items-center space-x-1.5 cursor-pointer hover:brightness-110 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isSaving ? (isTi ? 'ይዕቀብ ኣሎ...' : 'Saving...') : (isTi ? 'ዓቅብ (Save Method)' : 'Save Payment Method')}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'all', label: isTi ? 'ኩሎም (All)' : 'All Methods' },
            { id: 'card', label: isTi ? 'ካርድታት (Cards)' : 'Cards' },
            { id: 'mobile', label: 'Telebirr / CBE Birr' },
            { id: 'bank', label: isTi ? 'ባንክ / SWIFT' : 'Bank Wire' },
            { id: 'wallet', label: 'Google / Apple / PayPal' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              filterType === tab.id
                ? 'bg-[#C5A059] text-black shadow'
                : 'bg-[#0E101D] text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Saved Methods List */}
      {isLoading ? (
        <div className="py-10 flex items-center justify-center space-x-2 text-xs text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
          <span>{isTi ? 'ናይ ክፍሊት መንገድታት ይጽዓኑ ኣለዉ...' : 'Loading saved payment methods...'}</span>
        </div>
      ) : filteredMethods.length === 0 ? (
        <div className="py-10 text-center bg-[#0E101D] rounded-2xl border border-dashed border-slate-800 space-y-3">
          <Wallet className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-xs text-slate-400">
            {isTi ? 'ኣብዚ ምድብ ዝተዓቀበ ናይ ክፍሊት መንገዲ የለን።' : 'No saved payment methods in this category yet.'}
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8E6D28] to-[#C5A059] text-black text-xs font-black cursor-pointer"
          >
            + {isTi ? 'ሓድሽ መንገዲ ወስኽ' : 'Add Payment Method'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredMethods.map((m) => {
            const isSelected = selectedMethodId === m.id;
            const isBusy = busyId === m.id;
            return (
              <div
                key={m.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#1D1930] border-amber-400 ring-1 ring-amber-400/50 shadow-lg'
                    : m.isDefault
                    ? 'bg-[#171628] border-[#C5A059]/60'
                    : 'bg-[#0E101D] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    {renderMethodIcon(m)}
                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{m.label}</span>
                        {m.isDefault && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase tracking-wider">
                            DEFAULT
                          </span>
                        )}
                        {m.isVerified && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">
                            VERIFIED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                        {m.type === 'card' && `Exp ${m.expiry || '••/••'} • ${m.holderName || 'Member'} • ${m.currency}`}
                        {(m.type === 'telebirr' || m.type === 'cbe_birr') && `${m.phoneNumber} • ${m.currency}`}
                        {m.type === 'bank_wire' && `${m.swiftCode || 'WIRE'} • •••• ${m.last4 || ''} • ${m.currency}`}
                        {(m.type === 'google_pay' || m.type === 'apple_pay' || m.type === 'paypal') && `${m.email} • ${m.currency}`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2 flex-wrap">
                  <div className="flex items-center space-x-2">
                    {onSelectMethod && (
                      <button
                        type="button"
                        onClick={() => onSelectMethod(m)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-500 text-black'
                            : 'bg-gradient-to-r from-[#8E6D28] to-[#C5A059] text-black hover:brightness-110'
                        }`}
                      >
                        {isSelected ? (isTi ? 'ተመሪጹ ✓' : 'Selected ✓') : (isTi ? 'በዚ ክፈል' : 'Use to Pay')}
                      </button>
                    )}

                    {!m.isDefault && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleMakeDefault(m.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#1A1E33] hover:bg-[#242B47] text-amber-300 border border-slate-700 text-[11px] font-semibold flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                      >
                        <Star className="w-3 h-3" />
                        <span>{isTi ? 'ቀንዲ ግበሮ' : 'Set Default'}</span>
                      </button>
                    )}
                  </div>

                  {confirmDeleteId === m.id ? (
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDelete(m.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
                      >
                        {isTi ? 'ኣረጋግጽ' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold cursor-pointer"
                      >
                        {isTi ? 'ኣይፋል' : 'Cancel'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(m.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title={isTi ? 'ኣልግስ' : 'Remove payment method'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PCI-DSS Security Statement */}
      <div className="flex items-start space-x-2 text-[11px] text-slate-400 bg-[#0E101D] p-3 rounded-xl border border-slate-800">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p>
          {isTi
            ? 'ውሕስነት PCI-DSS: ምሉእ ቑጽሪ ካርድን CVVን ኣብ ዳታቤዝና ፈጺሙ ኣይዕቀብን እዩ። መወዳእታ 4 ኣሃዛትን ውሑስ ቶከንን ጥራይ ይዕቀብ።'
            : 'PCI-DSS Security: Full card numbers (PAN) and CVV codes are NEVER stored in Firestore or local storage—only masked tokens and last 4 digits.'}
        </p>
      </div>
    </div>
  );

  if (mode === 'modal') {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="w-full max-w-3xl my-auto">{content}</div>
      </div>
    );
  }

  return content;
};
