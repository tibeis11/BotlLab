INSERT INTO brews (id, name, brew_type, data) VALUES (
  '00000000-0000-4000-0000-000000000099',
  'Adapter Test Brew',
  'beer',
  '{
    "malts": [{"name": "Pilsner", "amount": 4.5, "unit": "kg", "color": 3.5}],
    "hops": [{"name": "Cascade", "amount": 50, "unit": "g", "time": 60, "usage": "boil", "alpha": 5.5}],
    "yeast": [{"name": "US-05", "amount": 1, "unit": "pkg", "attenuation": 81}]
  }'::jsonb
);
