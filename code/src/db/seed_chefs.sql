-- Seed: verified chefs + ingredients + recipes (idempotent).
-- All chef accounts share the password "password".
-- bcrypt hash for "password" with cost 12:
--   $2b$12$aG/OhfBaR/3qkmOoJKIRcOV6XX/OAJOcRYor7NjzuRWRyJNGsQ36u

-- ── Chefs ────────────────────────────────────────────────────────────────
INSERT INTO users (full_name, email, password_hash, role)
VALUES
  ('Chef Marco Rossi',    'marco@farmtotable.dev',  '$2b$12$aG/OhfBaR/3qkmOoJKIRcOV6XX/OAJOcRYor7NjzuRWRyJNGsQ36u', 'verified_chef'),
  ('Chef Aisha Patel',    'aisha@farmtotable.dev',  '$2b$12$aG/OhfBaR/3qkmOoJKIRcOV6XX/OAJOcRYor7NjzuRWRyJNGsQ36u', 'verified_chef'),
  ('Chef Carlos Mendez',  'carlos@farmtotable.dev', '$2b$12$aG/OhfBaR/3qkmOoJKIRcOV6XX/OAJOcRYor7NjzuRWRyJNGsQ36u', 'verified_chef'),
  ('Chef Emily Dawson',   'emily@farmtotable.dev',  '$2b$12$aG/OhfBaR/3qkmOoJKIRcOV6XX/OAJOcRYor7NjzuRWRyJNGsQ36u', 'verified_chef'),
  ('Chef Liam Tanaka',    'liam@farmtotable.dev',   '$2b$12$aG/OhfBaR/3qkmOoJKIRcOV6XX/OAJOcRYor7NjzuRWRyJNGsQ36u', 'verified_chef')
ON CONFLICT (email) DO NOTHING;

INSERT INTO verified_chefs (user_id, bio, is_verified)
SELECT u.id,
       CASE u.email
         WHEN 'marco@farmtotable.dev'  THEN 'Italian comfort cooking — pasta, focaccia, slow Sundays.'
         WHEN 'aisha@farmtotable.dev'  THEN 'Plant-based bowls, grains and turmeric warmth.'
         WHEN 'carlos@farmtotable.dev' THEN 'Latin street food and grill-forward classics.'
         WHEN 'emily@farmtotable.dev'  THEN 'Pacific Northwest seafood and seasonal greens.'
         WHEN 'liam@farmtotable.dev'   THEN 'Modern Japanese-inflected weeknight cooking.'
       END,
       TRUE
FROM users u
WHERE u.email IN (
  'marco@farmtotable.dev','aisha@farmtotable.dev','carlos@farmtotable.dev',
  'emily@farmtotable.dev','liam@farmtotable.dev'
)
ON CONFLICT (user_id) DO UPDATE
  SET bio = EXCLUDED.bio, is_verified = TRUE;

-- ── Ingredients ──────────────────────────────────────────────────────────
INSERT INTO ingredients (ingredient_name) VALUES
  ('Atlantic Salmon Fillet'),
  ('Avocado'),
  ('Roma Tomato'),
  ('Red Onion'),
  ('Lime'),
  ('Olive Oil'),
  ('Garlic Cloves'),
  ('Fresh Cilantro'),
  ('Quinoa'),
  ('Chickpeas'),
  ('Sweet Potato'),
  ('Tahini'),
  ('Beef Skirt Steak'),
  ('Corn Tortilla'),
  ('Arborio Rice'),
  ('Cremini Mushroom'),
  ('Parmesan'),
  ('Cauliflower'),
  ('Cheddar Cheese'),
  ('Coconut Milk'),
  ('Green Curry Paste'),
  ('Thai Basil')
ON CONFLICT (ingredient_name) DO NOTHING;

-- ── Recipes ──────────────────────────────────────────────────────────────
-- Helper: create or fetch a recipe by (author, title).
CREATE OR REPLACE FUNCTION ensure_recipe(
  p_author UUID, p_title TEXT, p_desc TEXT,
  p_servings INT, p_minutes INT, p_difficulty TEXT, p_tags TEXT[]
) RETURNS UUID AS $f$
DECLARE rid UUID;
BEGIN
  SELECT id INTO rid FROM recipes
    WHERE author_id = p_author AND title = p_title AND is_deleted = FALSE;
  IF rid IS NULL THEN
    INSERT INTO recipes (author_id, title, description, servings,
                         cooking_time_minutes, difficulty, dietary_tags)
    VALUES (p_author, p_title, p_desc, p_servings, p_minutes,
            p_difficulty::difficulty_level, p_tags)
    RETURNING id INTO rid;
  END IF;
  RETURN rid;
END;
$f$ LANGUAGE plpgsql;

DO $$
DECLARE
  v_marco UUID; v_aisha UUID; v_carlos UUID; v_emily UUID; v_liam UUID;
  v_recipe UUID;
