export interface MockUser {
  id: string
  email: string
  name: string
  company: string
  role: 'member' | 'admin'
  registrationNumber: string
  phone: string
}

export interface MockAnnouncement {
  id: string
  title: string
  organization: string
  deadline: string
  category: string
  description: string
  projectCode: string
}

export interface MockDocument {
  id: string
  userId: string
  announcementId: string
  title: string
  status: 'in_progress' | 'completed'
  currentStep: number
  percentComplete: number
  createdAt: string
  updatedAt: string
  lastSavedAt: string
}

export interface MockInquiry {
  id: string
  userId: string
  title: string
  content: string
  status: 'open' | 'answered'
  answer?: string
  createdAt: string
  answeredAt?: string
}

export const MOCK_USERS: MockUser[] = [
  {
    id: 'user-1',
    email: 'member@example.com',
    name: '김회원',
    company: '대한건설',
    role: 'member',
    registrationNumber: '123-45-67890',
    phone: '010-1234-5678',
  },
  {
    id: 'user-2',
    email: 'admin@example.com',
    name: '이관리자',
    company: '올케어',
    role: 'admin',
    registrationNumber: '987-65-43210',
    phone: '010-9876-5432',
  },
]

export const MOCK_ANNOUNCEMENTS: MockAnnouncement[] = [
  {
    id: 'ann-1',
    title: '건설 안전 프로젝트 A - 지반조사 용역',
    organization: '기획재정부',
    deadline: '2026-09-30',
    category: '지반조사',
    description: '대규모 건설 프로젝트의 지반조사 용역입니다.',
    projectCode: 'PRJ-2026-001',
  },
  {
    id: 'ann-2',
    title: '도로 건설 프로젝트 B - 설계 용역',
    organization: '국토교통부',
    deadline: '2026-10-15',
    category: '설계',
    description: '도로 건설을 위한 설계 용역입니다.',
    projectCode: 'PRJ-2026-002',
  },
  {
    id: 'ann-3',
    title: '건축 안전 프로젝트 C - 감리 용역',
    organization: '환경부',
    deadline: '2026-11-01',
    category: '감리',
    description: '친환경 건축 프로젝트의 감리 용역입니다.',
    projectCode: 'PRJ-2026-003',
  },
]

export const MOCK_DOCUMENTS: MockDocument[] = [
  {
    id: 'doc-1',
    userId: 'user-1',
    announcementId: 'ann-1',
    title: 'PRJ-2026-001 안전보건관리계획서',
    status: 'in_progress',
    currentStep: 2,
    percentComplete: 50,
    createdAt: '2026-08-20',
    updatedAt: '2026-08-28',
    lastSavedAt: '2026-08-28T14:32:00Z',
  },
  {
    id: 'doc-2',
    userId: 'user-1',
    announcementId: 'ann-2',
    title: 'PRJ-2026-002 안전보건관리계획서',
    status: 'completed',
    currentStep: 4,
    percentComplete: 100,
    createdAt: '2026-07-15',
    updatedAt: '2026-08-25',
    lastSavedAt: '2026-08-25T10:15:00Z',
  },
]

export const MOCK_INQUIRIES: MockInquiry[] = [
  {
    id: 'inq-1',
    userId: 'user-1',
    title: '안전보건관리계획서 작성 방법',
    content: '각 단계별로 어떤 내용을 작성해야 하나요?',
    status: 'answered',
    answer: '각 단계에 따라 필요한 항목이 다릅니다. 공고 요구사항을 확인하세요.',
    createdAt: '2026-08-25',
    answeredAt: '2026-08-26',
  },
  {
    id: 'inq-2',
    userId: 'user-1',
    title: 'PDF 다운로드 시 문제 발생',
    content: 'PDF 파일을 다운로드할 때 오류가 발생합니다.',
    status: 'open',
    createdAt: '2026-08-27',
  },
]
