/* ══════════════════════════════════════════════════════════
   한국 공휴일.

   양력으로 고정된 날은 규칙으로 만들고, 음력을 따르는 세 가지
   (설날·부처님오신날·추석)는 해마다 날짜가 달라 표로 적어 둡니다.
   음력을 코드로 환산하려면 표가 훨씬 커지는데, 이 사이트에 그만한
   무게를 들일 이유가 없습니다.

   ★ LUNAR 표는 손으로 적은 값입니다. 해가 바뀌기 전에
     한국천문연구원(astro.kasi.re.kr) 또는 공공데이터포털의
     '특일 정보'와 대조해 주십시오. 표에 없는 해는 음력 공휴일이
     그냥 표시되지 않을 뿐, 달력은 정상으로 돕니다.

   대체공휴일 규칙 (관공서의 공휴일에 관한 규정 제3조)
     · 설날·추석 연휴 — 일요일과 겹치거나 다른 공휴일과 겹칠 때
     · 어린이날, 삼일절, 광복절, 개천절, 한글날,
       부처님오신날, 성탄절 — 토요일·일요일과 겹칠 때
     · 신정과 현충일은 대체공휴일이 없습니다
   ══════════════════════════════════════════════════════════ */
const HOLIDAY = (function(){

  /* [월-일, 이름, 대체공휴일 기준]
     'weekend' = 토·일에 걸리면 밀린다,  false = 밀지 않는다 */
  const FIXED = [
    ['01-01', '신정',    false],
    ['03-01', '삼일절',  'weekend'],
    ['05-05', '어린이날', 'weekend'],
    ['06-06', '현충일',  false],
    ['08-15', '광복절',  'weekend'],
    ['10-03', '개천절',  'weekend'],
    ['10-09', '한글날',  'weekend'],
    ['12-25', '성탄절',  'weekend']
  ];

  /* 음력을 따르는 날의 양력 날짜.
     seol·chuseok 은 '당일'이며 앞뒤 하루씩 더해 사흘 연휴로 칩니다. */
  const LUNAR = {
    2025: { seol:'2025-01-29', buddha:'2025-05-05', chuseok:'2025-10-06' },
    2026: { seol:'2026-02-17', buddha:'2026-05-24', chuseok:'2026-09-25' },
    2027: { seol:'2027-02-07', buddha:'2027-05-13', chuseok:'2027-09-15' },
    2028: { seol:'2028-01-27', buddha:'2028-05-02', chuseok:'2028-10-03' }
  };

  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
  const parse = s => new Date(s + 'T00:00:00');
  const plus = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  const cache = {};

  function build(year){
    /* 먼저 후보를 늘어놓습니다. 같은 날에 둘이 겹칠 수 있어서
       바로 넣지 않고 순서대로 훑으며 정리합니다. */
    const list = [];
    FIXED.forEach(f => list.push({ key: year + '-' + f[0], name: f[1], sub: f[2] }));

    const L = LUNAR[year];
    if(L){
      const seol = parse(L.seol);
      [-1, 0, 1].forEach(n => list.push({ key: ymd(plus(seol, n)), name:'설날', sub:'sun' }));
      list.push({ key: L.buddha, name:'부처님오신날', sub:'weekend' });
      const chu = parse(L.chuseok);
      [-1, 0, 1].forEach(n => list.push({ key: ymd(plus(chu, n)), name:'추석', sub:'sun' }));
    }

    list.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

    const map = {};
    const need = [];                       // 대체공휴일을 하루씩 만들어 줘야 하는 수만큼

    list.forEach(e => {
      const wd = parse(e.key).getDay();
      const taken = !!map[e.key];          // 다른 공휴일과 겹쳤다
      if(!taken) map[e.key] = e.name;

      const hitsWeekend = e.sub === 'weekend' ? (wd === 0 || wd === 6)
                        : e.sub === 'sun'     ? (wd === 0)
                        : false;
      if(e.sub && (hitsWeekend || taken)) need.push(e.key);
    });

    /* 밀린 만큼 뒤쪽에서 가장 가까운 평일을 찾아 채웁니다 */
    need.forEach(k => {
      let d = plus(parse(k), 1);
      while(d.getDay() === 0 || d.getDay() === 6 || map[ymd(d)]) d = plus(d, 1);
      map[ymd(d)] = '대체공휴일';
    });

    return map;
  }

  /* 'YYYY-MM-DD' 를 주면 공휴일 이름을, 아니면 null 을 돌려줍니다 */
  function on(key){
    const year = Number(key.slice(0, 4));
    if(!cache[year]) cache[year] = build(year);
    return cache[year][key] || null;
  }

  return { on };
})();
