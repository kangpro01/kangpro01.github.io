-- ══════════════════════════════════════════════════════════
--  불편사항 접수 테이블
--
--  Supabase 대시보드 → SQL Editor에 통째로 붙여넣고 실행하십시오.
--  두 번 실행해도 안전하게 짜여 있습니다.
--
--  핵심: 공개 키(sb_publishable_...)는 브라우저에 그대로 노출됩니다.
--  따라서 아래 RLS 정책이 유일한 방어선입니다.
--  "누구나 넣을 수 있고, 아무도 읽어갈 수 없다"가 여기서의 규칙입니다.
--  접수된 내용은 대시보드(Table Editor)에서만 보시게 됩니다.
-- ══════════════════════════════════════════════════════════

create table if not exists public.issues (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  -- 무슨 일인지 (필수)
  what        text        not null check (char_length(what) between 2 and 1000),
  -- 얼마나 자주
  how_often   text                 check (how_often is null or char_length(how_often) <= 200),
  -- 한 번에 몇 분
  minutes     text                 check (minutes   is null or char_length(minutes)   <= 200),
  -- 답을 받을 곳 (선택)
  contact     text                 check (contact   is null or char_length(contact)   <= 200)
);

-- 최근 것부터 보기 편하게
create index if not exists issues_created_at_idx on public.issues (created_at desc);

-- ── 보안 ────────────────────────────────────────────────
alter table public.issues enable row level security;

-- 넣기만 허용. select / update / delete 정책은 일부러 만들지 않습니다.
-- 정책이 없으면 그 동작은 전부 막힙니다.
drop policy if exists "anyone can submit an issue" on public.issues;
create policy "anyone can submit an issue"
  on public.issues
  for insert
  to anon, authenticated
  with check (true);

-- ══════════════════════════════════════════════════════════
--  확인하는 법
--
--  실행한 뒤 Table Editor에 issues 테이블이 보이면 됩니다.
--  사이트에서 한 건 보내보고 여기에 행이 쌓이는지 확인하십시오.
--
--  읽기가 막혔는지 검증하려면 터미널에서:
--    curl "<프로젝트 URL>/rest/v1/issues?select=*" -H "apikey: <공개 키>"
--  빈 배열 []이 돌아와야 정상입니다. 내용이 보이면 정책이 잘못된 것입니다.
-- ══════════════════════════════════════════════════════════
