SELECT 
    COUNT(*) as total_events,
    COUNT(bottle_scan_id) as linked_events,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_users,
    COUNT(CASE WHEN brew_id IS NULL THEN 1 END) as null_brews
FROM public.tasting_score_events
WHERE event_type IN ('vibe_check', 'rating_given', 'beat_the_brewer');
