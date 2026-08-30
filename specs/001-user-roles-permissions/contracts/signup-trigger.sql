-- 회원가입 시 members 프로필 자동 생성 트리거
-- auth.users에 새 사용자가 생성되면(SIGN UP), SECURITY DEFINER 함수로
-- RLS를 우회해 public.members에 프로필 행을 자동 생성한다.
-- (클라이언트가 직접 insert하지 않는 이유: 이메일 인증이 켜져 있으면
--  가입 직후 세션이 없어 auth.uid()가 NULL이라 RLS에 막히기 때문)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.members (id, email, name, ceo_name, company, phone, registration_number, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'ceo_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'registration_number', ''),
    'member',
    'inactive'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
