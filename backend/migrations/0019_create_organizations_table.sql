CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    website TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'VN',
    postal_code TEXT,
    timezone TEXT DEFAULT 'Asia/Yangon',
    currency TEXT DEFAULT 'MMK',
    tax_rate REAL DEFAULT 0.0,
    business_type TEXT DEFAULT 'retail',
    license_number TEXT,
    settings JSON DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    phone TEXT,
    email TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    postal_code TEXT,
    latitude REAL,
    longitude REAL,
    manager_id INTEGER,
    opening_hours JSON DEFAULT '{}',
    settings JSON DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

INSERT INTO organizations (id, name, slug, description, is_active)
VALUES (1, 'MMNext Default Org', 'mmnext-default', 'Default organization', TRUE)
ON CONFLICT(id) DO NOTHING;

UPDATE users SET organization_id = 1 WHERE organization_id IS NULL;
