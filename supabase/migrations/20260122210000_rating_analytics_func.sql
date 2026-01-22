CREATE OR REPLACE FUNCTION "public"."get_brew_taste_profile"(p_brew_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'bitterness', ROUND(AVG(taste_bitterness), 1),
    'sweetness', ROUND(AVG(taste_sweetness), 1),
    'body', ROUND(AVG(taste_body), 1),
    'carbonation', ROUND(AVG(taste_carbonation), 1),
    'acidity', ROUND(AVG(taste_acidity), 1),
    'count', COUNT(*) 
  )
  INTO result
  FROM "public"."ratings"
  WHERE brew_id = p_brew_id 
    AND moderation_status = 'auto_approved';
    
  RETURN result;
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION "public"."get_brew_taste_profile"(p_brew_id UUID) OWNER TO "postgres";
GRANT EXECUTE ON FUNCTION "public"."get_brew_taste_profile"(UUID) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_brew_taste_profile"(UUID) TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."get_brew_taste_profile"(UUID) TO "anon"; 
