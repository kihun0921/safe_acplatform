# API Contracts: 올케어안전플랫폼

Generated: 2026-08-29

---

## Overview

This document defines the Supabase PostgREST API contracts for 올케어안전플랫폼. All endpoints are auto-generated from the PostgreSQL schema in `schema.sql` with RLS enforced by `rls-policies.sql`.

---

## Authentication

**Header**: `Authorization: Bearer <JWT_TOKEN>`

**Source**: Supabase Auth (`supabase.auth.getSession()`)

**JWT Contents**:
- `sub`: User ID (matches `members.id`)
- `email`: User email
- `user_metadata`: Custom claims (role is in `members.role`, not JWT)

**Token Lifecycle**:
- Issued: On signup/login via `supabase.auth.signUpWithPassword()` or `signInWithPassword()`
- Refresh: Automatic via Supabase client (if refresh token valid)
- Expire: 3600 seconds (1 hour) by default
- Logout: `supabase.auth.signOut()` invalidates session

---

## Base URL

```
https://{PROJECT_ID}.supabase.co/rest/v1
```

Example: `https://abc123def456.supabase.co/rest/v1`

---

## Member Endpoints

### 1. GET /members

**Permission**: Own record (RLS) | Admins (all)

**Query**:
```bash
GET /rest/v1/members?id=eq.{id}&select=id,email,company,manager_name,phone,role
Authorization: Bearer {JWT}
```

**Response**:
```json
[
  {
    "id": "1",
    "email": "manager@ooconst.co.kr",
    "company": "OO건설(주)",
    "manager_name": "김담당",
    "phone": "010-1234-5678",
    "role": "member"
  }
]
```

---

### 2. POST /members

**Permission**: Public (signup creates record)

**Note**: Signup is handled by `supabase.auth.signUpWithPassword()`, which auto-creates `members` row via Postgres trigger or auth hook. Application should NOT call this endpoint directly.

---

### 3. PATCH /members/{id}

**Permission**: Own record (RLS) | Admins (RLS)

**Body**:
```json
{
  "company": "OO건설2(주)",
  "manager_name": "이담당",
  "phone": "010-5678-1234"
}
```

**Note**: `email`, `role` immutable after creation (protected by RBAC)

---

## Announcement Endpoints

### 1. GET /announcements

**Permission**: Everyone (public read)

**Query** (with filters):
```bash
GET /rest/v1/announcements?category=eq.건축&deadline=gte.2026-09-01&order=deadline.asc&limit=20
```

**Response**:
```json
[
  {
    "id": "a1",
    "title": "OO초등학교 증축공사",
    "agency": "OO교육청",
    "announcement_number": "2026-00123",
    "category": "건축",
    "deadline": "2026-09-01",
    "has_safety_form": true
  }
]
```

**Common Filters**:
- `category=eq.건축` (category filter)
- `deadline=gte.2026-09-01` (after date)
- `deadline=lte.2026-10-31` (before date)
- `title=ilike.%초등% ` (text search)
- `has_safety_form=is.true` (safety form required)

---

### 2. GET /announcements/{id}

**Permission**: Everyone (public read)

---

### 3. POST /announcements

**Permission**: Admins only (sync job)

**Note**: Used by background job to pull from NaraJangTeo API. Not called by UI in Phase 1.

---

## Document Endpoints

### 1. GET /documents

**Permission**: Own documents (RLS) | Admins (all)

**Query**:
```bash
GET /rest/v1/documents?member_id=eq.{id}&status=eq.in_progress&order=updated_at.desc
Authorization: Bearer {JWT}
```

**Response**:
```json
[
  {
    "id": "d1",
    "member_id": "1",
    "announcement_id": "a1",
    "title": "OO초등학교 증축공사 계획서",
    "status": "in_progress",
    "step_current": 3,
    "percent_complete": 68,
    "updated_at": "2026-08-27T14:22:00Z"
  }
]
```

---

### 2. POST /documents

**Permission**: Members (own) | Admins

**Body**:
```json
{
  "member_id": "1",
  "announcement_id": "a1",
  "title": "OO초등학교 증축공사 계획서",
  "status": "in_progress",
  "step_current": 1,
  "step_data": {
    "step1": {
      "project_name": "OO초등학교 증축공사",
      "location": "서울시 강남구",
      "manager": "김담당"
    }
  }
}
```

**Validation** (client-side + RLS):
- `member_id` must equal `auth.uid()` (RLS prevents forgery)
- `announcement_id` must exist
- `step_current` must be 1-4
- `percent_complete` must be 0-100

---

### 3. PATCH /documents/{id}

**Permission**: Owner (RLS) | Admins (RLS)

**Body** (partial update):
```json
{
  "step_current": 2,
  "step_data": {
    "step1": {...},
    "step2": {
      "safety_manager": "박안전",
      "hazards": "추락, 낙하물"
    }
  },
  "percent_complete": 45
}
```

