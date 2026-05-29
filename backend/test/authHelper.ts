import jwt from '@tsndr/cloudflare-worker-jwt';

export const generateMockToken = async (role: string = 'admin', orgId: number = 1, storeId: number = 1) => {
  const payload = {
    userId: 1,
    username: 'test_user',
    email: 'test@example.com',
    role,
    orgId,
    organization_id: orgId,
    storeId,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
    iat: Math.floor(Date.now() / 1000)
  };

  // Mock JWT_SECRET is what vitest handles or we use a hardcoded one for test environment
  return await jwt.sign(payload, 'test-secret');
};

export const createAuthRequest = async (path: string, method: string = 'GET', role: string = 'admin', body?: any) => {
  const token = await generateMockToken(role);
  
  const headers = new Headers({
    'Authorization': `Bearer ${token}`
  });
  
  if (body) {
    headers.set('Content-Type', 'application/json');
  }

  return new Request(`http://example.com${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
};

// Let's just create the tables we need directly to avoid migration hell
export const setupDatabase = async (env: any) => {
  // We only need the users table and a few others to prevent 500s.
  // Actually, D1 has a simpler way to run migrations in Miniflare.
  // But hardcoding a minimal schema is safest for now.
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER, store_id INTEGER, name TEXT, email TEXT, role TEXT, status TEXT);`,
    `CREATE TABLE IF NOT EXISTS activity_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT, entity_type TEXT, entity_id INTEGER, old_values TEXT, new_values TEXT, created_at TEXT);`,
    `CREATE TABLE IF NOT EXISTS achievements (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER, name TEXT, description TEXT, icon_url TEXT, condition_type TEXT, condition_value INTEGER, points_reward INTEGER, is_active INTEGER DEFAULT 1);`,
    `CREATE TABLE IF NOT EXISTS user_achievements (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, achievement_id INTEGER, earned_at TEXT);`,
    `CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, store_id INTEGER, customer_id INTEGER, cashier_id INTEGER, total_amount REAL, discount_amount REAL, tax_amount REAL, final_amount REAL, status TEXT, payment_status TEXT, payment_method TEXT, created_at TEXT, updated_at TEXT);`,
    `CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, product_id INTEGER, quantity INTEGER, unit_price REAL, subtotal REAL);`,
    `CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, store_id INTEGER, quantity INTEGER);`,
    `CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id INTEGER, category_id INTEGER, name TEXT, sku TEXT, barcode TEXT, description TEXT, price REAL, cost_price REAL, is_active INTEGER DEFAULT 1);`
  ];
  
  for (const q of queries) {
    await env.DB.prepare(q).run();
  }
};
