import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  AddPaymentMethodInput,
  CardBrand,
  PaymentMethodType,
  SavedPaymentMethod,
  SupportedCurrency,
} from '../types';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

const STORAGE_KEY_PREFIX = 'axumite_saved_payment_methods_v1';
export const PAYMENT_METHODS_UPDATED_EVENT = 'axumite_payment_methods_updated';

function getStorageKey(userId?: string, userEmail?: string): string {
  const emailLower = (userEmail || '').trim().toLowerCase();
  const idPart = (emailLower || userId || 'guest').replace(/[^a-z0-9@._-]/gi, '_');
  return `${STORAGE_KEY_PREFIX}:${idPart}`;
}

export function detectCardBrand(cardNumber: string): CardBrand {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.startsWith('4')) return 'visa';
  if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^(6011|65|64[4-9])/.test(digits)) return 'discover';
  return 'sovereign';
}

export function validateCardLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function getStarterMethods(userId: string, userEmail: string): SavedPaymentMethod[] {
  const now = new Date().toISOString();
  const isBecky = userEmail.toLowerCase() === 'beckylove2004@gmail.com';
  return [
    {
      id: `pm_default_visa_${isBecky ? 'becky' : 'usr'}`,
      userId,
      ...(auth.currentUser?.uid ? { authUid: auth.currentUser.uid } : {}),
      userEmail: userEmail || 'guest@axumite.ai',
      type: 'card',
      label: 'Sovereign Visa •••• 4242',
      providerBadge: 'Visa',
      last4: '4242',
      brand: 'visa',
      expiry: '09/28',
      holderName: isBecky ? 'Becky Love' : 'Axumite Scholar',
      currency: 'USD',
      isDefault: true,
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `pm_starter_telebirr_${isBecky ? 'becky' : 'usr'}`,
      userId,
      ...(auth.currentUser?.uid ? { authUid: auth.currentUser.uid } : {}),
      userEmail: userEmail || 'guest@axumite.ai',
      type: 'telebirr',
      label: 'Telebirr •••• 8821',
      providerBadge: 'Telebirr',
      last4: '8821',
      phoneNumber: '+251 911 •• 8821',
      currency: 'ETB',
      isDefault: false,
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function readLocalMethods(userId?: string, userEmail?: string): SavedPaymentMethod[] | null {
  try {
    const raw = localStorage.getItem(getStorageKey(userId, userEmail));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocalMethods(methods: SavedPaymentMethod[], userId?: string, userEmail?: string): void {
  try {
    localStorage.setItem(getStorageKey(userId, userEmail), JSON.stringify(methods));
    window.dispatchEvent(
      new CustomEvent(PAYMENT_METHODS_UPDATED_EVENT, {
        detail: { methods, defaultMethod: methods.find((m) => m.isDefault) || methods[0] || null },
      })
    );
  } catch {
    // ignore storage quota errors
  }
}

function sanitizeForFirestore(method: SavedPaymentMethod): Record<string, any> {
  const clean: Record<string, any> = {
    id: method.id,
    userId: method.userId,
    userEmail: method.userEmail,
    type: method.type,
    label: method.label.slice(0, 120),
    providerBadge: method.providerBadge.slice(0, 60),
    currency: method.currency,
    isDefault: Boolean(method.isDefault),
    isVerified: Boolean(method.isVerified),
    createdAt: method.createdAt,
    updatedAt: method.updatedAt,
  };
  if (method.authUid) clean.authUid = method.authUid;
  if (method.last4) clean.last4 = method.last4.slice(-4);
  if (method.brand) clean.brand = method.brand;
  if (method.expiry) clean.expiry = method.expiry.slice(0, 10);
  if (method.holderName) clean.holderName = method.holderName.slice(0, 120);
  if (method.phoneNumber) clean.phoneNumber = method.phoneNumber.slice(0, 32);
  if (method.email) clean.email = method.email.slice(0, 200);
  if (method.bankName) clean.bankName = method.bankName.slice(0, 120);
  if (method.swiftCode) clean.swiftCode = method.swiftCode.slice(0, 32);
  if (method.country) clean.country = method.country.slice(0, 80);
  return clean;
}

function buildTokenizedMethod(input: AddPaymentMethodInput): SavedPaymentMethod {
  const userId = auth.currentUser?.uid || input.userId || 'usr_guest';
  const userEmail = (auth.currentUser?.email || input.userEmail || 'guest@axumite.ai').trim();
  const now = new Date().toISOString();

  let label = (input.label || '').trim();
  let providerBadge = 'Payment Method';
  let last4: string | undefined;
  let brand: CardBrand | undefined;
  let expiry: string | undefined;
  let holderName: string | undefined;
  let phoneNumber: string | undefined;
  let email: string | undefined;
  let bankName: string | undefined;
  let swiftCode: string | undefined;
  let currency: SupportedCurrency = input.currency || 'USD';

  if (input.type === 'card') {
    const digits = (input.cardNumber || '').replace(/\D/g, '');
    if (!validateCardLuhn(digits)) {
      throw new Error('Invalid card number. Please double-check the digits.');
    }
    const cleanExpiry = (input.expiry || '').trim();
    if (!/^(0[1-9]|1[0-2])\/\d{2,4}$/.test(cleanExpiry)) {
      throw new Error('Invalid expiry date. Use MM/YY format.');
    }
    const cleanCvv = (input.cvv || '').replace(/\D/g, '');
    if (cleanCvv.length < 3 || cleanCvv.length > 4) {
      throw new Error('Invalid CVV security code (3–4 digits required).');
    }
    brand = detectCardBrand(digits);
    last4 = digits.slice(-4);
    expiry = cleanExpiry;
    holderName = (input.holderName || 'Axumite Member').trim().slice(0, 120);
    const brandName =
      brand === 'visa' ? 'Visa' :
      brand === 'mastercard' ? 'Mastercard' :
      brand === 'amex' ? 'American Express' :
      brand === 'discover' ? 'Discover' : 'Sovereign Card';
    providerBadge = brandName;
    label = label || `${brandName} •••• ${last4}`;
  } else if (input.type === 'telebirr' || input.type === 'cbe_birr') {
    const phone = (input.phoneNumber || '').trim();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8) {
      throw new Error('Please enter a valid mobile wallet phone number.');
    }
    last4 = digits.slice(-4);
    phoneNumber = phone.slice(0, 32);
    currency = input.currency || 'ETB';
    providerBadge = input.type === 'telebirr' ? 'Telebirr' : 'CBE Birr';
    label = label || `${providerBadge} •••• ${last4}`;
  } else if (input.type === 'bank_wire') {
    const account = (input.accountNumber || '').replace(/\s+/g, '');
    if (!input.bankName?.trim() || account.length < 4) {
      throw new Error('Bank name and valid account number or IBAN are required.');
    }
    last4 = account.slice(-4);
    bankName = input.bankName.trim().slice(0, 120);
    swiftCode = input.swiftCode?.trim().toUpperCase().slice(0, 32);
    holderName = input.holderName?.trim().slice(0, 120);
    providerBadge = bankName;
    label = label || `${bankName} •••• ${last4}`;
    currency = input.currency || 'ERN';
  } else if (input.type === 'paypal') {
    const cleanEmail = (input.email || userEmail).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Please enter a valid PayPal email address.');
    }
    email = cleanEmail.slice(0, 200);
    providerBadge = 'PayPal';
    label = label || `PayPal (${email})`;
  } else if (input.type === 'google_pay') {
    email = (input.email || userEmail).trim().slice(0, 200);
    providerBadge = 'Google Pay';
    label = label || `Google Pay (${email})`;
  } else if (input.type === 'apple_pay') {
    email = (input.email || userEmail).trim().slice(0, 200);
    providerBadge = 'Apple Pay';
    label = label || `Apple Pay (${email})`;
  }

  return {
    id: `pm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    ...(auth.currentUser?.uid ? { authUid: auth.currentUser.uid } : {}),
    userEmail,
    type: input.type,
    label: label.slice(0, 120),
    providerBadge: providerBadge.slice(0, 60),
    ...(last4 ? { last4 } : {}),
    ...(brand ? { brand } : {}),
    ...(expiry ? { expiry } : {}),
    ...(holderName ? { holderName } : {}),
    ...(phoneNumber ? { phoneNumber } : {}),
    ...(email ? { email } : {}),
    ...(bankName ? { bankName } : {}),
    ...(swiftCode ? { swiftCode } : {}),
    ...(input.country ? { country: input.country.slice(0, 80) } : {}),
    currency,
    isDefault: Boolean(input.setAsDefault),
    isVerified: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function getDefaultPaymentMethod(userId?: string, userEmail?: string): SavedPaymentMethod | null {
  const local = readLocalMethods(userId, userEmail);
  const list = local && local.length > 0
    ? local
    : getStarterMethods(userId || auth.currentUser?.uid || 'usr_guest', userEmail || auth.currentUser?.email || 'guest@axumite.ai');
  return list.find((m) => m.isDefault) || list[0] || null;
}

export async function fetchPaymentMethods(userId?: string, userEmail?: string): Promise<SavedPaymentMethod[]> {
  const resolvedUid = auth.currentUser?.uid || userId || 'usr_guest';
  const resolvedEmail = (auth.currentUser?.email || userEmail || 'guest@axumite.ai').trim();

  // 1. Try Firestore when authenticated
  if (auth.currentUser) {
    const colPath = `users/${auth.currentUser.uid}/payment_methods`;
    try {
      const snap = await getDocs(collection(db, 'users', auth.currentUser.uid, 'payment_methods'));
      if (!snap.empty) {
        const docs = snap.docs
          .map((d) => d.data() as SavedPaymentMethod)
          .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || b.createdAt.localeCompare(a.createdAt));
        writeLocalMethods(docs, resolvedUid, resolvedEmail);
        return docs;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  }

  // 2. Try Express API backend
  try {
    const params = new URLSearchParams({ userId: resolvedUid, userEmail: resolvedEmail });
    const res = await fetch(`/api/payment/methods?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.methods) && data.methods.length > 0) {
        const local = readLocalMethods(resolvedUid, resolvedEmail);
        const merged = local && local.length > data.methods.length ? local : data.methods;
        writeLocalMethods(merged, resolvedUid, resolvedEmail);
        return merged;
      }
    }
  } catch {
    // Fallback below
  }

  // 3. Fallback to localStorage or seeded starter methods
  const local = readLocalMethods(resolvedUid, resolvedEmail);
  if (local && local.length > 0) {
    return local;
  }

  const starter = getStarterMethods(resolvedUid, resolvedEmail);
  writeLocalMethods(starter, resolvedUid, resolvedEmail);
  return starter;
}