---

### 4. DELETE /documents/{id}

**Permission**: Owner (RLS) | Admins (RLS)

---

## Inquiry Endpoints

### 1. GET /inquiries

**Permission**: Own inquiries (RLS) | Admins (all)

**Query**:
```bash
GET /rest/v1/inquiries?member_id=eq.{id}&order=created_at.desc
Authorization: Bearer {JWT}
```

**Response**:
```json
[
  {
    "id": "i1",
    "member_id": "1",
    "title": "계획서 작성 중 항목이 초기화됐어요",
    "content": "3단계에서 저장을 눌렀는데 1단계로 돌아갔어요",
    "status": "pending",
    "admin_response": null,
    "answered_at": null,
    "created_at": "2026-08-27T10:00:00Z"
  }
]
```

---

### 2. POST /inquiries

**Permission**: Members (own) | Admins

**Body**:
```json
{
  "member_id": "1",
  "title": "계획서 작성 중 항목이 초기화됐어요",
  "content": "3단계에서 저장을 눌렀는데 1단계로 돌아갔어요",
  "status": "pending"
}
```

**Validation**:
- `title`: 5-150 chars
- `content`: 10-5000 chars
- `member_id` must equal `auth.uid()` (RLS)

---

### 3. PATCH /inquiries/{id}

**Admin Response** (admin-only):
```json
{
  "status": "answered",
  "admin_response": "자동저장 기능이 일시적으로 지연됐었습니다. 이제 안정화됐으니 다시 시도해주세요.",
  "admin_responded_by": "admin-1",
  "answered_at": "2026-08-27T15:30:00Z"
}
```

**Member Reopen** (member-only):
```json
{
  "status": "pending"
}
```

---

### 4. DELETE /inquiries/{id}

**Permission**: Owner (RLS) | Admins (RLS)

---

## ApiCredentials Endpoints

**All endpoints admin-only (RLS enforced)**

### 1. GET /api_credentials

```bash
GET /rest/v1/api_credentials?order=agency.asc
Authorization: Bearer {ADMIN_JWT}
```

---

### 2. POST /api_credentials

```json
{
  "agency": "OO도로시설공단",
  "api_key": "xxxxx (encrypted at rest)",
  "api_endpoint": "https://api.narajangeo.kr/...",
  "status": "active"
}
```

---

### 3. PATCH /api_credentials/{id}

```json
{
  "status": "inactive",
  "last_sync_status": "failed"
}
```

---

## Error Responses

All endpoints return standard HTTP status codes and JSON error bodies:

### 401 Unauthorized
```json
{
  "message": "Unauthorized",
  "details": "JWT expired or invalid"
}
```

### 403 Forbidden (RLS Violation)
```json
{
  "message": "new row violates row-level security policy",
  "code": "42501"
}
```

### 404 Not Found
```json
{
  "message": "relation \"public.documents\" does not exist"
}
```

### 400 Bad Request
```json
{
  "message": "Invalid input",
  "details": "step_current must be between 1 and 4"
}
```

---

## Pagination

Use `limit` and `offset` query parameters:

```bash
GET /rest/v1/documents?limit=10&offset=20
```

Or use `Range` header for cursoring (Supabase-specific):

```bash
GET /rest/v1/documents
Range: 20-30
```

---

## Filtering & Ordering

**Operators**:
- `eq` - equal
- `neq` - not equal
- `gt`, `gte`, `lt`, `lte` - comparison
- `like`, `ilike` - pattern matching
- `in` - IN operator
- `is` - null check

**Examples**:
```
?status=eq.completed
?percent_complete=gte.50
?title=ilike.%안전%
?created_at=gte.2026-08-01&created_at=lte.2026-08-31
?order=created_at.desc,title.asc
```

---

## Real-Time Subscriptions (Phase 2+)

Supabase PostgREST supports WebSocket subscriptions via `supabase.auth.onAuthStateChange()`:

```ts
const subscription = supabase
  .from('documents')
  .on('*', (payload) => {
    console.log('Document updated:', payload);
  })
  .subscribe();
```

**In Phase 1**: Mock polling via hooks (`useAnnouncements`, `useDocuments`).

---

## Rate Limiting

Supabase free tier: 200 req/sec per project.

Phase 1 (mock data): No actual API calls.
Phase 2+: Monitor API usage in Supabase dashboard.

---

## Notes for Frontend Integration

All API calls are mediated by the `supabase` client in `src/services/db.ts`:

```ts
// Example
export const fetchDocuments = async (memberId: string) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('member_id', memberId);
  
  if (error) throw error;
  return data;
};
```

RLS is automatically enforced by Supabase; frontend doesn't need to check permissions (though UI should hide admin-only sections).

---

**Status**: API contract complete | **Usage**: Phase 2+ Supabase integration
