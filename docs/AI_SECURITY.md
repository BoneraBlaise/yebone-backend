# YEBO AI — Security Architecture

**Design tag:** `yebo-ai-design-v1`  
**Status:** DESIGN ONLY

Related: [YEBO_AI_ARCHITECTURE.md](./YEBO_AI_ARCHITECTURE.md) · [AI_TOOLS.md](./AI_TOOLS.md) · [PROMPT_ARCHITECTURE.md](./PROMPT_ARCHITECTURE.md)

---

## Threat Model

| Threat | Vector | Mitigation |
|--------|--------|------------|
| Prompt injection | Malicious user input, product descriptions | Safety prompt + input sanitization + tool-only data path |
| API key theft | Frontend bundle exposure | Backend-only keys; remove REACT_APP_* keys |
| Unauthorized tool access | Spoofed session / role | JWT auth + per-tool permission matrix |
| Data exfiltration via LLM | Crafted prompts | PII redaction; tool output filtering |
| Abuse / cost explosion | Automated chat spam | Rate limiting per IP + user |
| Provider compromise | Third-party LLM | Provider isolation; no secrets in prompts |
| Order/payment manipulation | AI placing orders | Read-only order tools in Phase 7; HITL for mutations |

---

## Prompt Injection Protection

| Layer | Control |
|-------|---------|
| **Input sanitization** | `AIGateway` strips control chars; max length; block known injection patterns |
| **Safety prompt** | Always appended — instructs model to ignore embedded commands |
| **Tool-only facts** | LLM instructed: product/order facts come from tool JSON only |
| **Structured NL parsing** | Search intent → validated JSON schema before SearchTool |
| **Product text isolation** | Product descriptions wrapped in delimiters; marked untrusted |
| **Output validation** | Response formatter checks for leaked system prompt fragments |

---

## Tool Authorization

```
Request → AIGateway (JWT) → AIConversation (session owner)
       → AIPlanner → AIToolRegistry.checkPermission(tool, context)
       → execute or 403
```

| Rule | Detail |
|------|--------|
| Session binding | Session ID tied to authenticated user ID |
| Ownership | Order tools verify `order.userId === context.userId` |
| Role scopes | `seller` tools limited to own shop via VendorPlatform auth |
| Admin tools | Separate admin scope — not exposed in customer FAB |
| Anonymous | Search + catalog read tools only |

---

## Rate Limiting

| Endpoint | Limit (design default) | Key |
|----------|------------------------|-----|
| `POST /api/v2/ai/chat` | 20 req / min / user | `userId` |
| `POST /api/v2/ai/search` | 30 req / min / IP | `ip` |
| `POST /api/v2/ai/recommend` | 15 req / min / user | `userId` |
| Global AI budget | 500 req / hour / IP | `ip` |

Implementation: `marketplace/ai/middleware/AIRateLimit.js` — process-local initially (same pattern as search/orders); distributed Redis in infra phase.

429 response includes `Retry-After` header.

---

## Provider Isolation

- Provider adapters in isolated modules — no cross-provider state
- Keys loaded from env at bootstrap — never passed to frontend or logs
- Provider requests contain redacted audit context only
- Timeout enforced per provider call — cancel on exceed
- Mock mode for tests — no real network in CI

---

## Secret Management

| Secret | Storage | Never |
|--------|---------|-------|
| LLM API keys | Backend env / secret manager | Frontend, git, logs |
| JWT signing key | Existing auth config | AI module |
| Session tokens | HttpOnly cookie / Authorization header | LocalStorage for AI keys |

**Migration:** Delete `REACT_APP_OPENROUTER_API_KEY` and `REACT_APP_GEMINI_API_KEY` from frontend `.env.example` in Phase 7.1 frontend milestone.

---

## PII Protection

| Data | Handling |
|------|----------|
| User email / phone | Never sent to LLM; redact from tool context |
| Shipping address | Not included in prompts |
| Payment details | Never in AI context — PaymentTool readiness only |
| Conversation history | Stored with TTL; PII fields hashed/redacted |
| Logs | Prompt version IDs only — not full conversation in production |

`AIConversation` applies `PIIRedactor` before provider calls.

---

## Audit Logging

`AIHooks.afterResponse` → structured audit event:

```json
{
  "event": "ai.turn.complete",
  "sessionId": "...",
  "userId": "...",
  "toolsInvoked": ["search.products"],
  "providerId": "openrouter",
  "promptVersions": ["system@1.0.0", "safety@1.0.0"],
  "latencyMs": 1200,
  "tokenUsage": { "input": 800, "output": 200 },
  "outcome": "success"
}
```

Integrates with existing payment audit patterns — correlation ID propagated from `AIGateway`.

---

## Abuse Detection

| Signal | Action |
|--------|--------|
| >50 chat turns / hour / user | Soft throttle + captcha flag (future) |
| Repeated identical prompts | Rate limit escalation |
| Tool permission violations | Log + temporary block |
| Provider cost spike | Alert + optional circuit breaker |

Phase 7.1: basic rate limits. Phase 7.7: enhanced abuse signals.

---

## Conversation Security Lifecycle

Supports (design):

| Capability | Mechanism |
|------------|-----------|
| **Streaming** | SSE with session-bound token |
| **Cancellation** | `DELETE /api/v2/ai/session/:id/turn` → AbortSignal to provider |
| **Retry** | Idempotent turn ID — retry returns cached response |
| **Timeout** | 30s provider timeout → fallback provider → fallback prompt |
| **Fallback** | Tool-only response without LLM when all providers fail |

---

## Compliance with Frozen Platforms

AI security **extends** platform security — never weakens it:

- Order auth checks remain in `OrderService` — AI tools call service, not skip checks
- Search validation remains in `SearchValidation` — AI passes structured params through SearchPlatform
- Payment facade remains sole financial path — AI cannot initiate charges in Phase 7
