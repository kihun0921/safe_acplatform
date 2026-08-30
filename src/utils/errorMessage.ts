// Supabase의 PostgrestError 등은 message 필드를 가진 일반 객체일 뿐 JS Error 인스턴스가
// 아닌 경우가 많다. err instanceof Error로만 판별하면 String(err)가 "[object Object]"로
// 찍혀 사용자에게 아무 정보도 주지 못한다 — message 프로퍼티가 있으면 그것부터 사용한다.
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message
  }
  return String(err)
}
