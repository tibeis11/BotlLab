-- Add Squad Related Achievements
INSERT INTO achievements (id, name, description, icon, category, tier, points, created_at)
VALUES
    ('squad_founder', 'Squad Founder', 'Gründe dein eigenes Brauerei-Team', '🏰', 'social', 'silver', 30, NOW()),
    ('team_player', 'Team Player', 'Tritt einem Brauerei-Team bei', '🤝', 'social', 'bronze', 15, NOW()),
    ('team_brewer', 'Team Brewer', 'Erstelle ein Rezept für dein Team', '🍻', 'brewing', 'silver', 20, NOW()),
    ('squad_growth', 'Full House', 'Sei Teil eines Teams mit 3+ Mitgliedern', '👥', 'social', 'gold', 40, NOW())
ON CONFLICT (id) DO NOTHING;
