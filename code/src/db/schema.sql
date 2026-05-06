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

-- Taxonomy: map specific ingredient names to a canonical ingredient
-- e.g. "Roma Tomato" -> ingredient_id for "Tomato"
CREATE TABLE IF NOT EXISTS ingredient_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_name VARCHAR(160) NOT NULL UNIQUE,
  canonical_ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User management: soft-disable any user account
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Chef verification: admins can mark a chef as verified
ALTER TABLE verified_chefs ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── Recipe Module ───────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_level') THEN
    CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  servings INT NOT NULL DEFAULT 2 CHECK (servings > 0 AND servings <= 100),
  cooking_time_minutes INT NOT NULL CHECK (cooking_time_minutes > 0 AND cooking_time_minutes <= 1440),
  difficulty difficulty_level NOT NULL DEFAULT 'medium',
  dietary_tags TEXT[] NOT NULL DEFAULT '{}',
  cover_image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INT NOT NULL CHECK (step_number > 0),
  instruction TEXT NOT NULL,
  UNIQUE (recipe_id, step_number)
);

-- RecipeContainsIngredient: maps canonical taxonomy ingredients to a recipe
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(10,3) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(40) NOT NULL DEFAULT 'unit',
  UNIQUE (recipe_id, ingredient_id)
);

-- =========================================================
-- Kitchen Challenge Participation (Phase 2 - Feature 4)
-- =========================================================

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_name VARCHAR(120) NOT NULL UNIQUE,
  badge_emoji VARCHAR(16) NOT NULL DEFAULT '🏅',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  emoji VARCHAR(16) NOT NULL DEFAULT '🏆',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  target_count INT NOT NULL CHECK (target_count > 0),
  required_tag VARCHAR(60),
  required_ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  reward_badge_id UUID REFERENCES badges(id) ON DELETE SET NULL,
  reward_points INT NOT NULL DEFAULT 100 CHECK (reward_points >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS user_challenge_participation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  progress_count INT NOT NULL DEFAULT 0 CHECK (progress_count >= 0),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS challenge_recipe_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  recipe_title VARCHAR(200) NOT NULL,
  tags TEXT,
  ingredients TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: when participation progress meets target, mark completed
-- and award the challenge's reward badge to the user.
CREATE OR REPLACE FUNCTION trg_award_badge_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_target INT;
  v_badge UUID;
BEGIN
  SELECT target_count, reward_badge_id INTO v_target, v_badge
  FROM challenges WHERE id = NEW.challenge_id;

  IF NEW.progress_count >= v_target AND NEW.completed_at IS NULL THEN
    NEW.completed_at := NOW();
    IF v_badge IS NOT NULL THEN
      INSERT INTO user_badges (user_id, badge_id, challenge_id)
      VALUES (NEW.user_id, v_badge, NEW.challenge_id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_award_badge ON user_challenge_participation;
CREATE TRIGGER trg_award_badge
BEFORE UPDATE OF progress_count ON user_challenge_participation
FOR EACH ROW EXECUTE FUNCTION trg_award_badge_on_completion();

-- View: leaderboard aggregating completions, badges and points per user
CREATE OR REPLACE VIEW challenge_leaderboard AS
SELECT
  u.id AS user_id,
  u.full_name,
  u.avatar_url,
  COUNT(DISTINCT ucp.challenge_id) FILTER (WHERE ucp.completed_at IS NOT NULL) AS challenges_completed,
  COUNT(DISTINCT ub.badge_id) AS badges_earned,
  COALESCE(SUM(c.reward_points) FILTER (WHERE ucp.completed_at IS NOT NULL), 0) AS total_points
FROM users u
LEFT JOIN user_challenge_participation ucp ON ucp.user_id = u.id
LEFT JOIN challenges c ON c.id = ucp.challenge_id
LEFT JOIN user_badges ub ON ub.user_id = u.id
GROUP BY u.id, u.full_name, u.avatar_url;

-- Seed a few badges and challenges (idempotent)
INSERT INTO badges (badge_name, badge_emoji, description) VALUES
  ('Vegan Pro', '🌱', 'Completed a vegan-themed challenge'),
  ('Spice King', '🌶️', 'Completed a spicy-cuisine challenge'),
  ('Sustainability Star', '🌿', 'Used local & sustainable ingredients'),
  ('Speed Cook', '⚡', 'Completed a fast-cooking challenge'),
  ('Zero Waste Hero', '♻️', 'Completed the Zero Waste Week challenge')
ON CONFLICT (badge_name) DO NOTHING;

INSERT INTO challenges (title, description, emoji, ends_at, target_count, required_tag, reward_badge_id, reward_points)
SELECT 'Vegan Week', 'Cook and log 3 different vegan recipes in 7 days.', '🥗',
       NOW() + INTERVAL '7 days', 3, 'vegan',
       (SELECT id FROM badges WHERE badge_name = 'Vegan Pro'), 300
WHERE NOT EXISTS (SELECT 1 FROM challenges WHERE title = 'Vegan Week');

INSERT INTO challenges (title, description, emoji, ends_at, target_count, required_tag, reward_badge_id, reward_points)
SELECT 'Spice It Up', 'Master 2 spicy dishes from any cuisine.', '🔥',
       NOW() + INTERVAL '5 days', 2, 'spicy',
       (SELECT id FROM badges WHERE badge_name = 'Spice King'), 200
WHERE NOT EXISTS (SELECT 1 FROM challenges WHERE title = 'Spice It Up');

INSERT INTO challenges (title, description, emoji, ends_at, target_count, required_tag, reward_badge_id, reward_points)
SELECT 'Zero Waste Week', 'Log 3 recipes that reuse leftovers or scraps.', '♻️',
       NOW() + INTERVAL '7 days', 3, 'zero-waste',
       (SELECT id FROM badges WHERE badge_name = 'Zero Waste Hero'), 350
WHERE NOT EXISTS (SELECT 1 FROM challenges WHERE title = 'Zero Waste Week');

INSERT INTO challenges (title, description, emoji, ends_at, target_count, required_tag, reward_badge_id, reward_points)
SELECT 'Local Roots Challenge', 'Use at least 5 locally-sourced ingredients in one recipe.', '🌾',
       NOW() + INTERVAL '10 days', 1, 'local',
       (SELECT id FROM badges WHERE badge_name = 'Sustainability Star'), 250
WHERE NOT EXISTS (SELECT 1 FROM challenges WHERE title = 'Local Roots Challenge');

INSERT INTO challenges (title, description, emoji, ends_at, target_count, required_tag, reward_badge_id, reward_points)
SELECT 'Under 20 Minutes', 'Submit 2 recipes with prep + cook under 20 minutes.', '⏱️',
       NOW() + INTERVAL '6 days', 2, 'quick',
       (SELECT id FROM badges WHERE badge_name = 'Speed Cook'), 200
WHERE NOT EXISTS (SELECT 1 FROM challenges WHERE title = 'Under 20 Minutes');
