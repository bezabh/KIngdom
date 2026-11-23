# Axumite AI PayPal & Firestore Security Specification

## 1. Core Data Invariants
1. **Strict Server-Only Billing Mutations**: Clients (`request.auth != null`) can NEVER create, update, or delete documents in `subscriptions`, `payment_history`, `user_entitlements`, `payments`, `paypal_webhook_events`, or `payment_audit_logs`. All verified PayPal mutations happen exclusively via Firebase Admin SDK on the backend after server-side PayPal API or signed webhook verification.
2. **Owner-Only Billing Reads**: Authenticated users may ONLY read (`get` / `list`) their own `subscriptions`, `payment_history`, and `user_entitlements` documents (`resource.data.uid == request.auth.uid` or `uid == request.auth.uid`), or verified SuperAdmin (`isSuperAdmin()`).
3. **Anti-Escalation on Profiles**: Users creating/updating `/users/{userId}` can never set or promote `role`, `isPro`, or `customPrivilegesEnabled` fields.
4. **Verified SuperAdmin Guard**: Admin checks require `request.auth.token.email_verified == true` alongside verified admin email.
5. **Path ID Poisoning Guard**: Every single-document operation (`get`, `create`, `update`, `delete`) enforces `isValidId(id)` (`<= 128` chars, safe characters).

## 2. The "Dirty Dozen" Adversarial Test Payloads
1. Client attempt to `create` `/user_entitlements/{uid}` with `{ plan: "pro", isPro: true }` -> **PERMISSION_DENIED**
2. Client attempt to `update` `/user_entitlements/{uid}` to flip `isPro: true` -> **PERMISSION_DENIED**
3. Client attempt to `create` a forged PayPal subscription in `/subscriptions/I-FAKE123` -> **PERMISSION_DENIED**
4. Client attempt to `update` `/subscriptions/{subId}` `status` to `"ACTIVE"` or extend `nextBillingDate` -> **PERMISSION_DENIED**
5. Client attempt to `create` a fake payment in `/payment_history/TX-FAKE` -> **PERMISSION_DENIED**
6. Non-owner user attempting `get` on another user's `/user_entitlements/{otherUid}` -> **PERMISSION_DENIED**
7. Non-owner user attempting `list` without `uid == request.auth.uid` constraint on `/subscriptions` or `/payment_history` -> **PERMISSION_DENIED**
8. Client attempt to read or tamper with `/paypal_webhook_events/{eventId}` -> **PERMISSION_DENIED**
9. Client attempt to read or write `/payment_audit_logs/{logId}` -> **PERMISSION_DENIED**
10. Unverified email spoofing `beckylove2004@gmail.com` with `email_verified: false` -> **PERMISSION_DENIED**
11. Self-promotion via `/users/{uid}` setting `role: "Creator"` or `role: "Admin"` -> **PERMISSION_DENIED**
12. Overlong/poisoned path ID (>128 chars or slashes) on any collection -> **PERMISSION_DENIED**
