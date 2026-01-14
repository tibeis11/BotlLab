-- Allow users to delete their own notifications

-- Check if policy exists before creating (to avoid errors on re-run)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'notifications'
        AND policyname = 'Users can delete own notifications'
    ) THEN
        CREATE POLICY "Users can delete own notifications"
        ON public.notifications
        FOR DELETE
        TO authenticated
        USING ( auth.uid() = user_id );
    END IF;
END
$$;