export async function addPaymentMethod(input: AddPaymentMethodInput): Promise<SavedPaymentMethod[]> {
  const resolvedUid = auth.currentUser?.uid || input.userId || 'usr_guest';
  const resolvedEmail = (auth.currentUser?.email || input.userEmail || 'guest@axumite.ai').trim();

  // Client-side tokenization & validation (raw cardNumber / CVV are discarded immediately)
  const newMethod = buildTokenizedMethod({ ...input, userId: resolvedUid, userEmail: resolvedEmail });
  const existing = await fetchPaymentMethods(resolvedUid, resolvedEmail);
  const shouldBeDefault = input.setAsDefault === true || existing.length === 0;
  newMethod.isDefault = shouldBeDefault;

  const now = new Date().toISOString();
  const updatedList = [
    newMethod,
    ...existing.map((m) => (shouldBeDefault ? { ...m, isDefault: false, updatedAt: now } : m)),
  ];

  // 1. Persist locally first for instant reactive UI
  writeLocalMethods(updatedList, resolvedUid, resolvedEmail);

  // 2. Sync to Express backend (tokenized only or validated server-side)
  try {
    await fetch('/api/payment/methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        userId: resolvedUid,
        authUid: auth.currentUser?.uid,
        userEmail: resolvedEmail,
        setAsDefault: shouldBeDefault,
      }),
    });
  } catch {
    // non-fatal when offline
  }

  // 3. Persist tokenized document in Firestore when signed in
  if (auth.currentUser) {
    const uid = auth.currentUser.uid;
    const docPath = `users/${uid}/payment_methods/${newMethod.id}`;
    try {
      const batch = writeBatch(db);
      if (shouldBeDefault) {
        for (const item of existing) {
          if (item.isDefault) {
            batch.set(
              doc(db, 'users', uid, 'payment_methods', item.id),
              sanitizeForFirestore({ ...item, isDefault: false, updatedAt: now }),
              { merge: true }
            );
          }
        }
      }
      batch.set(doc(db, 'users', uid, 'payment_methods', newMethod.id), sanitizeForFirestore(newMethod));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  }

  return updatedList;
}