BEGIN
  SELECT user_id INTO v_marco  FROM verified_chefs vc JOIN users u ON u.id=vc.user_id WHERE u.email='marco@farmtotable.dev';
  SELECT user_id INTO v_aisha  FROM verified_chefs vc JOIN users u ON u.id=vc.user_id WHERE u.email='aisha@farmtotable.dev';
  SELECT user_id INTO v_carlos FROM verified_chefs vc JOIN users u ON u.id=vc.user_id WHERE u.email='carlos@farmtotable.dev';
  SELECT user_id INTO v_emily  FROM verified_chefs vc JOIN users u ON u.id=vc.user_id WHERE u.email='emily@farmtotable.dev';
  SELECT user_id INTO v_liam   FROM verified_chefs vc JOIN users u ON u.id=vc.user_id WHERE u.email='liam@farmtotable.dev';

  -- Marco: Mushroom Risotto
  v_recipe := ensure_recipe(v_marco, 'Mushroom Risotto',
    'Creamy arborio rice slowly cooked with cremini mushrooms, garlic and parmesan.',
    2, 45, 'hard', ARRAY['vegetarian']);
  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
  SELECT v_recipe, i.id, q, u FROM (VALUES
    ('Arborio Rice', 200, 'g'),
    ('Cremini Mushroom', 250, 'g'),
    ('Garlic Cloves', 3, 'pcs'),
    ('Parmesan', 60, 'g'),
    ('Olive Oil', 30, 'ml')
  ) v(name, q, u) JOIN ingredients i ON i.ingredient_name = v.name
  ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;
  INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES
    (v_recipe, 1, 'Sauté sliced mushrooms in olive oil with garlic until browned.'),
    (v_recipe, 2, 'Toast arborio rice for 1 minute, then ladle in warm stock gradually.'),
    (v_recipe, 3, 'Stir continuously and finish with parmesan and the cooked mushrooms.')
  ON CONFLICT (recipe_id, step_number) DO NOTHING;

  -- Marco: Grilled Salmon with Avocado Salsa
  v_recipe := ensure_recipe(v_marco, 'Grilled Salmon with Avocado Salsa',
    'A vibrant, healthy dish featuring grilled Atlantic salmon topped with fresh avocado-lime salsa.',
    2, 35, 'medium', ARRAY['keto']);
  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
  SELECT v_recipe, i.id, q, u FROM (VALUES
    ('Atlantic Salmon Fillet', 400, 'g'),
    ('Avocado', 1, 'pcs'),
    ('Roma Tomato', 2, 'pcs'),
    ('Red Onion', 0.5, 'pcs'),
    ('Lime', 1, 'pcs'),
    ('Olive Oil', 30, 'ml'),
    ('Garlic Cloves', 3, 'pcs'),
    ('Fresh Cilantro', 15, 'g')
  ) v(name, q, u) JOIN ingredients i ON i.ingredient_name = v.name
  ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;
  INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES
    (v_recipe, 1, 'Pat the salmon dry, season with salt, pepper and a squeeze of lime.'),
    (v_recipe, 2, 'Heat olive oil in a grill pan and cook the salmon skin-side down for 4-5 minutes.'),
    (v_recipe, 3, 'Flip and cook 3-4 minutes more until internal temp hits 145°F.'),
    (v_recipe, 4, 'Dice avocado, tomato, red onion; combine with garlic, cilantro and lime juice.'),
    (v_recipe, 5, 'Spoon avocado salsa generously over the salmon and serve immediately.')
  ON CONFLICT (recipe_id, step_number) DO NOTHING;

  -- Aisha: Vegan Buddha Bowl
  v_recipe := ensure_recipe(v_aisha, 'Vegan Buddha Bowl',
    'A nourishing bowl loaded with quinoa, roasted chickpeas, sweet potato and a creamy tahini dressing.',
    2, 25, 'easy', ARRAY['vegan','gluten-free']);
  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
  SELECT v_recipe, i.id, q, u FROM (VALUES
    ('Quinoa', 150, 'g'),
    ('Chickpeas', 200, 'g'),
    ('Sweet Potato', 1, 'pcs'),
    ('Tahini', 30, 'g'),
    ('Lime', 1, 'pcs'),
    ('Olive Oil', 20, 'ml')
  ) v(name, q, u) JOIN ingredients i ON i.ingredient_name = v.name
  ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;
  INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES
    (v_recipe, 1, 'Roast cubed sweet potato and chickpeas at 200°C for 20 minutes.'),
    (v_recipe, 2, 'Cook quinoa per package instructions and fluff with a fork.'),
    (v_recipe, 3, 'Whisk tahini with lime juice and a splash of water for the dressing.'),
    (v_recipe, 4, 'Assemble bowls and finish with the dressing.')
  ON CONFLICT (recipe_id, step_number) DO NOTHING;

  -- Aisha: Thai Green Curry
  v_recipe := ensure_recipe(v_aisha, 'Thai Green Curry',
    'Aromatic green curry with coconut milk, fresh basil and seasonal vegetables.',
    4, 30, 'medium', ARRAY['vegan','spicy']);
  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
  SELECT v_recipe, i.id, q, u FROM (VALUES
    ('Coconut Milk', 400, 'ml'),
    ('Green Curry Paste', 60, 'g'),
    ('Sweet Potato', 1, 'pcs'),
    ('Thai Basil', 15, 'g'),
    ('Lime', 1, 'pcs')
  ) v(name, q, u) JOIN ingredients i ON i.ingredient_name = v.name
  ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;
  INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES
    (v_recipe, 1, 'Fry curry paste in a splash of coconut cream until fragrant.'),
    (v_recipe, 2, 'Add diced sweet potato and the rest of the coconut milk; simmer 15 min.'),
    (v_recipe, 3, 'Finish with thai basil and a squeeze of lime.')
  ON CONFLICT (recipe_id, step_number) DO NOTHING;

  -- Carlos: Classic Beef Tacos
  v_recipe := ensure_recipe(v_carlos, 'Classic Beef Tacos',
    'Skirt steak tacos with a punchy red onion-cilantro topping on warm corn tortillas.',
    3, 30, 'easy', ARRAY['high-protein']);
  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
  SELECT v_recipe, i.id, q, u FROM (VALUES
    ('Beef Skirt Steak', 450, 'g'),
    ('Corn Tortilla', 8, 'pcs'),
    ('Red Onion', 1, 'pcs'),
    ('Lime', 2, 'pcs'),
    ('Fresh Cilantro', 20, 'g'),
    ('Garlic Cloves', 2, 'pcs')
  ) v(name, q, u) JOIN ingredients i ON i.ingredient_name = v.name
  ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;
  INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES
    (v_recipe, 1, 'Season the skirt steak heavily and sear hot for 3 min per side. Rest.'),
    (v_recipe, 2, 'Slice thinly against the grain.'),
    (v_recipe, 3, 'Char tortillas, fill with beef and finish with red onion, cilantro and lime.')
  ON CONFLICT (recipe_id, step_number) DO NOTHING;

  -- Carlos: Keto Cauliflower Mac & Cheese
  v_recipe := ensure_recipe(v_carlos, 'Keto Cauliflower Mac & Cheese',
    'A low-carb spin on the classic — cauliflower florets baked in a sharp cheddar sauce.',
    4, 40, 'easy', ARRAY['keto','vegetarian']);
  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
  SELECT v_recipe, i.id, q, u FROM (VALUES
    ('Cauliflower', 1, 'pcs'),
    ('Cheddar Cheese', 200, 'g'),
    ('Garlic Cloves', 2, 'pcs')
  ) v(name, q, u) JOIN ingredients i ON i.ingredient_name = v.name
  ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;
  INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES
    (v_recipe, 1, 'Steam cauliflower florets until just tender.'),
    (v_recipe, 2, 'Make a quick cheddar sauce and toss the cauliflower in it.'),
    (v_recipe, 3, 'Bake at 200°C for 15 minutes until bubbly on top.')
  ON CONFLICT (recipe_id, step_number) DO NOTHING;

  -- Emily: Garlic Butter Salmon
  v_recipe := ensure_recipe(v_emily, 'Garlic Butter Salmon',
    'Pan-roasted salmon glossed in a quick garlic-lime butter — ready in 20 minutes.',
    2, 20, 'easy', ARRAY['keto','quick']);
  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
  SELECT v_recipe, i.id, q, u FROM (VALUES
    ('Atlantic Salmon Fillet', 400, 'g'),
    ('Garlic Cloves', 4, 'pcs'),
    ('Lime', 1, 'pcs'),
    ('Olive Oil', 20, 'ml'),
    ('Fresh Cilantro', 10, 'g')
  ) v(name, q, u) JOIN ingredients i ON i.ingredient_name = v.name
  ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;
  INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES
    (v_recipe, 1, 'Sear seasoned salmon skin-side down for 4 minutes.'),
    (v_recipe, 2, 'Flip, add minced garlic and butter, baste for 2 minutes.'),
    (v_recipe, 3, 'Finish with lime and chopped cilantro.')
  ON CONFLICT (recipe_id, step_number) DO NOTHING;

  -- Liam: 15-Minute Quinoa Stir Fry
  v_recipe := ensure_recipe(v_liam, '15-Minute Quinoa Stir Fry',
    'A weeknight stir fry with quinoa, mushrooms and a hit of lime — done in 15 minutes flat.',
    2, 15, 'easy', ARRAY['vegetarian','quick']);
  INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit)
  SELECT v_recipe, i.id, q, u FROM (VALUES
    ('Quinoa', 150, 'g'),
    ('Cremini Mushroom', 200, 'g'),
    ('Garlic Cloves', 2, 'pcs'),
    ('Lime', 1, 'pcs'),
    ('Olive Oil', 15, 'ml')
  ) v(name, q, u) JOIN ingredients i ON i.ingredient_name = v.name
  ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;
  INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES
    (v_recipe, 1, 'Cook quinoa per package instructions.'),
    (v_recipe, 2, 'Stir fry mushrooms with garlic until deeply browned.'),
    (v_recipe, 3, 'Toss everything together with a generous squeeze of lime.')
  ON CONFLICT (recipe_id, step_number) DO NOTHING;
END $$;

-- Drop the temporary helper so schema re-runs stay tidy.
DROP FUNCTION IF EXISTS ensure_recipe(UUID, TEXT, TEXT, INT, INT, TEXT, TEXT[]);
