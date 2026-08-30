# Data Model: 올케어안전플랫폼

Generated: 2026-08-29

---

## Overview

This document defines the entities, fields, relationships, and validation rules for the 올케어안전플랫폼 feature based on spec.md and design.md.

---

## Entities

### 1. Member

**Table**: `public.members`

**Description**: User account for construction companies and managers

**Fields**:
| Field | Type | Nullable | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | No | PRIMARY KEY | Auth UID from Supabase |
| `email` | TEXT | No | UNIQUE, FK auth.users | Login credential |
| `password_hash` | TEXT | No | | Handled by Supabase Auth |
| `company` | TEXT | No | | e.g. "OO건설(주)" |
| `manager_name` | TEXT | No | | Person name |
| `phone` | TEXT | No | | Format: 01X-XXXX-XXXX |
| `registration_number` | TEXT | No | | Format: XXX-XX-XXXXX |
| `role` | TEXT | No | CHECK('member', 'admin') | User role |
| `subscription_status` | TEXT | No | CHECK('active','inactive') | Default: 'inactive' |
| `subscription_starts_at` | TIMESTAMP | Yes | | Null until activated |
| `subscription_expires_at` | TIMESTAMP | Yes | | Null if active indefinitely |
| `created_at` | TIMESTAMP | No | DEFAULT NOW() | Account creation |
| `updated_at` | TIMESTAMP | No | DEFAULT NOW() | Last update |

**Validation Rules**:
- `email`: Valid format (RFC 5322 simplified: `^[^\s@]+@[^\s@]+\.[^\s@]+$`)
- `phone`: Format `01\d-\d{3,4}-\d{4}`
- `registration_number`: Format `\d{3}-\d{2}-\d{5}`
- `company`: Min 2 chars, max 100 chars
- `manager_name`: Min 2 chars, max 50 chars
- `password`: Min 8 chars (Supabase Auth enforces)

**Relationships**:
- 1 Member → many Documents
- 1 Member → many Inquiries
- 1 Member → many Subscriptions

---

### 2. Announcement

**Table**: `public.announcements`

**Description**: Public procurement notices from NaraJangTeo API (read-only)

**Fields**:
| Field | Type | Nullable | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | No | PRIMARY KEY | gen_random_uuid() |
| `title` | TEXT | No | | e.g. "OO초등학교 증축공사" |
| `agency` | TEXT | No | | e.g. "OO교육청" |
| `announcement_number` | TEXT | No | UNIQUE | NaraJangTeo ID |
| `category` | TEXT | No | CHECK('건축','토목','..') | Construction type |
| `deadline` | DATE | No | | Bid deadline |
| `description` | TEXT | Yes | | Full announcement text |
| `has_safety_form` | BOOLEAN | No | DEFAULT FALSE | Requires safety plan |
| `api_source` | TEXT | No | CHECK('narajangeo',...) | Which API fetched this |
| `last_synced_at` | TIMESTAMP | No | DEFAULT NOW() | Update timestamp |
| `created_at` | TIMESTAMP | No | DEFAULT NOW() | Insert time |

**Validation Rules**:
- `deadline`: Must be in future (at insert time)
- `title`: Min 5 chars, max 200 chars
- `announcement_number`: Unique per api_source

**Relationships**:
- 1 Announcement → many Documents

**Note**: Read-only from application perspective; populated by admin API sync job (not in Phase 1)

---

### 3. Document

**Table**: `public.documents`

**Description**: Construction safety plan (계획서) created by members

**Fields**:
| Field | Type | Nullable | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | No | PRIMARY KEY | gen_random_uuid() |
| `member_id` | UUID | No | FK members(id) | Owner |
| `announcement_id` | UUID | No | FK announcements(id) | Related notice |
| `title` | TEXT | No | | e.g. "OO초등학교 증축공사 계획서" |
| `status` | TEXT | No | CHECK('in_progress','completed') | Workflow state |
| `step_current` | INTEGER | No | | 1-4 (from PlanWizard) |
| `step_data` | JSONB | No | DEFAULT '{}' | Step-specific form data |
| `attachments` | JSONB | No | DEFAULT '[]' | { name, url, type, size } |
| `percent_complete` | INTEGER | No | DEFAULT 0 | 0-100 |
| `created_at` | TIMESTAMP | No | DEFAULT NOW() | |
| `updated_at` | TIMESTAMP | No | DEFAULT NOW() | Auto-updated |
| `completed_at` | TIMESTAMP | Yes | | Set when status='completed' |

**Validation Rules**:
- `step_current`: 1 ≤ value ≤ 4
- `percent_complete`: 0 ≤ value ≤ 100
- `step_data.*.required_field`: Non-empty if marked required in design.md
- File size: ≤ 50MB (per attachment)
- Allowed types: PDF, DOCX

**Relationships**:
- Many Documents → 1 Member (RLS: member sees only own)
- Many Documents → 1 Announcement

**State Transitions**:
```
in_progress → completed (step_current = 4 & all fields valid)
completed → in_progress (allow re-edit)
```

---

### 4. Inquiry

**Table**: `public.inquiries`

**Description**: Q&A between members and admins