export async function setDefaultPaymentMethod(
  methodId: string,
  userId?: string,
  userEmail?: string
): Promise<SavedPaymentMethod[]> {
  const resolvedUid = auth.currentUser?.uid || userId || 'usr_guest';
  const resolvedEmail = (auth.currentUser?.email || userEmail || 'guest@axumite.ai').trim();
  const existing = await fetchPaymentMethods(resolvedUid, resolvedEmail);
  const now = new Date().toISOString();

  const updated = existing.map((m) => ({
    ...m,
    isDefault: m.id === methodId,
    updatedAt: now,
  }));
  writeLocalMethods(updated, resolvedUid, resolvedEmail);

  try {
    await fetch(`/api/payment/methods/${encodeURIComponent(methodId)}/default`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: resolvedUid, userEmail: resolvedEmail }),
    });
  } catch {
    // ignore offline errors
  }

  if (auth.currentUser) {
    const uid = auth.currentUser.uid;
    const docPath = `users/${uid}/payment_methods/${methodId}`;
    try {
      const batch = writeBatch(db);
      for (const item of updated) {
        batch.set(doc(db, 'users', uid, 'payment_methods', item.id), sanitizeForFirestore(item), { merge: true });
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  }

  return updated;
}

export async function removePaymentMethod(
  methodId: string,
  userId?: string,
  userEmail?: string
): Promise<SavedPaymentMethod[]> {
  const resolvedUid = auth.currentUser?.uid || userId || 'usr_guest';
  const resolvedEmail = (auth.currentUser?.email || userEmail || 'guest@axumite.ai').trim();
  const existing = await fetchPaymentMethods(resolvedUid, resolvedEmail);
  const now = new Date().toISOString();

  let remaining = existing.filter((m) => m.id !== methodId);
  if (remaining.length > 0 && !remaining.some((m) => m.isDefault)) {
    remaining = remaining.map((m, idx) =>
      idx === 0 ? { ...m, isDefault: true, updatedAt: now } : m
    );
  }
  writeLocalMethods(remaining, resolvedUid, resolvedEmail);

  try {
    const params = new URLSearchParams({ userId: resolvedUid, userEmail: resolvedEmail });
    await fetch(`/api/payment/methods/${encodeURIComponent(methodId)}?${params.toString()}`, {
      method: 'DELETE',
    });
  } catch {
    // ignore offline errors
  }

  if (auth.currentUser) {
    const uid = auth.currentUser.uid;
    const docPath = `users/${uid}/payment_methods/${methodId}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'payment_methods', methodId));
      if (remaining[0]?.isDefault) {
        await setDoc(
          doc(db, 'users', uid, 'payment_methods', remaining[0].id),
          sanitizeForFirestore(remaining[0]),
          { merge: true }
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  }

  return remaining;
}

export function mapMethodTypeToDisplayLabel(type: PaymentMethodType, isTi: boolean): string {
  switch (type) {
    case 'card':
      return isTi ? 'ክሬዲት / ዴቢት ካርድ' : 'Credit / Debit Card';
    case 'telebirr':
      return isTi ? 'ቴሌብር (Telebirr)' : 'Telebirr Mobile Money';
    case 'cbe_birr':
      return isTi ? 'CBE ብር' : 'CBE Birr Mobile Wallet';
    case 'bank_wire':
      return isTi ? 'ባንክ / ሂምቦል / ናቕፋ' : 'Bank / Himbol / SWIFT Wire';
    case 'google_pay':
      return 'Google Pay / Play Billing';
    case 'apple_pay':
      return 'Apple Pay';
    case 'paypal':
      return 'PayPal';
    default:
      return 'Payment Method';
  }
}
