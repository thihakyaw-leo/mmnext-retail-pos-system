# 🏗️ API Design & Architecture (MMNext Enterprise POS)

## ၁. အခြေခံ တည်ဆောက်ပုံ (Core Architecture)

MMNext Enterprise POS ၏ Backend API သည် **Cloudflare Workers** ပေါ်တွင် **Hono** framework ကို အသုံးပြု၍ တည်ဆောက်ထားပါသည်။ 

- **Runtime**: Cloudflare Workers (Edge Computing)
- **Framework**: Hono (Lightweight, Edge-optimized)
- **Language**: TypeScript 
- **Validation**: Zod (Type-safe request validation)

## ၂. Cloudflare Services များ အသုံးပြုထားမှု (Cloudflare Integrations)

စနစ်၏ အစိတ်အပိုင်းများကို အောက်ပါ Cloudflare Service များနှင့် အပြည့်အဝ ချိတ်ဆက်ထားပါသည်-

1. **Cloudflare D1 (Database)**
   - အဓိက Relational Database အဖြစ် အသုံးပြုထားပါသည်။
   - Users, Products, Orders, Customers စသည့် Data များကို သိမ်းဆည်းရန်ဖြစ်ပြီး SQL query များကို တိုက်ရိုက်ခေါ်ယူအသုံးပြုပါသည်။

2. **Cloudflare KV (Cache & Sessions)**
   - `edgeCacheMiddleware` ကို အသုံးပြု၍ API Response များကို Edge တွင် Caching ပြုလုပ်ရန်။
   - User Sessions များနှင့် 2FA (Two-Factor Authentication) tokens များကို လုံခြုံစွာ သိမ်းဆည်းရန်နှင့် အလွယ်တကူ စစ်ဆေးနိုင်ရန်။

3. **Cloudflare R2 (Object Storage)**
   - ပုံများ (Product Images, Avatars)၊ Invoice များနှင့် အခြား Media File များကို သိမ်းဆည်းရန် (`/api/upload`)။

4. **Cloudflare Durable Objects (Real-time & WebSockets)**
   - `GET /ws` လမ်းကြောင်းမှတဆင့် WebSocket connections များကို ကိုင်တွယ်ရန်။
   - Best Practice အနေဖြင့် **Hibernatable WebSockets API** ကို အသုံးပြုထားပြီး Connection များကို Memory တွင် အမြဲမသိမ်းထားဘဲ လိုအပ်ချိန်မှသာ နိုးထစေရန် စီမံထားပါသည်။

5. **Cloudflare Queues (Background Processing)**
   - အီးမေးလ်ပေးပို့ခြင်း (Welcome Email, Password Reset, Low Stock Alert) ကဲ့သို့သော အချိန်ယူရသည့် လုပ်ငန်းစဉ်များကို အဓိက လမ်းကြောင်းမှ ဖယ်ထုတ်ပြီး Background တွင် `EMAIL_QUEUE` ကိုအသုံးပြု၍ လုပ်ဆောင်ပါသည်။

6. **Cloudflare Workers Scheduled (Cron Triggers)**
   - `0 1 * * *` (နေ့စဉ် ည ၁ နာရီ) - နေ့စဉ် အရောင်းစာရင်း (Analytics) များကို Aggregation ပြုလုပ်ခြင်း။
   - `0 * * * *` (နာရီတိုင်း) - ပစ္စည်းလက်ကျန် (Inventory) ကို စစ်ဆေးပြီး Reorder Point အောက်ရောက်နေပါက Alert ပေးပို့ခြင်း။
   - `0 9 * * 1` (အပတ်စဉ် တနင်္လာနေ့ မနက် ၉ နာရီ) - အပတ်စဉ် စွမ်းဆောင်ရည် Report များ ထုတ်ပေးခြင်း။

7. **Cloudflare Workers AI (Optional/Planned)**
   - AI recommendation များနှင့် Data analysis များအတွက် လိုအပ်လာပါက ချိတ်ဆက်အသုံးပြုရန် အသင့်ပြင်ဆင်ထားပါသည်။

## ၃. လုံခြုံရေးနှင့် စီမံခန့်ခွဲမှု (Security & Authorization)

- **Authentication (JWT & KV)**
  - JWT (JSON Web Token) ကို အသုံးပြုပြီး Session များကို `KV Store` တွင် မှတ်သားပါသည်။ Logout ပြုလုပ်သည့်အခါ Token ကို Blacklist သွင်းသည့်စနစ် ပါဝင်ပါသည်။
- **Role-Based Access Control (RBAC)**
  - `admin`, `manager`, `cashier`, `staff` စသည့် Role များကို အခြေခံ၍ API ဝင်ရောက်ခွင့်များကို `rbacMiddleware` ဖြင့် ထိန်းချုပ်ထားပါသည်။
- **Security Headers & Rate Limiting**
  - Hono ၏ `secureHeaders` နှင့် Custom `rateLimitMiddleware` များကို အသုံးပြု၍ DDoS နှင့် အခြားတိုက်ခိုက်မှုများကို ကာကွယ်ထားပါသည်။
- **Input Validation**
  - `@hono/zod-validator` ကို အသုံးပြု၍ Request Data (Body, Query) များကို တင်းကြပ်စွာ စစ်ဆေးပါသည်။ (ဥပမာ - `loginSchema`, `registerSchema`)။

