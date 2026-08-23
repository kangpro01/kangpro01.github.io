/* ══════════════════════════════════════════════════════════
   "언제" 를 사람 말로 받습니다.

   "3일 뒤", "다음 주 금요일", "매주 금요일", "매달 25일", "9/15"
   같은 입력을 날짜와 반복 규칙으로 바꿉니다.

   parseWhen('매주 금요일')
     → { due_on:'2026-08-28', repeat:'weekly:5', label:'매주 금요일' }

   못 알아들으면 null을 돌려줍니다. 그때는 화면에서 날짜를 직접 고르게 합니다.
   ══════════════════════════════════════════════════════════ */
const WHEN = (function(){
  const pad = n => String(n).padStart(2,'0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
  const midnight = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
  const plus = (d,n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };

  const DOW = ['일','월','화','수','목','금','토'];

  /* 숫자 — 아라비아 숫자와 한글 수를 모두 받습니다 */
  const WORD = {
    '하루':1, '이틀':2, '사흘':3, '나흘':4, '닷새':5, '엿새':6, '이레':7,
    '여드레':8, '아흐레':9, '열흘':10,
    '한':1, '두':2, '세':3, '네':4, '다섯':5, '여섯':6, '일곱':7,
    '여덟':8, '아홉':9, '열':10
  };
  function num(s){
    if(s == null) return null;
    s = String(s).trim();
    if(/^\d+$/.test(s)) return parseInt(s,10);
    return WORD[s] ?? null;
  }

  /* 그 주의 특정 요일 — week 0=이번 주, 1=다음 주 */
  function dowDate(dow, week){
    const t = midnight();
    const mon = plus(t, -((t.getDay() + 6) % 7));      // 이번 주 월요일
    const base = plus(mon, week * 7);
    const want = plus(base, (dow + 6) % 7);            // 월요일 기준 자리
    // 이번 주인데 이미 지났으면 다음 주로 넘깁니다
    return (week === 0 && want < t) ? plus(want, 7) : want;
  }

  function parseWhen(input){
    if(!input) return null;
    const s = String(input).trim().replace(/\s+/g,' ');
    if(!s) return null;
    const T = midnight();

    /* ── 반복 ────────────────────────────────────── */
    if(/^매일|날마다$/.test(s) || /^매일/.test(s))
      return { due_on: ymd(T), repeat:'daily', label:'매일' };

    let m = s.match(/^매주\s*([일월화수목금토])(요일)?$/);
    if(m){
      const d = DOW.indexOf(m[1]);
      return { due_on: ymd(dowDate(d, 0)), repeat:'weekly:'+d, label:'매주 '+m[1]+'요일' };
    }

    m = s.match(/^(?:매달|매월)\s*(\d{1,2})\s*일?$/);
    if(m){
      const day = Math.min(parseInt(m[1],10), 28);
      const next = new Date(T.getFullYear(), T.getMonth(), day);
      return {
        due_on: ymd(next < T ? new Date(T.getFullYear(), T.getMonth()+1, day) : next),
        repeat: 'monthly:'+day, label:'매달 '+day+'일'
      };
    }
    if(/^(매달|매월)\s*(말일?|마지막)$/.test(s))
      return { due_on: ymd(new Date(T.getFullYear(), T.getMonth()+1, 0)),
               repeat:'monthly:28', label:'매달 말' };

    m = s.match(/^매년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?$/);
    if(m){
      const mm = +m[1], dd = +m[2];
      const next = new Date(T.getFullYear(), mm-1, dd);
      return {
        due_on: ymd(next < T ? new Date(T.getFullYear()+1, mm-1, dd) : next),
        repeat: 'yearly:'+pad(mm)+'-'+pad(dd), label:'매년 '+mm+'월 '+dd+'일'
      };
    }

    /* ── 한 번만 ─────────────────────────────────── */
    if(/^오늘$/.test(s))  return { due_on: ymd(T),         repeat:null, label:'오늘' };
    if(/^내일$/.test(s))  return { due_on: ymd(plus(T,1)), repeat:null, label:'내일' };
    if(/^모레$/.test(s))  return { due_on: ymd(plus(T,2)), repeat:null, label:'모레' };
    if(/^글피$/.test(s))  return { due_on: ymd(plus(T,3)), repeat:null, label:'글피' };

    // "이틀 뒤", "사흘 후", "열흘 뒤" — 수와 단위가 한 낱말인 경우
    m = s.match(/^(하루|이틀|사흘|나흘|닷새|엿새|이레|여드레|아흐레|열흘)\s*(뒤|후|있다가|지나서)$/);
    if(m) return { due_on: ymd(plus(T, WORD[m[1]])), repeat:null, label: m[1] + ' 뒤' };

    // "3일 뒤", "일주일 뒤", "2주 후", "한 달 뒤"
    m = s.match(/^(\S+?)\s*(일|주일?|개월|달)\s*(뒤|후|있다가|지나서)$/);
    if(m){
      const n = num(m[1]) ?? (m[1] === '일' ? 1 : null);
      if(n != null){
        const unit = m[2];
        if(unit === '일'){
          return { due_on: ymd(plus(T,n)), repeat:null, label:n+'일 뒤' };
        }
        if(unit.startsWith('주')){
          return { due_on: ymd(plus(T,n*7)), repeat:null, label:n+'주 뒤' };
        }
        const d = new Date(T); d.setMonth(d.getMonth()+n);
        return { due_on: ymd(d), repeat:null, label:n+'개월 뒤' };
      }
    }
    // "일주일 뒤"처럼 수가 앞에 붙은 형태
    m = s.match(/^일\s*주일?\s*(뒤|후)$/);
    if(m) return { due_on: ymd(plus(T,7)), repeat:null, label:'일주일 뒤' };

    // "이번 주 금요일", "다음 주 월요일", "담주 화요일"
    m = s.match(/^(이번|금|다음|담|차)\s*주\s*([일월화수목금토])(요일)?$/);
    if(m){
      const week = /이번|금/.test(m[1]) ? 0 : 1;
      const d = DOW.indexOf(m[2]);
      return { due_on: ymd(dowDate(d, week)), repeat:null,
               label:(week ? '다음 주 ' : '이번 주 ') + m[2] + '요일' };
    }
    if(/^(다음|담)\s*주$/.test(s))
      return { due_on: ymd(dowDate(1,1)), repeat:null, label:'다음 주 월요일' };
    if(/^(이번|금)\s*주\s*(말|끝)$/.test(s))
      return { due_on: ymd(dowDate(5,0)), repeat:null, label:'이번 주 금요일' };

    // "다음 달"
    if(/^(다음|담)\s*(달|월)$/.test(s)){
      const d = new Date(T.getFullYear(), T.getMonth()+1, 1);
      return { due_on: ymd(d), repeat:null, label:'다음 달 1일' };
    }
    // "월말", "이번 달 말"
    if(/^(월말|이번\s*달\s*말)$/.test(s))
      return { due_on: ymd(new Date(T.getFullYear(), T.getMonth()+1, 0)), repeat:null, label:'이번 달 말' };

    /* ── 날짜를 그대로 적은 경우 ──────────────────── */
    m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
    if(m){
      const d = new Date(+m[1], +m[2]-1, +m[3]);
      return { due_on: ymd(d), repeat:null, label: m[2]+'월 '+m[3]+'일' };
    }
    m = s.match(/^(\d{1,2})\s*[/월]\s*(\d{1,2})\s*일?$/);
    if(m){
      const mm = +m[1], dd = +m[2];
      const y = new Date(T.getFullYear(), mm-1, dd) < T ? T.getFullYear()+1 : T.getFullYear();
      return { due_on: ymd(new Date(y, mm-1, dd)), repeat:null, label: mm+'월 '+dd+'일' };
    }

    return null;
  }

  /* 반복 규칙을 사람이 읽는 말로 */
  function repeatLabel(rule){
    if(!rule) return '';
    if(rule === 'daily') return '매일';
    let m = rule.match(/^weekly:(\d)$/);
    if(m) return '매주 ' + DOW[+m[1]] + '요일';
    m = rule.match(/^monthly:(\d{1,2})$/);
    if(m) return '매달 ' + m[1] + '일';
    m = rule.match(/^yearly:(\d{2})-(\d{2})$/);
    if(m) return '매년 ' + (+m[1]) + '월 ' + (+m[2]) + '일';
    return rule;
  }

  /* 반복 업무를 끝냈을 때 다음 차례가 언제인지 */
  function nextDue(rule, from){
    if(!rule) return null;
    const base = from ? new Date(from + 'T00:00:00') : midnight();
    if(rule === 'daily') return ymd(plus(base,1));

    let m = rule.match(/^weekly:(\d)$/);
    if(m){
      const want = +m[1];
      let d = plus(base,1);
      while(d.getDay() !== want) d = plus(d,1);
      return ymd(d);
    }
    m = rule.match(/^monthly:(\d{1,2})$/);
    if(m) return ymd(new Date(base.getFullYear(), base.getMonth()+1, +m[1]));

    m = rule.match(/^yearly:(\d{2})-(\d{2})$/);
    if(m) return ymd(new Date(base.getFullYear()+1, +m[1]-1, +m[2]));
    return null;
  }

  /* 남은 날을 사람 말로 — 목록에 붙이는 꼬리표 */
  function untilLabel(due){
    if(!due) return { text:'날짜 없음', tone:'none' };
    const d = new Date(due + 'T00:00:00');
    const days = Math.round((d - midnight()) / 86400000);
    if(days < -1) return { text:(-days) + '일 지남', tone:'late' };
    if(days === -1) return { text:'어제까지', tone:'late' };
    if(days === 0) return { text:'오늘', tone:'today' };
    if(days === 1) return { text:'내일', tone:'soon' };
    if(days <= 7) return { text:days + '일 뒤', tone:'soon' };
    return { text:(d.getMonth()+1) + '월 ' + d.getDate() + '일', tone:'far' };
  }

  return { parseWhen, repeatLabel, nextDue, untilLabel, ymd, midnight };
})();
