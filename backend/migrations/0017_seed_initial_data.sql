-- Seed initial data for development and testing

-- 1. Insert default Admin User
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, is_verified, department, position)
VALUES (
    'admin@pos.com', 
    '$2b$12$FQI0xlcc3OphOWwdX752Pu5zF6pzUdO0dQ9NwzYhaP8UTGEE.Xpmy', 
    'Admin', 
    'User', 
    'admin', 
    TRUE, 
    TRUE,
    'Management',
    'System Administrator'
) ON CONFLICT(email) DO NOTHING;

-- 1.5. Insert Super Admin User
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, is_verified, department, position)
VALUES (
    'thihakyaw.dtr@gmail.com', 
    '$2b$12$VL22imPeBsB9EsEaP24ZzuvlKswhpKdXSIoSWlXSMN1tYOuYuUT66', 
    'Thiha', 
    'Kyaw', 
    'admin', 
    TRUE, 
    TRUE,
    'Management',
    'Super Administrator'
) ON CONFLICT(email) DO NOTHING;

-- 2. Insert Categories
INSERT INTO categories (id, name, slug, description, is_active)
VALUES 
    (1, 'Electronics', 'electronics', 'Electronic devices and gadgets', TRUE),
    (2, 'Accessories', 'accessories', 'Computer and mobile accessories', TRUE)
ON CONFLICT(id) DO NOTHING;

-- 3. Insert sample Products
INSERT INTO products (name, slug, description, sku, barcode, selling_price, cost_price, category_id, stock_quantity)
VALUES 
    ('Premium Wireless Mouse', 'premium-wireless-mouse', 'Ergonomic wireless mouse with 2.4GHz USB receiver', 'MSE-WRL-001', '123456789012', 29.99, 12.50, 1, 50),
    ('Mechanical Keyboard', 'mechanical-keyboard', 'RGB mechanical keyboard with blue switches', 'KBD-MCH-002', '123456789029', 89.99, 45.00, 1, 30),
    ('USB-C Hub', 'usbc-hub', '7-in-1 USB-C Hub with HDMI and SD Card reader', 'HUB-USBC-003', '123456789036', 39.99, 18.00, 2, 100)
ON CONFLICT(sku) DO NOTHING;

-- 4. Insert sample Customers
INSERT INTO customers (customer_code, first_name, last_name, email, phone, total_spent)
VALUES 
    ('CUST000001', 'John', 'Doe', 'john.doe@example.com', '+1234567890', 119.98),
    ('CUST000002', 'Jane', 'Smith', 'jane.smith@example.com', '+1987654321', 39.99)
ON CONFLICT(customer_code) DO NOTHING;