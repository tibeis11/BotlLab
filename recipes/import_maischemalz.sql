WITH input_json AS (
    -- Füge dein JSON-Rezept von MaischeMalzundMehr hier zwischen den $json$ Tags ein:
    SELECT $json$
    {
        "Rezeptquelle": "www.maischemalzundmehr.de",
        "ExportVersion": "2.0",
        "Name": "Dein Rezept Name",
        "Datum": "23.03.2011",
        "Sorte": "Sorte",
        "Ausschlagwuerze": 20,
        "Sudhausausbeute": 0,
        "Stammwuerze": 12.5,
        "Bittere": 30,
        "Farbe": 15,
        "Alkohol": 5.2,
        "Kurzbeschreibung": "Beispiel...",
        "Malze": [
            {
                "Name": "Pilsner Malz",
                "Menge": 4,
                "Einheit": "kg"
            }
        ],
        "Maischform": "infusion",
        "Hauptguss": 16,
        "Einmaischtemperatur": 60,
        "Rasten": [
            {
                "Temperatur": 63,
                "Zeit": 45
            }
        ],
        "Abmaischtemperatur": 78,
        "Nachguss": 14,
        "Kochzeit_Wuerze": 90,
        "Hopfenkochen": [
            {
                "Sorte": "Magnum",
                "Menge": 15,
                "Alpha": 14,
                "Zeit": 70,
                "Typ": "Standard"
            }
        ],
        "Hefe": "Danstar Nottingham Ale"
    }
    $json$::jsonb AS data
),
mapped_data AS (
    SELECT
        data->>'Name' as brew_name,
        data->>'Sorte' as brew_style,
        COALESCE(data->>'Kurzbeschreibung', '') as brew_notes,
        jsonb_build_object(
            'batch_size_liters', COALESCE(NULLIF(data->>'Ausschlagwuerze', '0'), '20'),
            'boil_time_minutes', data->>'Kochzeit_Wuerze',
            'mash_water_liters', data->>'Hauptguss',
            'sparge_water_liters', data->>'Nachguss',
            'og', data->>'Stammwuerze',
            'ibu', data->>'Bittere',
            'color', data->>'Farbe',
            'abv', data->>'Alkohol',
            'mash_method', CASE
                WHEN lower(data->>'Maischform') LIKE '%infusion%'     THEN 'infusion'
                WHEN lower(data->>'Maischform') LIKE '%dekok%'        THEN 'decoction'
                WHEN lower(data->>'Maischform') LIKE '%kombi%'        THEN 'step'
                WHEN lower(data->>'Maischform') LIKE '%step%'         THEN 'step'
                WHEN lower(data->>'Maischform') LIKE '%einmaisch%'    THEN 'infusion'
                ELSE data->>'Maischform'
            END,
            'notes', data->>'Kurzbeschreibung',
            'malts', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'name', m->>'Name',
                        'amount', m->>'Menge',
                        'unit', m->>'Einheit'
                    )
                ), '[]'::jsonb) FROM jsonb_array_elements(data->'Malze') AS m
            ),
            'hops', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'name', h->>'Sorte',
                        'amount', h->>'Menge',
                        'unit', 'g',
                        'alpha', h->>'Alpha',
                        'time', h->>'Zeit',
                        'usage', CASE WHEN h->>'Typ' = 'Vorderwuerze' THEN 'First Wort'
                                      WHEN h->>'Typ' = 'Whirlpool' THEN 'Whirlpool'
                                      ELSE 'Boil' END,
                        'form', 'Pellet'
                    )
                ), '[]'::jsonb) FROM jsonb_array_elements(data->'Hopfenkochen') AS h
            ),
            'mash_steps', (
                -- Maischeschritte: Typ-Feld wird genutzt falls vorhanden (Dekoktion etc.)
                -- Mögliche Typen: Einmaischen, Aufheizen, Rast, Kochen, Abmaischen, Läutern
                SELECT COALESCE(
                    (
                        SELECT jsonb_agg(step ORDER BY ordinality)
                        FROM (
                            -- Rasten aus dem Rezept
                            SELECT
                                jsonb_build_object(
                                    'name', CASE
                                        WHEN element->>'Typ' IS NOT NULL AND element->>'Typ' <> ''
                                            THEN element->>'Typ'
                                        ELSE 'Rast ' || idx::text
                                    END,
                                    'temperature', element->>'Temperatur',
                                    'duration', element->>'Zeit'
                                ) AS step,
                                idx AS ordinality
                            FROM jsonb_array_elements(data->'Rasten') WITH ORDINALITY AS r(element, idx)
                            UNION ALL
                            -- Abmaischtemperatur als letzten Schritt hinzufügen (falls vorhanden und > 0)
                            SELECT
                                jsonb_build_object(
                                    'name', 'Abmaischen',
                                    'temperature', data->>'Abmaischtemperatur',
                                    'duration', '5'
                                ) AS step,
                                999999 AS ordinality
                            WHERE (data->>'Abmaischtemperatur')::numeric > 0
                        ) steps_combined
                    ),
                    '[]'::jsonb
                )
            ),
            'yeasts', jsonb_build_array(
                jsonb_build_object(
                    'name', data->>'Hefe',
                    'amount', '1',
                    'unit', 'pkg'
                )
            ),
            -- Default Engine Params
            'boil_off_rate', 3,
            'trub_loss', 1.5,
            'grain_absorption', 1.0,
            'cooling_shrinkage', 4.0
        ) as brew_data
    FROM input_json
)
INSERT INTO brews (
    user_id,
    brewery_id,
    name,
    style,
    brew_type,
    is_public,
    data,
    created_at
)
SELECT
    '6ac6b581-9ee6-45f4-9cb3-2fc8c3f4a9cc'::uuid,
    'c7f0ceef-ad5a-422f-83b3-22c791bbe52e'::uuid,
    brew_name,
    brew_style,
    'beer',
    false,
    brew_data,
    now()
FROM mapped_data;