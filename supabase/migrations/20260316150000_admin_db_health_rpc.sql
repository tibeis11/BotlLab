-- ============================================================================
-- Admin: Database Health RPC
-- Returns real-time Postgres health metrics for the admin dashboard.
-- Uses SECURITY DEFINER so the function can access pg_catalog views even
-- without granting those permissions to the calling role.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_db_health_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    -- Total database size
    'db_size_bytes',       pg_database_size(current_database()),
    'db_size_pretty',      pg_size_pretty(pg_database_size(current_database())),

    -- Connections (only for our database)
    'active_connections',  (
      SELECT count(*)
      FROM pg_stat_activity
      WHERE state != 'idle'
        AND datname = current_database()
    ),
    'idle_connections',    (
      SELECT count(*)
      FROM pg_stat_activity
      WHERE state = 'idle'
        AND datname = current_database()
    ),
    'total_connections',   (
      SELECT count(*)
      FROM pg_stat_activity
      WHERE datname = current_database()
    ),

    -- How many public user tables exist
    'table_count',         (
      SELECT count(*)
      FROM pg_stat_user_tables
    ),

    -- Buffer cache hit ratio (higher = better; < 95% is a warning sign)
    'cache_hit_ratio',     (
      SELECT ROUND(
        sum(heap_blks_hit) * 100.0 /
        NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0),
        1
      )
      FROM pg_statio_user_tables
    ),

    -- Top 5 biggest tables by total size (table + indexes)
    'biggest_tables', (
      SELECT jsonb_agg(t)
      FROM (
        SELECT
          relname                                                   AS name,
          pg_size_pretty(pg_total_relation_size(c.oid))            AS total_size,
          pg_total_relation_size(c.oid)                            AS total_size_bytes
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
          AND n.nspname = 'public'
        ORDER BY pg_total_relation_size(c.oid) DESC
        LIMIT 5
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute to authenticated and service_role
GRANT EXECUTE ON FUNCTION get_db_health_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_db_health_stats() TO service_role;
