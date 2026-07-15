# PaymentTransaction Metadata Policy

**Applies to:** `payment_transactions.metadata` (Module 2+)  
**Default currency:** RWF  
**Status:** Production policy — enforcement begins Module 3 (MetadataSanitizer)

---

## 1. Purpose

`metadata` stores **non-indexed contextual data** for a payment transaction. It must never become a dump for raw provider responses, credentials, or unredacted PII.

First-class fields (`transactionId`, `paymentReference`, `providerReference`, `amount`, etc.) are authoritative. Metadata supplements them.

---

## 2. Field Classification

### 2.1 Allowed Fields

Safe operational context — may be stored in plaintext:

| Field | Type | Description |
|-------|------|-------------|
| `correlationId` | string | Request correlation (also on idempotency records) |
| `requestId` | string | Inbound request identifier |
| `idempotencyKey` | string | Idempotency key used for this operation |
| `paymentMethod` | string | e.g. `MOBILE_MONEY`, `CARD`, `WALLET` |
| `countryCode` | string | ISO 3166-1 alpha-2 (e.g. `RW`) |
| `channel` | string | `web`, `mobile`, `ussd` |
| `attempt` | number | Retry attempt count |
| `source` | string | `checkout`, `webhook`, `admin`, `reconciliation` |
| `notes` | string | Internal ops notes (non-PII) |
| `tags` | string[] | Operational tags |

### 2.2 Recommended Fields

Should be populated when available:

| Field | Description |
|-------|-------------|
| `providerCode` | Duplicated for metadata queries when top-level unset during transition |
| `providerStatus` | Normalized provider status string |
| `providerEventId` | Provider webhook/event ID (non-secret) |
| `failureCode` | Normalized failure reason code |
| `failureMessage` | Sanitized failure message (no PII) |
| `commissionBreakdown` | `{ platform, referral, vendor }` amounts — platform vs referral kept separate |
| `settlementBatchId` | Internal settlement batch reference |

### 2.3 Reserved Fields (system-owned)

Must only be written by platform services — **never by client input**:

| Field | Owner |
|-------|-------|
| `_schemaVersion` | TransactionService |
| `_sanitizedAt` | MetadataSanitizer |
| `_encryptedFields` | EncryptionService |
| `_redactedFields` | RedactionService |
| `_auditRef` | AuditLogService |
| `_webhookReceivedAt` | WebhookService |
| `_idempotencyRecordId` | IdempotencyService |

### 2.4 Forbidden Fields

Must **never** be stored in metadata (reject at sanitize layer):

| Category | Examples |
|----------|----------|
| Credentials | `apiKey`, `secret`, `password`, `token`, `privateKey` |
| Full card data | `pan`, `cvv`, `cvc`, `cardNumber`, `expiry` |
| Raw auth headers | `authorization`, `cookie` |
| Government IDs | `nationalId`, `passportNumber` (use hashed reference if needed) |
| Full provider secrets | MoMo subscription keys, Stripe webhook signing secrets |

### 2.5 Sensitive Fields (conditional storage)

May be stored only after encryption or tokenization:

| Field | Handling |
|-------|----------|
| `phoneNumber` | Store last 4 digits in metadata; full number tokenized externally |
| `email` | Hash or tokenize; never plaintext in metadata |
| `msisdn` | Tokenize — mobile money MSISDN |
| `accountNumber` | Tokenize |
| `customerName` | Optional; prefer buyerId reference |

---

## 3. PII Handling

1. **Prefer IDs over attributes** — use `buyerId`, not buyer email in metadata.
2. **Tokenize at edge** — Payment Engine sanitizes before `TransactionService.createTransaction()`.
3. **No PII in logs** — structured logs use `transactionId` + `correlationId` only.
4. **Right to erasure** — metadata may be redacted post-completion; core transaction record retained for financial audit (7-year default retention TBD).

---

## 4. Provider Payload Handling

**Rule:** Raw provider HTTP bodies are **never** stored in `metadata`.

Store only:

```javascript
{
  providerCode: "MTN_MOMO",
  providerStatus: "SUCCESSFUL",
  providerEventId: "evt_abc123",
  providerReference: "<top-level field preferred>",
  normalizedPayload: { /* mapped subset only */ }
}
```

`normalizedPayload` must pass MetadataSanitizer. Maximum depth: 3 levels. Maximum size: 4 KB after serialization.

