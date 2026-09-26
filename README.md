# KrishiMitra AI — Smart Farming Advisory & Direct Market Platform

**Final Year BSc IT Project — by Ketan**

An AI-guided farming advisory platform combined with a direct farmer-to-customer
marketplace: crop recommendations, yield prediction, disease diagnosis, market
prices, weather, government schemes, equipment rental, and a farm-to-table
marketplace with orders, reviews, and an admin panel.

**v3 is a full production-grade rewrite** — a TypeScript + React single-page app
with a component design system, internationalization (EN/HI/MR), PWA offline
support, and a hardened Express API with a 64-test automated suite.

---

## 1. What's inside

```
KrishiMitraAI/
├── backend/                        Express 5 API + JSON datastore
│   ├── server.js                   Entry point
│   ├── app.js                      App factory (tests import this)
│   ├── db.js                       Lightweight JSON-file datastore (swap for MySQL)
│   ├── .env.example                Copy to .env — secrets/config live here
│   ├── middleware/                 JWT auth, role guards, uploads, rate limit, errors
│   ├── utils/validators.js         Mobile/price/text validation + sanitization
│   ├── ml/yieldPredictor.js        Linear regression trained from scratch
│   ├── knowledge/                  cropData, chatbot, weather, disease rules
│   ├── services/                   Domain logic (orders, stats, catalog, etc.)
│   ├── routes/                     auth, farmers, customers, products, orders,
│   │                               payments, advisory, admin, crops, schemes,
│   │                               equipment
│   └── tests/                      131 automated tests (node:test)
│   └── uploads/                    Uploaded photos land here
├── frontend/                       React 19 + TypeScript + Tailwind v4 SPA
│   ├── src/
│   │   ├── lib/                    api client, types, i18n, validators, format, cart
│   │   ├── contexts/               Auth, Toast, I18n, Cart providers
│   │   ├── components/             ui/ motion/ layout/ checkout/ chat/ (design system)
│   │   ├── layouts/                Farmer/Customer/Admin shells
│   │   └── pages/                  public, shared, farmer, customer, admin
│   ├── public/                     manifest, service worker, PWA icons
│   ├── scripts/                   Icon generator + checkout smoke test
│   └── package.json                vite build · vitest test · icons
├── database/schema.sql             MySQL reference schema for production
└── KrishiMitra_AI_Project_Report.docx   Full written project report
```

## 2. Why a JSON file instead of MySQL by default?

So the project runs on **any examiner's laptop** with just `npm install` — no
MySQL server, no native build tools (some SQLite bindings fail to install
without compilers, a common last-minute demo disaster). The data layer
(`backend/db.js`) is isolated behind simple functions
(`insert/find/filter/update/remove`), so migrating to MySQL later means
rewriting that one file using `database/schema.sql` — no route needs to change.

## 3. Running the project (VS Code)

**Requirements:** Node.js 20+ (check with `node -v`) and npm.

### Backend + production build (single server on :5000)

```bash
cd backend
npm install
npm start          # API + built React app, served together at http://localhost:5000
```

### Frontend development server (hot reload on :5173)

```bash
cd frontend
npm install
npm run dev        # vite dev server; proxies /api and /uploads → localhost:5000
npm run build      # type-check + production build into frontend/dist
```

A working `.env` is included so it runs out of the box. For your own
deployment, copy `.env.example` to `.env` and change `JWT_SECRET`, the admin
credentials, and `PORT`.

## 4. Running the tests

```bash
cd backend
 npm test                            # 131 backend tests (node:test)
 node scripts/smoke-checkout.js              # 37 COD-only checkout API checks

cd frontend
 npm test                            # 94 frontend tests (Vitest + Testing Library)
```

Backend tests cover validators, the crop recommender, the ML yield model,
order lifecycle rules, review guards, payment verification and idempotency, and
full end-to-end API flows (register → order → deliver → review). Frontend tests
cover the lib layer (validators, i18n fallbacks and coverage, Indian-format
money/numbers, cart logic, Razorpay script loading) and key UI components
(Button, Badge, status/approval states, spinners, empty states), plus the
checkout selector, success panel, payment pill, and the landing page.

## 5. Demo accounts

