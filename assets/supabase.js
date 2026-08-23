/* ══════════════════════════════════════════════════════════
   Supabase 연결 정보.

   여기 있는 키는 "공개 키(publishable)"입니다. 브라우저에 노출되라고
   만들어진 값이라 저장소에 그대로 올려도 됩니다.

   ★ 데이터베이스 비밀번호와 비밀 키(secret / service_role)는
     절대로 이 파일에 넣지 마십시오. 이 사이트는 정적 파일이라
     넣는 즉시 누구나 볼 수 있습니다.

   무엇을 넣고 읽을 수 있는지는 이 키가 아니라 데이터베이스 쪽
   RLS 정책이 정합니다. supabase/schema.sql을 보십시오.
   ══════════════════════════════════════════════════════════ */
const SUPABASE = {
  url: 'https://jtjveoqyocmcsfkvucwb.supabase.co/rest/v1',
  key: 'sb_publishable_pA7soUU0UiQm6vswDtm5mw_sVGs5kJH',

  /* 팀이 함께 쓰는 계정 주소. 비밀이 아닙니다 — 암호가 열쇠입니다.
     Supabase 대시보드 Authentication → Users 에서 만든 주소와
     똑같이 적어주십시오. */
  teamEmail: 'dsds@supa.com'
};
