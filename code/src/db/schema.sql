CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('home_cook', 'verified_chef', 'local_supplier', 'admin');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS home_cooks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  delivery_address TEXT
);

CREATE TABLE IF NOT EXISTS verified_chefs (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS local_suppliers (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(180),
  business_address TEXT
);

CREATE TABLE IF NOT EXISTS admins (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE verified_chefs ADD COLUMN IF NOT EXISTS bio TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('pending', 'accepted', 'packed', 'fulfilled', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ingredient_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name VARCHAR(160) NOT NULL UNIQUE,
  category_id UUID REFERENCES ingredient_categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS supplier_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES local_suppliers(user_id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  unit VARCHAR(40) NOT NULL DEFAULT 'unit',
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  current_stock NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (supplier_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS supplier_inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES supplier_inventory_items(id) ON DELETE CASCADE,
  quantity_added NUMERIC(12,3) NOT NULL CHECK (quantity_added > 0),
  expires_at DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'fresh',
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES local_suppliers(user_id) ON DELETE CASCADE,
  home_cook_id UUID REFERENCES home_cooks(user_id) ON DELETE SET NULL,
  shopping_cart_id UUID,
  status order_status NOT NULL DEFAULT 'pending',
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_order_id UUID NOT NULL REFERENCES supplier_orders(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(40) NOT NULL DEFAULT 'unit',
  price_per_unit NUMERIC(10,2) NOT NULL CHECK (price_per_unit >= 0),
  line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0)
);
