-- Drop one-time backup table (no longer needed, was causing RLS security lint error)
DROP TABLE IF EXISTS public.brews_backup_pre_discover_migration;