---

## 5. Webhook Payload Handling

Webhooks flow through `WebhookService` (future Module):

1. Verify signature at HTTP layer — signature never stored.
2. Extract normalized fields → metadata.
3. Store raw payload in **separate** `payment_webhook_events` collection (Module 8+) with TTL and encryption.
4. Link via `metadata.providerEventId` + top-level `providerReference`.

---

## 6. Encryption Strategy

| Phase | Strategy |
|-------|----------|
| Module 2–3 | No encryption — metadata should contain no secrets by policy |
| Module 4+ | Field-level encryption for `sensitive.*` namespace via `platform/secrets` |
| Production | AES-256-GCM per-field; keys from Render env / secret manager |

Encrypted fields listed in `metadata._encryptedFields: ["sensitive.phoneToken"]`.

---

## 7. Redaction Strategy

Before logging, API responses, and admin UI:

| Action | Rule |
|--------|------|
| Log | Strip `metadata` entirely; log `transactionId`, `status`, `amount`, `currency` |
| Admin API | Return allowlisted metadata keys only |
| Support export | Redact `normalizedPayload`; include financial fields |
| Error reports | `failureCode` + `failureMessage` only (sanitized) |

Redaction applied by `MetadataRedactor` — not ad hoc in controllers.

---

## 8. Logging Rules

```
ALLOWED:  transactionId, paymentReference, providerReference, status, amount, currency, correlationId, providerCode
FORBIDDEN: full metadata blob, phone, email, card, raw provider body, MSISDN
```

Log level guide:

- `info` — state transitions
- `warn` — retries, idempotency replay
- `error` — failures with `failureCode` only

---

## 9. Audit Rules

1. Every status transition → append-only audit log entry (Module 5+).
2. Audit references `transactionId` — does not duplicate full metadata.
3. Metadata changes on transition are **merged**, never replaced wholesale (current Module 2 behavior).
4. Immutable fields in audit: `amount`, `currency`, `buyerId`, `sellerId`, `orderId` at creation time.

---

## 10. Future Compliance Considerations

| Requirement | Approach |
|-------------|----------|
| PCI DSS | No card data in metadata; Stripe Elements tokenization only |
| GDPR / Rwanda DPP | PII tokenization; erasure via redaction service |
| Financial audit | Core transaction + audit log retained; metadata redactable |
| AML/KYC | KYC references as IDs only, not documents in metadata |

---

## 11. Provider Examples (normalized metadata only)

### MTN MoMo

```javascript
{
  paymentMethod: "MOBILE_MONEY",
  countryCode: "RW",
  providerStatus: "SUCCESSFUL",
  providerEventId: "mm-evt-001",
  normalizedPayload: {
    financialTransactionId: "MM123456",
    externalId: "txn_abc",
    payerMessage: "Yebone order",
    payeeNote: "Order payment"
  }
}
```

### Airtel Money

```javascript
{
  paymentMethod: "MOBILE_MONEY",
  countryCode: "RW",
  providerStatus: "TS",
  normalizedPayload: {
    airtelMoneyId: "AM-789",
    transactionCode: "TXN001"
  }
}
```

### Paypack

```javascript
{
  paymentMethod: "WALLET",
  countryCode: "RW",
  providerStatus: "completed",
  normalizedPayload: {
    paypackRef: "pp_456",
    walletType: "paypack"
  }
}
```

### Flutterwave

```javascript
{
  paymentMethod: "CARD",
  countryCode: "RW",
  providerStatus: "successful",
  normalizedPayload: {
    flwRef: "FLW-REF-001",
    processorResponse: "Approved",
    paymentType: "card"
  }
}
```

### Stripe

```javascript
{
  paymentMethod: "CARD",
  providerStatus: "succeeded",
  normalizedPayload: {
    stripePaymentIntentId: "pi_abc123",
    paymentMethodType: "card",
    last4: "4242",
    brand: "visa"
  }
}
```

**Never store:** Stripe secret keys, full PaymentIntent client objects, or card numbers.

---

## 12. Enforcement Timeline

| Module | Enforcement |
|--------|-------------|
| Module 2 | Policy documented; no sanitizer yet |
| Module 3 | `MetadataSanitizer` on create/transition |
| Module 4 | Encryption for sensitive namespace |
| Module 8 | Raw webhook collection separated |