| Role     | Login                                                               |
| -------- | ------------------------------------------------------------------- |
| Admin    | username: `admin` / password: `admin123` (via `.env`)               |
| Farmer   | mobile: `9876543210` / password: `farmer123` (Ramesh Patil, Nashik) |
| Farmer   | mobile: `9822001122` / password: `farmer123` (Sunita Jadhav)        |
| Customer | mobile: `9123456780` / password: `customer123` (Priya Sharma, Pune) |
| Customer | mobile: `9898989898` / password: `customer123` (Rahul Verma)        |

Seed data includes farmers with live product listings and equipment rentals, a
customer with delivered/pending orders and a review, market-price history, and
a populated admin dashboard — so every screen looks alive on first run. You
can still register new farmer/customer accounts from the app.

## 6. Suggested demo flow for evaluation

1. Log in as **Farmer** (`9876543210` / `farmer123`) → dashboard shows weather,
   sales stats, low-stock/pending-order alerts, and a crop suggestion.
2. **Crop Advisor** (recommend) — pick soil type + season, get agronomy-backed
   crop suggestions with an honest `exactMatch` disclaimer.
3. **Yield Predictor** — enter rainfall/fertilizer/land size; see the predicted
   yield and the model info (trained regression, R², synthetic-data disclosure).
4. **Disease Diagnosis** — upload a crop photo and read the diagnostic result.
5. **Market Prices / Weather** — 7-day forecast and price trend charts.
6. **Schemes** — enter your land size, see eligible government schemes first.
7. **My Products** → list a product **with a real photo**; **My Orders** →
   confirm/ship/deliver an order placed on your produce, and a Cash on Delivery
   order flips to **Paid** automatically on delivery.
8. Log out, log in as **Customer** (`9123456780` / `customer123`) → Marketplace
   (search + pagination), add to cart, pick **Cash on Delivery** or **Pay
   Online** at checkout (Quick Pay skips the extra click), then **review** a
   delivered order in My Orders.
9. Log in as **Admin** (`admin` / `admin123`) → dashboard charts (order trend,
   status breakdown), approve/reject products, manage crop database, add a
   scheme live, and review the audit log.

## 7. Where the "AI" actually is (be ready to explain this in your viva)

This project uses **different approaches deliberately**, and it's worth being
upfront about the difference:

- **Crop recommendation + chatbot + disease diagnosis** (`backend/knowledge/`):
  rule-based, not machine learning. Every answer traces to a specific agronomy
  rule you can point to in the code. Intentional — avoids an LLM hallucinating
  farming advice, and easy to defend in a viva since nothing is a black box.
- **Yield prediction** (`backend/ml/yieldPredictor.js`): genuinely trained — a
  multiple linear regression fit via from-scratch gradient descent on a small
  dataset. **Honesty note:** the training data is synthetic (modeled on typical
  Maharashtra Kharif yield patterns), not real government data. This is
  disclosed in the app itself (`GET /api/advisory/yield-model-info`) — say so
  openly if asked rather than implying it trains on real field data.

**To upgrade to a real LLM chatbot:** replace `answer()` in
`backend/knowledge/chatbot.js` with an LLM call, passing the crop rules and
schemes as context (a simple RAG pattern).

**To upgrade the yield model with real data:** replace `TRAINING_DATA` in
`backend/ml/yieldPredictor.js` with real records (e.g. data.gov.in) — the
training/prediction code doesn't need to change.

## 8. Security & validation notes

- Indian mobile numbers validated (`[6-9]XXXXXXXXX`) client-side **and**
  server-side — never trust client validation alone.
- Free-text fields (names, crop names, chat messages, reviews) are sanitized
  server-side (HTML stripped, length-capped) before storage.
- Prices/quantities/land sizes must be positive numbers.
- Image uploads are restricted to JPG/PNG/WEBP, capped at 3 MB, renamed on disk.
- Passwords hashed with bcrypt; the admin account is a single env-var check.
- JWT auth with role guards on every protected route; API rate limiting; helmet
  headers; JSON 404/error responses (never Express HTML error pages).
- Secrets live in `.env` (git-ignored).
- **Payments**: the Razorpay key secret is server-side only — the browser gets
  just the key ID. Order amounts are recomputed on the server, and a payment is
  marked `Paid` only after a timing-safe HMAC signature check plus a re-fetch
  of the order amount from Razorpay. A COD order can never be settled by a
  gateway callback. `idempotencyKey` is scoped per customer and basket to block
  duplicate orders. Stock is only released for orders that were genuinely never
  paid.
