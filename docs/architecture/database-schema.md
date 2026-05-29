# 🗄️ Database Schema & Architecture (MMNext Enterprise POS)

## ၁. အခြေခံ တည်ဆောက်ပုံ (Database Architecture)

MMNext Enterprise POS ၏ Database အဖြစ် **Cloudflare D1 (SQLite)** ကို အသုံးပြုထားပါသည်။ Relational Database ပုံစံဖြင့် ဖွဲ့စည်းထားပြီး၊ Data Integrity ကို ထိန်းသိမ်းရန် Foreign Keys နှင့် Triggers များကို အပြည့်အဝ အသုံးပြုထားပါသည်။

- **Database Engine**: Cloudflare D1 (Serverless SQLite)
- **Schema Version**: v2.0.0
- **Integrity**: `PRAGMA foreign_keys = ON` ဖွင့်ထားကာ Relational Integrity ကို အာမခံပါသည်။

## ၂. အဓိက Table အုပ်စုများ (Entity Groups)

Database ကို အောက်ပါ အဓိက Module (၉) ခုဖြင့် ခွဲခြားဖွဲ့စည်းထားပါသည်-

### ၂.၁. စီးပွားရေးလုပ်ငန်းနှင့် ဆိုင်ခွဲများ (Organizations & Stores)
- `organizations`: လုပ်ငန်း သို့မဟုတ် ကုမ္ပဏီများ၏ အချက်အလက် (Multi-tenant အသုံးပြုနိုင်ရန်)
- `stores`: ဆိုင်ခွဲများ၏ အချက်အလက်နှင့် တည်နေရာ

### ၂.၂. အသုံးပြုသူနှင့် လုံခြုံရေး (Users & Authentication)
- `users`: Admin, Manager, Cashier, Staff စသည့် စနစ်အသုံးပြုသူများ၏ အချက်အလက် (Role နှင့် Permissions များပါဝင်သည်)
- `user_sessions`: Login ဝင်ထားသော Session Token များ၊ Refresh Token များနှင့် Device အချက်အလက်များ
- `audit_logs`: စနစ်အတွင်း လုပ်ဆောင်ချက် မှတ်တမ်းများ (User Action Logs)

### ၂.၃. ကုန်ပစ္စည်း စီမံခန့်ခွဲမှု (Product Management)
- `categories`: ကုန်ပစ္စည်း အမျိုးအစားများ (Hierarchy ပုံစံ `parent_id` ပါဝင်သည်)
- `brands`: ကုန်ပစ္စည်း အမှတ်တံဆိပ်များ
- `suppliers`: ကုန်ကြမ်း သို့မဟုတ် ပစ္စည်းသွင်းပေးသူများ
- `products`: အဓိက ကုန်ပစ္စည်းများ (SKU, Barcode, Cost, Selling Price, Profit Margin စသည်တို့ ပါဝင်သည်)
- `product_variants`: အရောင်၊ အရွယ်အစား ကွဲပြားသော ပစ္စည်းအမျိုးအစားခွဲများ

### ၂.၄. လက်ကျန်စာရင်း စီမံခန့်ခွဲမှု (Inventory Management)
- `inventory`: ဆိုင်တစ်ဆိုင်ချင်းစီ၏ ပစ္စည်းလက်ကျန် (Quantity on hand, Quantity available) 
- `stock_movements`: ပစ္စည်းအဝင်/အထွက် မှတ်တမ်းများ (In, Out, Transfer, Sale, Return)
- `stock_adjustments` & `stock_adjustment_items`: ပစ္စည်းစာရင်း မှားယွင်းမှုများကို ပြင်ဆင်ခြင်းနှင့် အတည်ပြုခြင်း

### ၂.၅. ဖောက်သည် စီမံခန့်ခွဲမှု (Customer Management & CRM)
- `customers`: ဖောက်သည်များ၏ ကိုယ်ရေးအချက်အလက်နှင့် ဝယ်ယူမှုရာဇဝင်
- `customer_addresses`: ဖောက်သည်များ၏ လိပ်စာများ (Billing & Shipping)
- `loyalty_programs`: အမှတ်ပေးစနစ် စည်းမျဉ်းများ
- `loyalty_transactions`: အမှတ်ရရှိမှုနှင့် အသုံးပြုမှု မှတ်တမ်းများ

### ၂.၆. အရောင်း အော်ဒါများ (Order Management)
- `orders`: အော်ဒါ အချက်အလက်များ (Sale, Return, Exchange), Discount, Tax နှင့် Total Amount
- `order_items`: အော်ဒါထဲတွင် ပါဝင်သော ပစ္စည်းတစ်ခုချင်းစီ၏ အချက်အလက်
- `payments`: ငွေပေးချေမှုများ (Cash, Card, Digital, Transfer)

