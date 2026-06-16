-- ============================================================
--  MedTrack | database/auth/user_profiles.sql
--  Run this in Supabase SQL Editor (safe to re-run multiple times)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
    id           UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name    VARCHAR(100) NOT NULL,
    role         VARCHAR(10)  NOT NULL DEFAULT 'patient'
                              CHECK (role IN ('admin','doctor','patient')),
    linked_id    INT,
    created_at   TIMESTAMP    DEFAULT NOW()
);

-- ── RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_profile" ON user_profiles;
CREATE POLICY "users_own_profile" ON user_profiles
  FOR ALL
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── Trigger: auto-create profile on signup
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT, SELECT ON public.user_profiles TO supabase_auth_admin;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
