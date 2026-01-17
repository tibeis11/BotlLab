-- Seed achievements data
INSERT INTO public.achievements (id, name, description, icon, category, tier, points, created_at)
VALUES
    ('first_brew', 'Erster Sud', 'Du hast dein erstes Rezept erstellt.', '🍺', 'brewing', 'bronze', 10, NOW()),
    ('public_creator', 'Open Source', 'Du hast ein Rezept veröffentlicht.', '🌍', 'social', 'bronze', 10, NOW()),
    ('remix_master', 'Remix Artist', 'Du hast ein Rezept eines anderen variiert.', '🎧', 'brewing', 'silver', 20, NOW()),
    ('first_bottle', 'Abgefüllt', 'Die erste Flasche ist registriert.', '🍾', 'brewing', 'bronze', 10, NOW()),
    ('collector_10', 'Sammler (10)', '10 Rezepte erstellt.', '📚', 'milestone', 'bronze', 20, NOW()),
    ('collector_25', 'Sammler (25)', '25 Rezepte erstellt.', '📚', 'milestone', 'silver', 40, NOW()),
    ('collector_50', 'Sammler (50)', '50 Rezepte erstellt.', '📚', 'milestone', 'gold', 80, NOW()),
    ('bottler_50', 'Großabfüller', '50 Flaschen registriert.', '🏭', 'milestone', 'silver', 50, NOW()),
    ('bottler_100', 'Industrie-Standard', '100 Flaschen registriert.', '🏭', 'milestone', 'gold', 100, NOW()),
    ('top_rated', 'Meisterwerk', 'Ein Sud mit durchschnittlich 4.5+ Sternen.', '⭐', 'quality', 'gold', 50, NOW()),
    ('popular_50', 'Lokalmatador', '50 Ratings erhalten.', '🏘️', 'social', 'silver', 30, NOW()),
    ('popular_100', 'Rockstar', '100 Ratings erhalten.', '🎸', 'social', 'gold', 60, NOW()),
    ('team_player', 'Team Player', 'Tritt einem Brauerei-Team bei', '🤝', 'social', 'bronze', 15, NOW()),
    ('squad_founder', 'Squad Founder', 'Gründe dein eigenes Brauerei-Team', '🏰', 'social', 'silver', 30, NOW()),
    ('team_brewer', 'Team Brewer', 'Erstelle ein Rezept für dein Team', '🍻', 'brewing', 'silver', 20, NOW()),
    ('squad_growth', 'Full House', 'Sei Teil eines Teams mit 3+ Mitgliedern', '👥', 'social', 'gold', 40, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    tier = EXCLUDED.tier,
    points = EXCLUDED.points;
