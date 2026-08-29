-- ══════════════════════════════════════════════════════════
--  일 잘하는 강프로 — 업무 기억 보조 도구
--
--  Supabase 대시보드 → SQL Editor에 통째로 붙여넣고 실행하십시오.
--  두 번 실행해도 안전합니다.
--
--  ★ 보안의 핵심
--    모든 표는 "로그인한 사람만" 읽고 쓸 수 있습니다.
--    팀이 공유하는 계정 하나로 로그인합니다.
--    암호를 모르면 어떤 방법으로도 내용을 볼 수 없습니다.
--    (사이트를 거치지 않고 직접 요청해도 막힙니다)
--
--    SQL 실행 뒤 대시보드에서 두 가지를 꼭 해주셔야 합니다.
--    아래 맨 밑 '실행한 뒤 할 일'을 보십시오.
-- ══════════════════════════════════════════════════════════

-- 예전 공개 제보용 표. 시험 삼아 넣은 몇 건뿐이라 지웁니다.
-- 남겨두고 싶으시면 이 줄 앞에 -- 를 붙여 주석 처리하십시오.
drop table if exists public.issues;


-- ══ 업무 ══════════════════════════════════════════════════
create table if not exists public.tasks (
  id           uuid        primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  title        text        not null check (char_length(title) between 1 and 300),
  note         text                 check (note is null or char_length(note) <= 2000),
  owner        text                 check (owner is null or char_length(owner) <= 60),
  category     text                 check (category is null or char_length(category) <= 40),

  -- 마감 또는 다시 알릴 날
  due_on       date,

  -- 반복 규칙. 비우면 한 번만 하는 일.
  --   'daily'          매일
  --   'weekly:5'       매주 금요일 (0=일 … 6=토)
  --   'monthly:25'     매달 25일
  --   'yearly:03-15'   매년 3월 15일
  repeat_rule  text                 check (repeat_rule is null or char_length(repeat_rule) <= 20),

  status       text        not null default 'open'
                           check (status in ('open','done','dropped')),
  done_at      timestamptz,

  -- 마지막으로 들여다본 때. 오래 방치된 업무를 찾아내는 데 씁니다.
  last_seen_at timestamptz not null default now(),

  -- 이 업무가 어떤 업무의 후속 조치인지
  follow_up_of uuid        references public.tasks(id) on delete set null
);

create index if not exists tasks_due_idx    on public.tasks (due_on);
create index if not exists tasks_status_idx on public.tasks (status, due_on);
create index if not exists tasks_seen_idx   on public.tasks (last_seen_at);


-- ══ 불편사항 & 개선 ═══════════════════════════════════════
create table if not exists public.improvements (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- 느낀 그대로 적는 칸
  body        text        not null check (char_length(body) between 2 and 2000),

  writer      text                 check (writer is null or char_length(writer) <= 60),
  category    text                 check (category is null or char_length(category) <= 40),

  -- 여기서 나온 개선 아이디어
  idea        text                 check (idea is null or char_length(idea) <= 2000),

  priority    text        not null default 'normal'
                          check (priority in ('high','normal','low')),
  status      text        not null default 'new'
                          check (status in ('new','doing','done','dropped')),

  -- 개선을 실제 업무로 옮겼다면 그 업무
  task_id     uuid        references public.tasks(id) on delete set null
);

create index if not exists improvements_status_idx on public.improvements (status, created_at desc);
create index if not exists improvements_cat_idx    on public.improvements (category);


-- ══ 레퍼런스 ══════════════════════════════════════════════
-- 참고한 것과 참고할 것. (references 는 SQL 예약어라 refs 로 씁니다)
create table if not exists public.refs (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  title      text        not null check (char_length(title) between 1 and 300),
  url        text                 check (url  is null or char_length(url)  <= 600),
  note       text                 check (note is null or char_length(note) <= 1000),
  tag        text                 check (tag  is null or char_length(tag)  <= 40)
);

create index if not exists refs_created_idx on public.refs (created_at desc);


-- ══ 고친 시각 자동 기록 ═══════════════════════════════════
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists tasks_touch on public.tasks;
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

drop trigger if exists improvements_touch on public.improvements;
create trigger improvements_touch before update on public.improvements
  for each row execute function public.touch_updated_at();


-- ══ 보안 ══════════════════════════════════════════════════
alter table public.tasks        enable row level security;
alter table public.improvements enable row level security;
alter table public.refs         enable row level security;

drop policy if exists "team reads and writes refs" on public.refs;
create policy "team reads and writes refs"
  on public.refs for all
  to authenticated
  using (true) with check (true);

-- 로그인한 사람만. 로그인 안 하면 아무것도 못 봅니다.
drop policy if exists "team reads and writes tasks" on public.tasks;
create policy "team reads and writes tasks"
  on public.tasks for all
  to authenticated
  using (true) with check (true);

drop policy if exists "team reads and writes improvements" on public.improvements;
create policy "team reads and writes improvements"
  on public.improvements for all
  to authenticated
  using (true) with check (true);


-- ══════════════════════════════════════════════════════════
--  실행한 뒤 대시보드에서 꼭 해주실 것 두 가지
--
--  ① 공용 계정 만들기
--     Authentication → Users → Add user → Create new user
--       Email    : 팀이 함께 쓸 주소 (예: team@kangpro.site)
--                  실제로 받는 주소가 아니어도 됩니다.
--       Password : 팀에 공유할 암호. 길게 잡으십시오.
--       Auto Confirm User : 반드시 켜기 (안 켜면 로그인이 안 됩니다)
--
--  ② 아무나 가입하지 못하게 막기  ★ 이걸 빠뜨리면 전부 뚫립니다
--     Authentication → Sign In / Providers → Email
--       "Allow new users to sign up" 을 끄십시오.
--     끄지 않으면 누구나 스스로 계정을 만들어 로그인한 뒤
--     여러분의 업무를 전부 읽을 수 있습니다.
--
--  확인하는 법 — 로그인 없이 읽으려 하면 막혀야 합니다.
--    curl "<프로젝트 URL>/rest/v1/tasks?select=*" -H "apikey: <공개 키>"
--  빈 배열이나 권한 오류가 나와야 정상입니다.
-- ══════════════════════════════════════════════════════════
