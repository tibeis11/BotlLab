-- Migration: Add Forum Schema
-- Date: 2026-01-22

-- 1. Forum Categories
CREATE TABLE "public"."forum_categories" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "slug" text NOT NULL UNIQUE,
    "title" text NOT NULL,
    "description" text,
    "icon" text, -- Lucide icon name
    "sort_order" integer DEFAULT 0,
    "created_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "public"."forum_categories" ENABLE ROW LEVEL SECURITY;

-- Everyone can read categories
CREATE POLICY "Public read access for forum categories" 
ON "public"."forum_categories" FOR SELECT 
TO public 
USING (true);

-- Only admins can modify (For now strictly seed/migration managed, or admin dashboard later)
-- We rely on seed scripts for now, no explicit write policy for users.


-- 2. Forum Threads
CREATE TABLE "public"."forum_threads" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "category_id" uuid NOT NULL REFERENCES "public"."forum_categories"(id) ON DELETE RESTRICT,
    "author_id" uuid NOT NULL REFERENCES "public"."profiles"(id) ON DELETE CASCADE,
    "brew_id" uuid REFERENCES "public"."brews"(id) ON DELETE SET NULL, -- Optional link to a brew
    
    "title" text NOT NULL CHECK (length(title) >= 5),
    "content" text NOT NULL, -- The initial post content logic is often handled variously, but spec says "content" here for OP.
    
    "is_pinned" boolean DEFAULT false,
    "is_locked" boolean DEFAULT false,
    
    "view_count" integer DEFAULT 0,
    "reply_count" integer DEFAULT 0, -- Denormalized count for performance
    
    "last_reply_at" timestamptz DEFAULT now() NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "public"."forum_threads" ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for forum threads" 
ON "public"."forum_threads" FOR SELECT 
TO public 
USING (true);

-- Authenticated users can create threads
CREATE POLICY "Authenticated users can create threads" 
ON "public"."forum_threads" FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = author_id);

-- Authors can update their own threads (text only, usually)
CREATE POLICY "Authors can update own threads" 
ON "public"."forum_threads" FOR UPDATE 
TO authenticated 
USING (auth.uid() = author_id);

-- 3. Forum Posts (Replies)
CREATE TABLE "public"."forum_posts" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "thread_id" uuid NOT NULL REFERENCES "public"."forum_threads"(id) ON DELETE CASCADE,
    "author_id" uuid NOT NULL REFERENCES "public"."profiles"(id) ON DELETE CASCADE,
    "parent_id" uuid REFERENCES "public"."forum_posts"(id) ON DELETE SET NULL, -- For threading/nesting
    
    "content" text NOT NULL,
    
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "public"."forum_posts" ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for forum posts" 
ON "public"."forum_posts" FOR SELECT 
TO public 
USING (true);

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts" 
ON "public"."forum_posts" FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = author_id);

-- Authors can update own posts
CREATE POLICY "Authors can update own posts" 
ON "public"."forum_posts" FOR UPDATE 
TO authenticated 
USING (auth.uid() = author_id);


-- 4. Triggers for stats

-- Update `updated_at` on thread update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_forum_threads_updated_at
    BEFORE UPDATE ON public.forum_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_posts_updated_at
    BEFORE UPDATE ON public.forum_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- Update `last_reply_at` and `reply_count` on new post
CREATE OR REPLACE FUNCTION update_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.forum_threads
        SET last_reply_at = NEW.created_at,
            reply_count = reply_count + 1
        WHERE id = NEW.thread_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.forum_threads
        SET reply_count = reply_count - 1
        WHERE id = OLD.thread_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_thread_stats_trigger
    AFTER INSERT OR DELETE ON public.forum_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_stats();


-- 5. Seed Initial Categories
INSERT INTO "public"."forum_categories" (slug, title, description, icon, sort_order) VALUES
('ankundigungen', 'Ankündigungen', 'Neuigkeiten rund um BotlLab', 'Megaphone', 10),
('rezepte', 'Rezepte & Zutaten', 'Diskussionen über Malz, Hopfen und Hefe', 'Scroll', 20),
('technik', 'Technik & Equipment', 'Alles über Brauanlagen, Kegs und DIY', 'Wrench', 30),
('marktplatz', 'Marktplatz', 'Suche und Biete Equipment', 'ShoppingBag', 40),
('off-topic', 'Off-Topic', 'Alles was sonst nirgends reinpasst', 'Coffee', 99)
ON CONFLICT (slug) DO NOTHING;

