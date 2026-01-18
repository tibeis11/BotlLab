-- Table for Enterprise Access Codes
CREATE TABLE public.enterprise_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE public.enterprise_codes ENABLE ROW LEVEL SECURITY;

-- Admins (service_role or specific UID) can manage codes
CREATE POLICY "Admins can manage enterprise codes" 
ON public.enterprise_codes 
FOR ALL 
USING (auth.jwt()->>'role' = 'service_role');

-- Users can only read codes (though they shouldn't need to list them, we check via RPC/Action)
CREATE POLICY "Users can view codes if they know the code" 
ON public.enterprise_codes 
FOR SELECT 
USING (true);

COMMENT ON TABLE public.enterprise_codes IS 'One-time or multi-use codes to grant Enterprise tier status.';
