-- Migration: 20260219190000_migrate_timeline_to_measurements.sql
-- Purpose: Extract measurements from `brewing_sessions.timeline` JSONB and insert them into `brew_measurements`.
--          This ensures legacy sessions (created before the new `brew_measurements` table) work correctly in the new system.

DO $$
DECLARE
    session_record RECORD;
    event RECORD;
    measurement_gravity NUMERIC;
    measurement_ph NUMERIC;
    measurement_temp NUMERIC;
    measurement_volume NUMERIC;
    is_og_val BOOLEAN;
    event_date TIMESTAMP WITH TIME ZONE;
    existing_count INTEGER;
BEGIN
    RAISE NOTICE 'Starting migration of timeline events to brew_measurements...';

    -- 0. Schema Fix: Ensure brew_id is nullable (or drop it later), but for now we make it nullable so inserts work
    --    Ideally we would drop brew_id and rely on session_id, as per new design.
    --    Let's make session_id NOT NULL and brew_id NULLABLE to enforce the switch.
    
    -- Ensure session_id exists (it was added in previous migration 160000)
    -- Make brew_id nullable
    ALTER TABLE public.brew_measurements ALTER COLUMN brew_id DROP NOT NULL;
    
    -- Make session_id nullable for now (so we can insert?), actually we have session_id.
    -- But let's check constraints.

    -- Iterate over all sessions that have a non-empty timeline
    FOR session_record IN 
        SELECT id, timeline, measured_og, measure_volume 
        FROM public.brewing_sessions 
        WHERE timeline IS NOT NULL AND jsonb_array_length(timeline) > 0 
    LOOP
        
        -- Iterate over events in timeline
        -- We cast the jsonb array to a recordset to loop through easier
        FOR event IN 
            SELECT * FROM jsonb_to_recordset(session_record.timeline) AS x(type text, date text, data jsonb, title text, note text) 
        LOOP
            
            -- Skip if date is missing
            IF event.date IS NULL THEN
                CONTINUE;
            END IF;

            event_date := (event.date)::TIMESTAMP WITH TIME ZONE;
            measurement_gravity := NULL;
            measurement_ph := NULL;
            measurement_temp := NULL;
            is_og_val := FALSE;

            -- 1. Handle Gravity Measurements (OG, SG, FG)
            IF event.type IN ('MEASUREMENT_OG', 'MEASUREMENT_SG', 'MEASUREMENT_FG') THEN
                
                -- Extract Gravity
                BEGIN
                    measurement_gravity := (event.data->>'gravity')::NUMERIC;
                EXCEPTION WHEN OTHERS THEN
                    measurement_gravity := NULL;
                END;

                -- Extract Temperature if present
                BEGIN
                    measurement_temp := (event.data->>'temperature')::NUMERIC;
                EXCEPTION WHEN OTHERS THEN
                    measurement_temp := NULL;
                END;

                -- Mark as OG if type matches
                IF event.type = 'MEASUREMENT_OG' THEN
                    is_og_val := TRUE;
                    
                    -- Backfill session.measured_og if missing
                    IF session_record.measured_og IS NULL AND measurement_gravity IS NOT NULL THEN
                        UPDATE public.brewing_sessions 
                        SET measured_og = measurement_gravity 
                        WHERE id = session_record.id;
                    END IF;
                END IF;

                -- Insert into brew_measurements if valid gravity
                IF measurement_gravity IS NOT NULL THEN
                    
                    -- Check if already exists to avoid duplicates (basic check based on time and session)
                    SELECT COUNT(*) INTO existing_count 
                    FROM public.brew_measurements 
                    WHERE session_id = session_record.id 
                    AND measured_at = event_date
                    AND gravity = measurement_gravity;

                    IF existing_count = 0 THEN
                        INSERT INTO public.brew_measurements (
                            session_id,
                            measured_at,
                            gravity,
                            temperature,
                            is_og,
                            note,
                            source,
                            created_at
                        ) VALUES (
                            session_record.id,
                            event_date,
                            measurement_gravity,
                            measurement_temp,
                            is_og_val,
                            COALESCE(event.note, event.title), -- Use note or title as note
                            'timeline_migration',
                            event_date
                        );
                    END IF;
                END IF;

            -- 2. Handle pH Measurements
            ELSIF event.type = 'MEASUREMENT_PH' THEN
                
                BEGIN
                    measurement_ph := (event.data->>'ph')::NUMERIC;
                EXCEPTION WHEN OTHERS THEN
                    measurement_ph := NULL;
                END;

                IF measurement_ph IS NOT NULL THEN
                    
                     -- Check if already exists
                    SELECT COUNT(*) INTO existing_count 
                    FROM public.brew_measurements 
                    WHERE session_id = session_record.id 
                    AND measured_at = event_date
                    AND ph = measurement_ph;

                    IF existing_count = 0 THEN
                        INSERT INTO public.brew_measurements (
                            session_id,
                            measured_at,
                            ph,
                            note,
                            source,
                            created_at
                        ) VALUES (
                            session_record.id,
                            event_date,
                            measurement_ph,
                            COALESCE(event.note, event.title),
                            'timeline_migration',
                            event_date
                        );
                    END IF;
                END IF;

            -- 3. Handle Volume Measurements (Update Session Column directly, not measurements table as table lacks volume column currently)
            -- Note: If you add volume to brew_measurements later, migrate this part too.
            ELSIF event.type = 'MEASUREMENT_VOLUME' THEN
                 BEGIN
                    measurement_volume := (event.data->>'volume')::NUMERIC;
                 EXCEPTION WHEN OTHERS THEN
                    measurement_volume := NULL;
                 END;

                 IF measurement_volume IS NOT NULL THEN
                      -- Update session measure_volume if missing
                     IF session_record.measure_volume IS NULL THEN
                        UPDATE public.brewing_sessions 
                        SET measure_volume = measurement_volume
                        WHERE id = session_record.id;
                     END IF;
                 END IF;

            END IF; -- End type check

        END LOOP; -- End Event Loop

    END LOOP; -- End Session Loop

    RAISE NOTICE 'Migration completed successfully.';
END $$;
