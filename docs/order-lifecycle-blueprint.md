# Lavender Hill — Order Lifecycle Blueprint

> Fulfillment · Discount codes · Refunds · Returns. The real-world flow a store
> runs on, mapped onto our Next.js 16 (App Router) + Prisma stack. Companion to
> [`admin-dashboard-blueprint.md`](./admin-dashboard-blueprint.md) and
> [`system-architecture.md`](./system-architecture.md).

## The core idea — one order, two lives + a return track

An order does not have a single "status". It has **two independent lives** and a
separate **return track**. Conflating them is the classic beginner mistake.

- **Payment life (money):** `paid → partially_refunded → refunded` (also `pending`, `failed`)
- **Fulfillment life (goods):** `unfulfilled → processing → packed → shipped → delivered` (or `cancelled` before it ships)
- **Return track (per request):** `requested → approved → initiated → received → refunded` (or `rejected`)

## Policy decisions (agreed)

| Decision | Choice |
|---|---|
| Refunds | **Partial + full** — refund the whole order or selected items / a custom amount |
| Return window | **14 days** after delivery |
| Build pace | **Phase by phase**, each verified before the next |

## Data model

**`Order`** (extended — old `status` kept for back-compat):
`paymentStatus`, `fulfillmentStatus`, `trackingCarrier`, `trackingNumber`,
`refundedAmount`, `discountCode`, `shippedAt`, `deliveredAt`, `cancelledAt`,
+ relations `events[]`, `returns[]`.

**`OrderEvent`** — immutable audit trail / admin timeline. One row per action
(`type`, `message`, `actor`, `meta` JSON, `createdAt`). Never edited/deleted.

**`DiscountCode`** — `code` (unique, uppercase), `type` (percent|fixed), `value`,
`minSubtotal`, `maxDiscount?`, `usageLimit?`, `usageCount`, `startsAt?`, `endsAt?`,
`active`.

**`Return`** — `returnNumber`, `orderId`, `customerId?`, `status`, `reason`,
`items` (JSON snapshot), `refundAmount`, `refundRef`, `adminNote`, timestamps.

## State machines (all rules live in `lib/order-workflow.ts`)

Illegal transitions are rejected server-side with **HTTP 409**. Every accepted
change appends an `OrderEvent` inside the same transaction.

**Fulfillment** — forward-only, one step at a time:
```
unfulfilled → processing → packed → shipped → delivered
        └────── cancelled (only before shipped) ──────┘
```
- No skipping, no going back · `shipped` **requires** a tracking number ·
  can't fulfil a cancelled/refunded order · cancel offers a refund.

**Payment / refund:**
```
paid → partially_refunded → refunded      (or paid → refunded)
```
- Refund ≤ `total − refundedAmount` (never over-refund) · real Stripe refund when
  `paymentRef` starts with `pi_`, mock refund otherwise · double-refund blocked.

**Return:**
```
requested → approved → initiated → received → refunded
      └──→ rejected (end)
```
- Customer may request **only** if `fulfillmentStatus = delivered` AND within the
  14-day window AND not already refunded · returned qty ≤ ordered qty · the refund
  fires only after `received` and reuses the Payment machine above.

## Security (upheld from `system-architecture.md`)

- Admin mutations: `getAdmin()` + `proxy.ts` guard on `/api/admin/*`.
- Customer return actions: `getCustomerSession()` **and** ownership check
  (`order.customerId === session.customerId`).
- All money (discounts, refunds) recomputed/validated server-side — never trust the client.
- Every state change validated (409 on illegal) and logged to `OrderEvent`.

## Notifications

Through `lib/email.ts` (SMTP with dev-console fallback). Best-effort — an email
failure never breaks a mutation. Sent on: confirmed, shipped (+tracking),
delivered, return approved/rejected, refund processed.

## Build phases

| Phase | Delivers | Tasks | Status |
|---|---|---|---|
| **1 · Foundation** | schema + migration + `order-workflow.ts` + audit log on order creation | (enables all) | ✅ done |
| **2 · Fulfillment + status** | admin order APIs, action buttons + timeline, customer stepper + emails | 3, 4 | ✅ done |
| **3 · Refunds** | full/partial refund via Stripe (mock + real verified), admin refund panel, payment status, events, email | 2 | ✅ done |
| **4 · Discount codes** | admin CRUD + checkout apply + server recompute (percent+fixed · stack w/ bundles · total + once-per-customer limit) | 1 | ✅ done |
| **5 · Returns** | per-item request → admin approve/reject → initiate → received → refund-after-return (reuses the shared refund engine) | 5, 6, 7 | ✅ done |

**All five phases complete** — every task (1–7) built, wired on both admin + customer sides, and verified end-to-end (14 checks Phase 2, 10+Stripe Phase 3, 15 Phase 4, 14 Phase 5). Shared refund engine: `lib/refunds.ts`. Returns service: `lib/returns.ts`.
