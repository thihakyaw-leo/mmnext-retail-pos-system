# 🛡️ Security Architecture & Implementation (MMNext Enterprise POS)

## ၁. ခြုံငုံသုံးသပ်ချက် (Security Overview)

MMNext Enterprise POS ၏ လုံခြုံရေးစနစ်ကို Cloudflare ၏ ခေတ်မီလုံခြုံရေး ဝန်ဆောင်မှုများနှင့် Web Security Standard များကို ပေါင်းစပ်၍ တည်ဆောက်ထားပါသည်။ စနစ်အတွင်းရှိ Data များ လုံခြုံစေရန်နှင့် အခွင့်မရှိဘဲ ဝင်ရောက်ခြင်းများကို တားဆီးရန် အလွှာပေါင်းစုံ (Multi-layered security) ဖြင့် အကာအကွယ်ပေးထားပါသည်။

## ၂. သုံးစွဲသူ အထောက်အထား စိစစ်ခြင်း (Authentication)

- **JWT Tokens**: 
  - `HS256` Algorithm ကို အသုံးပြု၍ JSON Web Tokens များ ထုတ်ပေးပါသည်။
  - Token တိုင်းတွင် Multi-tenant Architecture အတွက် မရှိမဖြစ်လိုအပ်သော `orgId` ကို ထည့်သွင်းထားပြီး Data Isolation ကို အပြည့်အဝ အာမခံပါသည်။
- **Session Management**: 
  - Token မှတ်တမ်းများကို `user_sessions` Table နှင့် Cloudflare KV Store တို့တွင် လုံခြုံစွာ သိမ်းဆည်းပါသည်။
  - အသုံးပြုသူက Logout ပြုလုပ်လိုက်ပါက၊ သက်ဆိုင်ရာ Token ကို KV တွင် Blacklist ထည့်သွင်းကာ ဆက်လက်အသုံးပြုခွင့်ကို ချက်ချင်း ရပ်ဆိုင်းပါသည်။
- **Brute Force Protection**: 
  - Password မှားယွင်းစွာ ရိုက်သွင်းမှု ၅ ကြိမ်ပြည့်ပါက အဆိုပါ အကောင့်ကို မိနစ် ၃၀ ကြာ အလိုအလျောက် ပိတ်ပင်ထားမည် (Account Lockout) ဖြစ်ပါသည်။
- **Two-Factor Authentication (2FA)**:
  - လုံခြုံရေး အထူးလိုအပ်သော Account များအတွက် 2FA အသုံးပြုနိုင်ရန် ထည့်သွင်းစဉ်းစားတည်ဆောက်ထားပါသည်။

## ၃. စကားဝှက်နှင့် ဒေတာ လုံခြုံရေး (Cryptography & Data Security)

- **Password Hashing (PBKDF2)**: 
  - WebCrypto API ကို သုံး၍ `PBKDF2` algorithm (SHA-256) ဖြင့် Password များကို Hash ပြုလုပ်ထားပါသည်။
  - 100,000 iterations အထိ အလုပ်လုပ်စေပြီး Brute-force/Rainbow-table attack များကို ကာကွယ်ထားပါသည်။
- **Timing Attacks Prevention**: 
  - Password အမှန်နှင့် အမှားတိုက်စစ်ရာတွင် Constant-time bitwise comparison ကို အသုံးပြုထားသဖြင့် Timing side-channel attack များကို ကာကွယ်နိုင်ပါသည်။
- **Secure Tokens**: 
  - `Math.random()` ကို လုံးဝအသုံးမပြုဘဲ၊ Cryptographically secure ဖြစ်သော `crypto.getRandomValues()` နှင့် `crypto.randomUUID()` များကိုသာ အသုံးပြု၍ Token များနှင့် ID များကို ထုတ်ပေးပါသည်။

## ၄. အခွင့်အာဏာ သတ်မှတ်ခြင်း (Role-Based Access Control - RBAC)

- **Hierarchical Roles**: 
  - `Admin` (Level 4), `Manager` (Level 3), `Cashier` (Level 2), `Staff` (Level 1) စသဖြင့် အဆင့်လိုက် အခွင့်အာဏာ ခွဲခြားထားပါသည်။
- **Fine-Grained Permissions**: 
  - API လမ်းကြောင်းများအားလုံးကို `rbacMiddleware` ဖြင့် ထိန်းချုပ်ထားပါသည်။
  - ဥပမာ - `orders:create`, `products:delete` စသည့် လုပ်ပိုင်ခွင့်များ ကိုက်ညီမှသာ အလုပ်လုပ်စေပါသည်။
- **Resource Ownership**:
  - `selfOrAdmin` - အသုံးပြုသူများသည် မိမိ၏ Profile ကိုသာ ပြင်ဆင်ခွင့်ရှိပြီး၊ Admin သာလျှင် အားလုံးကို ဝင်ရောက်ပြင်ဆင်နိုင်ပါသည်။
  - `cashierOwnership` - Cashier များသည် မိမိရောင်းချခဲ့သော Order များကိုသာ ကြည့်ရှုခွင့်ရှိစေရန် ကန့်သတ်ထားပါသည်။
- **Audit Logging**: 
  - ခွင့်ပြုချက်မရှိဘဲ ဝင်ရောက်ရန် ကြိုးစားမှု (Access denied attempts) အားလုံးကို Database တွင် အလိုအလျောက် မှတ်တမ်းတင်ထားပါသည်။ (`activity_logs`)

## ၅. ကွန်ရက် လုံခြုံရေးနှင့် ကာကွယ်မှုများ (Network Security & Protection)

- **SQL Injection Prevention**: 
  - Cloudflare D1 ကို အသုံးပြုရာတွင် D1 Client ၏ `stmt.bind()` ကို အသုံးပြုပြီး Parameterized queries များကိုသာ ရေးသားထားသဖြင့် SQL Injection ပြုလုပ်ခြင်းမှ အပြည့်အဝ ကာကွယ်ပြီးသား ဖြစ်ပါသည်။
- **Rate Limiting**: 
  - Cloudflare KV ကို အသုံးပြု၍ API Request များကို Rate Limit သတ်မှတ်ထားပြီး DDoS တိုက်ခိုက်မှုများနှင့် API Abuse ပြုလုပ်ခြင်းများကို တားဆီးထားပါသည်။
- **Secure HTTP Headers**: 
  - Hono ၏ `secureHeaders` middleware ကို သုံး၍ အောက်ပါ Header များကို ဖြည့်သွင်းထားပါသည်-
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY` (Clickjacking ကာကွယ်ရန်)
    - `X-XSS-Protection: 1; mode=block` (XSS Attack အချို့ကို ကာကွယ်ရန်)
- **CORS Configuration**: 
  - Cross-Origin Resource Sharing (CORS) ကို တင်းကြပ်စွာ သတ်မှတ်ထားပြီး သတ်မှတ်ထားသော Production/Development Domain များမှလွဲ၍ တခြားသော Domain များမှ လာရောက်ခေါ်ယူခြင်းများကို ပိတ်ပင်ထားပါသည်။

## ၆. Cloudflare Platform Security

- စနစ်တစ်ခုလုံးကို Cloudflare Platform ပေါ်တွင် တင်ထားခြင်းဖြစ်သဖြင့် Cloudflare ၏ အလိုအလျောက် ပါဝင်ပြီးဖြစ်သော Web Application Firewall (WAF), DDoS Protection နှင့် TLS/SSL Encryption များ၏ အကာအကွယ်ကိုလည်း အပြည့်အဝ ရရှိထားပါသည်။