-- Prüfung: Haben die Feed-Einträge überhaupt verknüpfte Profile?
SELECT 
    f.content ->> 'message' as nachricht,
    f.created_at,
    f.user_id,
    p.id as profile_id,
    p.display_name,
    p.logo_url
FROM brewery_feed f
LEFT JOIN profiles p ON f.user_id = p.id
ORDER BY f.created_at DESC
LIMIT 10;