### ၂.၇. ဝန်ထမ်းစွမ်းဆောင်ရည် (Gamification System)
- `achievements`: ဝန်ထမ်းများ ရရှိနိုင်သော ဆုတံဆိပ်များနှင့် စည်းမျဉ်းများ
- `user_achievements`: ဝန်ထမ်းများ ရရှိပြီးသော ဆုတံဆိပ်များ
- `gamification_stats`: နေ့စဉ်၊ အပတ်စဉ်၊ လစဉ် စွမ်းဆောင်ရည် မှတ်တမ်းများ (Total Sales, Points, Rank)

### ၂.၈. စာရင်းဇယားနှင့် အစီရင်ခံစာ (Analytics & Reporting)
- `analytics_daily`: နေ့စဉ် အရောင်းအနှစ်ချုပ် Data များ (စနစ်မြန်ဆန်စေရန် ကြိုတင်တွက်ချက် သိမ်းဆည်းထားသော Pre-aggregated table)

### ၂.၉. ပရိုမိုးရှင်းများ (Promotions & Discounts)
- `promotions`: Discount အမျိုးအစားများ (Percentage, Fixed amount, Buy X Get Y)
- `promotion_usage`: ပရိုမိုးရှင်း အသုံးပြုထားသော အော်ဒါမှတ်တမ်းများ

## ၃. လုပ်ဆောင်ချက် မြန်ဆန်စေရန် စီစဉ်ထားမှု (Performance Tuning)

- **Generated Columns**: 
  - `products` table တွင် `profit_margin` ကို အလိုအလျောက် တွက်ချက်သိမ်းဆည်းထားပါသည်။
  - `inventory` table တွင် `quantity_available` ကို (quantity_on_hand - quantity_allocated) အနေဖြင့် တွက်ချက်ထားပါသည်။
  - `order_items` တွင် `profit_amount` ကို တွက်ချက်ထားပါသည်။
- **Indexes**: 
  - ကြီးမားလာနိုင်သော Table များ (ဥပမာ `orders`, `stock_movements`, `analytics_daily`) ကို အမြန်ဆုံး Query လုပ်နိုင်ရန် စနစ်တကျ Index များ (`CREATE INDEX`) တည်ဆောက်ထားပါသည်။
- **JSON Columns**: 
  - ပြောင်းလဲနိုင်သော Data များ (ဥပမာ Settings, Permissions, Attributes, Product Images) များကို Relational Table အသစ်များ ထပ်မခွဲဘဲ `JSON` column များဖြင့် သိမ်းဆည်းထားပါသည်။

## ၄. အလိုအလျောက် အလုပ်လုပ်သောစနစ် (Database Triggers)

Database အတွင်း Data ပြောင်းလဲတိုင်း အခြားသက်ဆိုင်ရာ Table များကို အလိုအလျောက် Update လုပ်ပေးမည့် Trigger များ ရေးသားထားပါသည်-

1. **Auto-update Timestamps**:
   - `users`, `products`, `customers` table များရှိ Data များကို ပြင်ဆင်လိုက်တိုင်း `updated_at` ကို လက်ရှိအချိန်သို့ အလိုအလျောက် ပြောင်းလဲပေးပါသည်။
2. **Customer Stats Auto-update**:
   - အော်ဒါအသစ် (`orders`) ကို `completed` status ဖြင့် ထည့်သွင်းလိုက်ပါက သက်ဆိုင်ရာ `customers` table မှ `total_spent`, `total_orders`, `average_order_value` များကို အလိုအလျောက် တွက်ချက်ပေါင်းထည့်ပေးပါသည်။
3. **Inventory Auto-update**:
   - ပစ္စည်းအဝင်/အထွက် (`stock_movements`) ရှိလာပါက `inventory` table ရှိ `quantity_on_hand` သို့ အလိုအလျောက် သွားရောက် Update လုပ်ပေးပါသည်။

## ၅. Multi-tenant Architecture

စနစ်သည် ဆိုင်ခွဲပေါင်းများစွာ၊ ကုမ္ပဏီပေါင်းများစွာ (Multi-tenant) အသုံးပြုနိုင်ရန် ရည်ရွယ်တည်ဆောက်ထားပါသည်။ ထို့ကြောင့် အဓိက Table တိုင်းတွင် `organization_id` နှင့် `store_id` ကို မဖြစ်မနေ ထည့်သွင်းထားပြီး၊ Data Isolation ကို အပြည့်အဝ ဆောင်ရွက်နိုင်ပါသည်။