## ၄. API လမ်းကြောင်းများ (API Routing Structure)

API Endpoint များကို `/api/*` အောက်တွင် အုပ်စုဖွဲ့ထားပါသည်။

### 🔓 Public Endpoints
- `GET /` - System Information & Status
- `GET /health` - Health Check (Database, Cache, Storage Status)
- `GET /api` - API Version & Rate Limits Info
- `POST /api/auth/login` - Login ဝင်ရန်
- `POST /api/auth/forgot-password` - Password Reset လုပ်ရန်

### 🔒 Protected Endpoints (Auth & RBAC Required)
- `/api/auth/*` - Profile စီမံခန့်ခွဲမှု, Logout, Change Password
- `/api/products/*` - ကုန်ပစ္စည်း စီမံခန့်ခွဲမှု (CRUD)
- `/api/orders/*` - အရောင်း အော်ဒါများ
- `/api/customers/*` - ဖောက်သည် စီမံခန့်ခွဲမှု (CRM & Loyalty)
- `/api/inventory/*` - ဂိုဒေါင်နှင့် လက်ကျန်စာရင်း၊ ပစ္စည်းအဝင်အထွက်
- `/api/staff/*` - ဝန်ထမ်းများ စီမံခန့်ခွဲမှု
- `/api/analytics/*` - Dashboard Data, Sales Report များနှင့် Chart များအတွက် API များ (ဥပမာ `analytics.ts`)
- `/api/gamification/*` - Leaderboards, Badges နှင့် Experience Points (XP) များ
- `/api/integrations/*` - ပြင်ပစနစ်များနှင့် ချိတ်ဆက်မှု
- `/api/pos/*` - POS ကောင်တာဆိုင်ရာ အထူးလုပ်ဆောင်ချက်များ
- `/api/upload` - ဖိုင်တင်ရန် (R2 Storage သို့)
- `/api/admin/*` - Admin သီးသန့် Dashboard Data, Database Backup နှင့် Cache ရှင်းလင်းရေးများ (`DELETE /api/admin/cache`)

### ⚡ WebSocket Endpoint
- `GET /ws` - Real-time ဆက်သွယ်မှုများ (Live Orders, Notifications) အတွက် Durable Objects နှင့် ချိတ်ဆက်ရန်။

## ၅. Best Practices များ (Worker Best Practices)

စနစ်ကို ရေးသားရာတွင် Cloudflare ၏ နောက်ဆုံးပေါ် Best Practices များကို လိုက်နာထားပါသည်-

1. **`nodejs_compat` ဖွင့်ထားခြင်း**: Node.js built-ins များကို အသုံးပြုနိုင်ရန် `wrangler.jsonc` တွင် `compatibility_flags` ထည့်သွင်းထားပါသည်။
2. **Edge Caching (`edgeCacheMiddleware`)**: Data များကို KV ဖြင့် Cache လုပ်ထားပြီး Database သို့ Query ခေါ်ဆိုမှု လျှော့ချကာ ဖတ်ရှုမှု (Reads) များအတွက် အလွန်မြန်ဆန်စေပါသည်။
3. **Background Processing**: အသုံးပြုသူကို စောင့်ဆိုင်းစေခြင်းမရှိစေရန် Analytics Data သွင်းခြင်းကဲ့သို့သော လုပ်ငန်းစဉ်များကို `ctx.waitUntil()` ကို သုံး၍ လုပ်ဆောင်ပါသည်။ အီးမေးလ်ပို့ခြင်းကဲ့သို့ ကြီးမားသော လုပ်ငန်းများကို Queues ကို သုံး၍ လုပ်ဆောင်ပါသည်။
4. **No Floating Promises**: လုပ်ဆောင်ချက် အားလုံးကို မဖြစ်မနေ `await` ခေါ်ယူထားခြင်း (သို့) `waitUntil` ဖြင့်သာ Run ထားပြီး Unhandled Promise Rejection များကို ကာကွယ်ထားပါသည်။
5. **Streaming Responses**: ပမာဏများပြားသော Data များကို ဆွဲထုတ်ရာတွင် Memory Limit မကျော်စေရန် လိုအပ်သည့်နေရာများတွင် Streaming ပုံစံဖြင့် ကိုင်တွယ်ရန် ရည်ရွယ်ထားပါသည်။
6. **Error Handling & Observability**: API တစ်ခုလုံးအတွက် Global Error Handler ပါဝင်ပြီး၊ Sensitive Data များ Leak မဖြစ်စေရန် ထိန်းချုပ်ထားပါသည်။ Worker တွင် Observability (`head_sampling_rate`) ဖွင့်ထားရန် ပြင်ဆင်ထားပါသည်။

## ၆. API Response Standard

စနစ်၏ API Response များကို တူညီသော Standard Format ဖြင့် ဖန်တီးထားပါသည်။

**Success Response ဥပမာ:**
\`\`\`json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 120
  }
}
\`\`\`

**Error Response ဥပမာ:**
\`\`\`json
{
  "error": "Not Found",
  "message": "The requested resource does not exist",
  "request_id": "uuid-1234-...",
  "timestamp": "2026-05-28T02:00:00.000Z"
}
\`\`\`