**Fields**:
| Field | Type | Nullable | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | No | PRIMARY KEY | gen_random_uuid() |
| `member_id` | UUID | No | FK members(id) | Who asked |
| `title` | TEXT | No | | Question headline |
| `content` | TEXT | No | | Question body |
| `status` | TEXT | No | CHECK('pending','answered') | Workflow state |
| `admin_response` | TEXT | Yes | | Answer text |
| `admin_responded_by` | UUID | Yes | FK members(id) | Which admin answered |
| `answered_at` | TIMESTAMP | Yes | | When answered |
| `created_at` | TIMESTAMP | No | DEFAULT NOW() | |
| `updated_at` | TIMESTAMP | No | DEFAULT NOW() | |

**Validation Rules**:
- `title`: Min 5 chars, max 150 chars
- `content`: Min 10 chars, max 5000 chars
- `admin_response`: Required if status='answered'
- `answered_at`: Must be ≥ created_at

**Relationships**:
- Many Inquiries → 1 Member (owner, RLS: member sees only own)
- 1 Inquiry answered by 1 Admin (Member with role='admin')

**State Transitions**:
```
pending → answered (admin fills response + answered_at)
answered → pending (allow re-open by member or admin)
```

---

### 5. Subscription

**Table**: `public.subscriptions`

**Description**: Billing records (Phase 2; not in initial MVP)

**Fields**:
| Field | Type | Nullable | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | No | PRIMARY KEY | gen_random_uuid() |
| `member_id` | UUID | No | FK members(id) | Subscriber |
| `plan_type` | TEXT | No | CHECK('basic','premium') | Plan tier |
| `status` | TEXT | No | CHECK('active','expired','cancelled') | |
| `started_at` | DATE | No | | Billing start |
| `expires_at` | DATE | No | | Billing end |
| `created_at` | TIMESTAMP | No | DEFAULT NOW() | |

**Note**: Not in Phase 1; listed for completeness based on design.md subscription references.

---

### 6. ApiCredential

**Table**: `public.api_credentials`

**Description**: Admin-only secrets for syncing announcements (Phase 2+)

**Fields**:
| Field | Type | Nullable | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | UUID | No | PRIMARY KEY | gen_random_uuid() |
| `agency` | TEXT | No | | e.g. "OO교육청" |
| `api_key` | TEXT | No | | Encrypted at rest |
| `api_endpoint` | TEXT | No | | NaraJangTeo endpoint |
| `status` | TEXT | No | CHECK('active','inactive') | Enable/disable |
| `last_sync_at` | TIMESTAMP | Yes | | Last successful pull |
| `last_sync_status` | TEXT | No | CHECK('success','failed') | Health |
| `created_at` | TIMESTAMP | No | DEFAULT NOW() | |
| `updated_at` | TIMESTAMP | No | DEFAULT NOW() | |

**Note**: Admin-only (RLS enforces role='admin'). Keys encrypted via Supabase Vault (Phase 2+).

---

## Relationships Diagram

```
Members
  ├─── Documents
  │      └─── Announcements
  │
  ├─── Inquiries
  │      └─── (answered_by) Members[admin]
  │
  └─── Subscriptions

ApiCredentials (admin-only)
```

---

## Validation Summary

| Entity | Key Validations |
|--------|-----------------|
| **Member** | email format, phone format, reg# format, password ≥8 chars |
| **Announcement** | deadline in future, title length, unique announcement_number |
| **Document** | step 1-4, percent 0-100, attachment types (PDF/DOCX) ≤50MB |
| **Inquiry** | title/content length, response required if answered |
| **Subscription** | expires_at > started_at, plan_type in enum |
| **ApiCredential** | agency non-empty, endpoint valid URL, key non-empty |

---

## Database Constraints

**Uniqueness**:
- `members.email` (UNIQUE)
- `announcements.announcement_number` (UNIQUE per api_source)
- `members.registration_number` (UNIQUE, business identifier)

**Foreign Keys**:
- `documents.member_id` → `members.id` (CASCADE DELETE on member)
- `documents.announcement_id` → `announcements.id` (SET NULL if notice removed)
- `inquiries.member_id` → `members.id` (CASCADE DELETE)
- `inquiries.admin_responded_by` → `members.id` (SET NULL if admin removed)
- `subscriptions.member_id` → `members.id` (CASCADE DELETE)

**Check Constraints**:
- `members.role` IN ('member', 'admin')
- `members.subscription_status` IN ('active', 'inactive')
- `documents.status` IN ('in_progress', 'completed')
- `documents.step_current` BETWEEN 1 AND 4
- `inquiries.status` IN ('pending', 'answered')
- `announcements.category` IN enum of construction types

---

## Notes for Phase 1

- Members, Announcements (read-only mock), Documents, Inquiries fully implemented
- Subscriptions table schema included but no UI in Phase 1
- ApiCredentials table included but admin sync job deferred to Phase 2
- All RLS policies defined in contracts/rls-policies.sql
- Mock data in src/services/mockData.ts uses this schema structure

---

**Status**: Phase 1 schema complete | **Next**: contracts/ + quickstart.md
