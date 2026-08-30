# Supabase 설정 가이드 (Phase 5)

## 1. Supabase 프로젝트 생성

### 1.1 Supabase 계정 생성
1. [https://supabase.com](https://supabase.com)으로 이동
2. "Sign Up" 클릭
3. GitHub 또는 이메일로 가입

### 1.2 프로젝트 생성
1. "New Project" 클릭
2. 프로젝트명: `acplatform-safety`
3. 데이터베이스 비밀번호 설정
4. 지역 선택 (권장: 서울/singapore-1)
5. "Create new project" 클릭

### 1.3 프로젝트 정보 수집
프로젝트 대시보드에서 다음 정보를 복사합니다:
- **Project URL**: `https://xxxxx.supabase.co`
- **Anon Public Key**: `eyJ...` (공개키)
- **Service Role Key**: `eyJ...` (개인키 - 서버에서만 사용)

---

## 2. 환경 변수 설정

### 2.1 .env 파일 생성

프로젝트 루트에 `.env` 파일을 생성합니다:

```bash
# .env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_ENABLE_MOCK_DATA=false
VITE_ENABLE_SUPABASE=true
```

### 2.2 .env.local (개발 환경)

로컬 개발 시 테스트 계정 설정:

```bash
# .env.local
VITE_TEST_USER_EMAIL=test@example.com
VITE_TEST_USER_PASSWORD=SecurePassword123!
```

---

## 3. PostgreSQL 스키마 배포

### 3.1 Supabase SQL 에디터 열기
1. Supabase 대시보시 > SQL Editor
2. "New Query" 클릭
3. 다음 스키마 복사-붙여넣기

### 3.2 스키마 SQL

```sql
-- contracts/schema.sql의 내용을 여기에 복사
-- 참고: 실행 순서
-- 1. Members 테이블
-- 2. Announcements 테이블
-- 3. Documents 테이블
-- 4. Inquiries 테이블
-- 5. Subscriptions 테이블
-- 6. ApiCredentials 테이블
```

### 3.3 RLS 정책 설정

```sql
-- contracts/rls-policies.sql의 내용을 여기에 복사
-- RLS는 테이블 생성 후 수동으로 활성화
```

### 3.4 실행
1. "Run" 클릭
2. 오류 확인
3. 스키마 정상 생성 확인

---

## 4. 인증 (Auth) 설정

### 4.1 Auth 설정
1. Supabase 대시보드 > Authentication > Providers
2. Email 활성화 (기본 활성화)
3. 설정:
   - Autoconfirm email: **OFF** (이메일 인증 필수)
   - Mailer: SendGrid 또는 기본값
   - Redirect URL: `http://localhost:5173/auth/callback`

### 4.2 테스트 사용자 생성
1. Users 탭 > "Invite user"
2. 테스트 이메일 입력
3. Disable email confirmations (개발 환경에서만)
4. "Send invite" 클릭

---

## 5. 데이터 마이그레이션

### 5.1 Mock → Supabase 전환

**Before (Mock Data):**
```typescript
// src/hooks/useAuth.ts (현재)
const mockUser = localStorage.getItem('mockAuthUser')
```

**After (Supabase):**
```typescript
// src/hooks/useAuth.ts (변경)
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('members')
  .select('*')
  .eq('auth_id', user.id)
  .single()
```

### 5.2 Mock 데이터 임포트
1. Supabase SQL Editor > New Query
2. 샘플 데이터 삽입:

```sql
INSERT INTO members (email, name, company, role)
VALUES 
  ('member@example.com', '김회원', '대한건설', 'member'),
  ('admin@example.com', '이관리자', '올케어', 'admin');
```

### 5.3 검증
- Supabase Table Editor에서 데이터 확인
- 각 테이블의 Row Count 확인

---

## 6. RLS (Row-Level Security) 정책

### 6.1 RLS 활성화

각 테이블에서:
1. 테이블 선택
2. "RLS" 토글 활성화
3. "New Policy" 추가

### 6.2 정책 예시

**Members 테이블:**
```sql
-- 회원은 자신의 정보만 조회/수정 가능
CREATE POLICY "Users can view own profile"
ON members FOR SELECT
USING (auth.uid() = auth_id);

-- 관리자는 모든 회원 조회 가능
CREATE POLICY "Admins can view all members"
ON members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM members m
    WHERE m.auth_id = auth.uid()
    AND m.role = 'admin'
  )
);
```

**Documents 테이블:**
```sql
-- 회원은 자신의 문서만 조회/수정
CREATE POLICY "Users can manage own documents"
ON documents FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 관리자는 모든 문서 조회
CREATE POLICY "Admins can view all documents"
ON documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE auth_id = auth.uid()
    AND role = 'admin'
  )
);
```

### 6.3 검증
- 각 정책이 "Active"로 표시됨
- 테이블별 RLS 토글 활성화됨

---

## 7. API 키 관리

### 7.1 키 보안
- **Anon Key**: 클라이언트에서만 사용 (공개)
- **Service Role Key**: 백엔드에서만 사용 (비밀)
- **API Keys**: Settings > API로 생성

### 7.2 키 로테이션
- 월 1회 이상 로테이션 권장
- 이전 키를 비활성화하지 말고 새 키로 전환

---

## 8. 실시간 구독 (Real-time)

### 8.1 Real-time 활성화
1. Supabase Dashboard > Database > Replication
2. 테이블 선택 > "Enable Real-time" 클릭
3. INSERT, UPDATE, DELETE 이벤트 선택

### 8.2 구독 코드

```typescript
// src/services/supabaseClient.ts
export function subscribeToDocuments(
  userId: string,
  callback: (payload) => void,
) {
  return supabase
    .from(`documents:user_id=eq.${userId}`)
    .on('*', (payload) => callback(payload))
    .subscribe()
}
```

---

## 9. 배포 체크리스트

### 프로덕션 준비
- [ ] 환경 변수 .env 설정
- [ ] 스키마 배포 완료
- [ ] RLS 정책 모두 적용
- [ ] Auth 설정 완료
- [ ] 테스트 계정 생성
- [ ] 모든 테이블에 RLS 활성화
- [ ] Real-time 구독 테스트
- [ ] 백업 설정 (Settings > Backups)
- [ ] 모니터링 설정 (Settings > Logs)
- [ ] SSL 인증서 설정

### 보안 체크
- [ ] Anon Key는 공개 (안전함)
- [ ] Service Role Key는 비밀 (서버에서만)
- [ ] RLS 정책이 제대로 작동
- [ ] 인증되지 않은 요청 차단 확인

---

## 10. 문제 해결

### 문제: "CORS error"
**해결:** Supabase > Settings > API > Allowed Redirect URLs에 애플리케이션 URL 추가

### 문제: "RLS policy violation"
**해결:** 정책 검토, auth.uid() 비교 확인, 테이블별 RLS 상태 확인

### 문제: "Schema not found"
**해결:** SQL 실행 순서 확인, 오류 메시지 읽기, 테이블 존재 확인

---

## 11. 다음 단계

- Phase 6: Member Features (announcements, documents, inquiries)
- Phase 7: Admin Features (member management, API credentials)
- Phase 8: Testing & Polish

**참고:** 이 가이드는 로컬 개발 기준입니다. 프로덕션은 추가 보안 설정이 필요합니다.
