-- Function to redeem an enterprise code
CREATE OR REPLACE FUNCTION public.redeem_enterprise_code(input_code TEXT, input_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_code RECORD;
    result JSONB;
BEGIN
    -- 1. Look for code
    SELECT * INTO target_code 
    FROM public.enterprise_codes 
    WHERE code = input_code AND is_active = true 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültiger oder inaktiver Code.');
    END IF;

    -- 2. Check Expiry
    IF target_code.expires_at IS NOT NULL AND target_code.expires_at < now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Dieser Code ist bereits abgelaufen.');
    END IF;

    -- 3. Check Uses
    IF target_code.current_uses >= target_code.max_uses THEN
        RETURN jsonb_build_object('success', false, 'error', 'Dieser Code wurde bereits maximal oft verwendet.');
    END IF;

    -- 4. Apply to Profile
    UPDATE public.profiles 
    SET subscription_tier = 'enterprise',
        subscription_status = 'active',
        subscription_expires_at = NULL -- Enterprise via code is usually lifetime/permanent for now
    WHERE id = input_user_id;

    -- 5. Track Usage
    UPDATE public.enterprise_codes 
    SET current_uses = current_uses + 1 
    WHERE id = target_code.id;

    RETURN jsonb_build_object('success', true, 'message', 'Willkommen im Enterprise Plan! ✨');
END;
$$;
