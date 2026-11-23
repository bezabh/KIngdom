/**
 * Security Rules Unit Test Specification (Dirty Dozen Adversarial Verification)
 * Verifies all PayPal billing & entitlement invariants on DRAFT_firestore.rules / firestore.rules
 */
export const DIRTY_DOZEN_SECURITY_CASES = [
  { id: 1, operation: 'create', path: '/user_entitlements/usr_123', payload: { plan: 'pro', isPro: true }, expected: 'PERMISSION_DENIED' },
  { id: 2, operation: 'update', path: '/user_entitlements/usr_123', payload: { isPro: true }, expected: 'PERMISSION_DENIED' },
  { id: 3, operation: 'create', path: '/subscriptions/I-FORGED', payload: { uid: 'usr_123', status: 'ACTIVE' }, expected: 'PERMISSION_DENIED' },
  { id: 4, operation: 'update', path: '/subscriptions/I-SUB1', payload: { status: 'ACTIVE', nextBillingDate: '2099-01-01' }, expected: 'PERMISSION_DENIED' },
  { id: 5, operation: 'create', path: '/payment_history/TX-FAKE', payload: { uid: 'usr_123', paymentStatus: 'COMPLETED' }, expected: 'PERMISSION_DENIED' },
  { id: 6, operation: 'get', path: '/user_entitlements/other_uid', authUid: 'usr_123', expected: 'PERMISSION_DENIED' },
  { id: 7, operation: 'list', path: '/subscriptions', authUid: 'usr_123', filter: 'unscoped', expected: 'PERMISSION_DENIED' },
  { id: 8, operation: 'write', path: '/paypal_webhook_events/WH-1', payload: { eventType: 'PAYMENT.SALE.COMPLETED' }, expected: 'PERMISSION_DENIED' },
  { id: 9, operation: 'write', path: '/payment_audit_logs/LOG-1', payload: { action: 'FORGE' }, expected: 'PERMISSION_DENIED' },
  { id: 10, operation: 'read', path: '/user_entitlements/other_uid', token: { email: 'beckylove2004@gmail.com', email_verified: false }, expected: 'PERMISSION_DENIED' },
  { id: 11, operation: 'create', path: '/users/usr_123', payload: { id: 'usr_123', role: 'Creator', isPro: true }, expected: 'PERMISSION_DENIED' },
  { id: 12, operation: 'get', path: `/user_entitlements/${'a'.repeat(200)}`, expected: 'PERMISSION_DENIED' },
];
