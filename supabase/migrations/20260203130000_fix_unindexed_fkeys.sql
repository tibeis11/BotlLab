-- Fix Unindexed Foreign Keys identified by Database Linter
-- Date: 2026-02-03

-- 1. analytics_alert_history
CREATE INDEX IF NOT EXISTS idx_analytics_alert_history_ack_by 
ON public.analytics_alert_history (acknowledged_by);

-- 2. analytics_report_logs
CREATE INDEX IF NOT EXISTS idx_analytics_report_logs_setting_id 
ON public.analytics_report_logs (report_setting_id);

CREATE INDEX IF NOT EXISTS idx_analytics_report_logs_top_brew_id 
ON public.analytics_report_logs (top_brew_id);

-- 3. analytics_report_settings
CREATE INDEX IF NOT EXISTS idx_analytics_report_settings_brewery_id 
ON public.analytics_report_settings (brewery_id);

-- 4. bottle_scans
CREATE INDEX IF NOT EXISTS idx_bottle_scans_viewer_id 
ON public.bottle_scans (viewer_user_id);

-- 5. brewery_saved_brews
CREATE INDEX IF NOT EXISTS idx_brewery_saved_brews_brew_id 
ON public.brewery_saved_brews (brew_id);

CREATE INDEX IF NOT EXISTS idx_brewery_saved_brews_created_by 
ON public.brewery_saved_brews (created_by);

-- 6. brews
CREATE INDEX IF NOT EXISTS idx_brews_moderated_by 
ON public.brews (moderated_by);

-- 7. collected_caps
CREATE INDEX IF NOT EXISTS idx_collected_caps_rating_id 
ON public.collected_caps (rating_id);

-- 8. enterprise_codes
CREATE INDEX IF NOT EXISTS idx_enterprise_codes_created_by 
ON public.enterprise_codes (created_by);

-- 9. forum_posts
CREATE INDEX IF NOT EXISTS idx_forum_posts_author_id 
ON public.forum_posts (author_id);

CREATE INDEX IF NOT EXISTS idx_forum_posts_parent_id 
ON public.forum_posts (parent_id);

CREATE INDEX IF NOT EXISTS idx_forum_posts_thread_id 
ON public.forum_posts (thread_id);

-- 10. forum_threads
CREATE INDEX IF NOT EXISTS idx_forum_threads_author_id 
ON public.forum_threads (author_id);

CREATE INDEX IF NOT EXISTS idx_forum_threads_brew_id 
ON public.forum_threads (brew_id);

CREATE INDEX IF NOT EXISTS idx_forum_threads_category_id 
ON public.forum_threads (category_id);

-- 11. label_templates
CREATE INDEX IF NOT EXISTS idx_label_templates_brewery_id 
ON public.label_templates (brewery_id);

-- 12. reports
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id 
ON public.reports (reporter_id);

CREATE INDEX IF NOT EXISTS idx_reports_resolved_by 
ON public.reports (resolved_by);