- **Content Security Policy**: helmet's defaults (`script-src 'self'`,
  `default-src 'self'`) silently break Razorpay — `checkout.js` cannot load and
  the payment modal cannot be framed. `app.js` widens exactly three directives
  (`script-src`, `frame-src`, `connect-src`, plus `img-src` for method logos) to
  the Razorpay hosts. Everything else stays on helmet's strict defaults and no
  `'unsafe-inline'` is added to `script-src`. `tests/security.test.js` pins both
  the allowlist and the strictness, so this cannot silently regress.
- **Checkout script loading** (`src/lib/razorpay.ts`): every failure path clears
  the cached promise, otherwise one blocked load poisons the whole session. A
  readiness poll covers an element whose `load` event already fired, a 20s
  timeout covers a request that never settles, and failures name the blocked
  host plus the ad-blocker hint instead of a vague connection message. The cart
  shows a retryable panel for these, and the customer can always fall back to
  COD.

## 9. Frontend architecture (v3)

- **React 19 + TypeScript (strict)** with a typed API client
  (`src/lib/api.ts`) covering the full backend surface, including
  `FormData` uploads.
- **Design system** (`src/components/ui/`): Button, Input, Select, Modal,
  DataTable, Pagination, Badge/StatusBadge, toast notifications, and state
  components (skeletons, error/empty states) — consistent typography and the
  crop/soil/harvest color palette (`src/index.css`, Tailwind v4 `@theme`).
- **Layouts & guards**: ProtectedRoute / RoleRoute / GuestOnly route guards,
  dashboard shells with role-colored sidebars for farmer/customer/admin, a
  public site layout, and a top-level error boundary.
- **State**: Auth/Toast/I18n/Cart React contexts; `useAsync` hook for data
  fetching; localStorage-backed cart (`km_cart_v1`).
- **i18n**: EN / हिन्दी / मराठी dictionaries with fallback to English, a
  language switcher, and locale-aware INR/number/date formatting.
- **PWA**: manifest, service worker (network-first with app-shell cache, never
  intercepts `/api` or `/uploads`), and generated app icons.

## 9b. Checkout & payments

Checkout is one shared flow used by the cart, **Buy Now**, and **Quick Pay** —
`frontend/src/hooks/useCheckout.ts` is the single state machine, so no screen
re-implements payment logic.

**Payment methods**

| Method | Behaviour |
| --- | --- |
| Pay Online (Razorpay) | UPI, cards, netbanking, wallets. Order is created `Pending`/Unpaid, stock is held, and the order flips to `Paid` only after the server verifies the gateway signature. |
| Cash on Delivery | Order is created `Pending`/Unpaid with no gateway call. The farmer collects cash, and the order is marked `Paid` when they mark it Delivered. |

**Endpoints** (`backend/routes/payments.js`, mounted at `/api/payments`)

| Route | Purpose |
| --- | --- |
| `GET /config` | Public config: `enabled`, `keyId`, `codEnabled`, `codMaxAmount`. Never returns the key secret. |
| `POST /create-order` | Creates the order and, for online payments, the Razorpay order. Accepts `paymentMethod` and an `idempotencyKey`. |
| `POST /verify` | Timing-safe HMAC check of the signature plus a gateway amount/currency re-fetch before marking `Paid`. |
| `POST /cancel-order` | Releases stock held by a checkout the customer abandoned. |

**Rules the server enforces** (never trust the client)

- Amounts are computed from the product price on the server; the browser total
  is display-only.
- COD is capped by `COD_MAX_AMOUNT` (default ₹25,000) and can be switched off
  with `COD_ENABLED=false`. The rule is checked in `orderService` *before* any
  stock is reserved, so a refused COD order never holds stock.
- `idempotencyKey` is scoped per customer and per basket, so a double click,
  retry, or a colliding key cannot create two orders or expose someone else's.
- A COD order can never be settled by a gateway callback, and a retried online
  checkout reuses its existing Razorpay order instead of opening a second
  payable one.
- **COD works with no Razorpay keys configured**, which is what the demo uses.

**Configuration** — copy `backend/.env.example` to `backend/.env`:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx   # both keys or online payment stays off
RAZORPAY_KEY_SECRET=your_key_secret     # server-side only, never sent to the browser
COD_ENABLED=true
COD_MAX_AMOUNT=25000
```

**Try it**

```bash
cd backend && npm test                    # 122 tests
 node scripts/smoke-checkout.js            # 37 COD-only API checks
 node scripts/smoke-checkout.js --razorpay # +4: also creates a real test-mode gateway order
```

Razorpay test card `4111 1111 1111 1111`, any future expiry, any OTP.
Decline: `4000 0000 0000 0002`. Auth failure: `4000 0000 0000 3160`.

## 10. Moving to production (optional, for future scope)

- Swap `backend/db.js` for MySQL using `database/schema.sql`.
- Replace `backend/knowledge/weather.js` with a real weather provider.
- Move product images from local disk to S3/Cloudinary.
- Add a Razorpay webhook so payments reconcile server-side, not only via the
  browser callback.
- Add explicit refresh-token handling and per-user admin roles.

## 11. v2.1 — bugs found and fixed during a full audit

A prior audit pass (booting the server and firing real requests at every
route, including deliberately malformed ones) found 8 real issues. All fixed,
each with a regression test in `tests/`:

| #   | Bug                                                                                                                               | Impact                                 | Fix                                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------- |
| 1   | Chatbot matched crop names as plain substrings — "market **price**" matched "**Rice**", "**future** of farming" matched "**Tur**" | Wrong chatbot answers                  | Word-boundary regex matching                    |
| 2   | `PUT /api/farmers/:id` with whitespace-only name wiped the real name to `""`                                                      | Data corruption                        | Validate the _sanitized_ result                 |
| 3   | No `PUT /api/customers/:id` route — frontend faked saves into local state                                                         | Profile edits lost after login         | Added the real route                            |
| 4   | Unmatched `/api/*` returned HTML 404 pages                                                                                        | JSON parse errors in the client        | JSON 404 handler                                |
| 5   | Farmers had no UI to fulfil orders                                                                                                | Orders never confirmed/delivered       | Full farmer Orders tab                          |
| 6   | Reviews allowed before delivery                                                                                                   | Reviews before transaction completed   | Reject review unless `status === "Delivered"`   |
| 7   | Recommending non-existent soil/season combos silently returned generic crops                                                      | Misleadingly confident AI output       | `exactMatch` flag + honest disclaimer in the UI |
| 8   | `Number(' ')`/`Number('')` coerce to `0`                                                                                          | Blank numeric fields passed validation | Validators reject empty input before coercion   |

## 12. v2.2 — critical fix: the app freezing on sign-in

Signing in as **Farmer or Admin once froze the whole browser tab** (100% CPU).
Root cause: data-loading functions called the app's top-level `render()`
function on completion, which re-ran `afterRender()` → which called the _same_
loading functions → `render()` → … a permanent render loop. Every loader now
updates its own DOM container directly instead of re-triggering a full render.
Regression tests simulate the login in a DOM and assert `render()` runs a
stable number of times. **The v3 React rewrite eliminates this entire class of
bug** by construction — components render their own state via the framework.

## 13. Technology stack

- **Backend:** Node.js, Express 5, JWT auth, bcryptjs, multer, helmet, CORS,
  rate limiting, dotenv, `node:test`.
- **Frontend:** React 19, TypeScript (strict), Vite, Tailwind CSS v4,
  React Router v7, framer-motion, recharts, Vitest + Testing Library.
- **ML:** Hand-written multiple linear regression (gradient descent), no ML library.
- **Data:** JSON file store (demo) / MySQL (production schema provided).
- **PWA:** installable, offline app shell.

## 14. Known limitations (be upfront about these in your viva)

- Crop recommender / chatbot / disease diagnosis are rule-based, not trained ML.
- Yield predictor is trained on synthetic data, not real field data
  (disclosed in-app).
- Weather data is deterministically generated, not live — a real provider is a
  small change to `backend/knowledge/weather.js`.
- Disease diagnosis is heuristic guidance, not a substitute for a lab test.
- Online payment confirmation relies on the Razorpay Checkout browser callback;
  there is no webhook yet, so a customer who closes the tab after paying could
  leave an order stuck as Unpaid until it is cancelled.
- Single hardcoded admin account (fine for a college project; a real admin
  table would be needed for multi-admin use).
