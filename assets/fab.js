/* ══════════════════════════════════════════════════════════
   떠 있는 동그란 단추.

   누르면 위로 작은 판이 열립니다.
     · 업무추가
     · 일간·주간·월간 알림 켜고 끄기 (내용은 notify.js가 채웁니다)

   다시 누르거나 바깥을 누르면 닫힙니다. Esc로도 닫힙니다.
   ══════════════════════════════════════════════════════════ */
(function(){
  const btn = document.getElementById('fabBtn');
  const pop = document.getElementById('fabPop');
  if(!btn || !pop) return;

  function setOpen(open){
    pop.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? '닫기' : '업무 담기와 알림 설정 열기');
    btn.classList.toggle('on', open);
  }

  btn.addEventListener('click', () => setOpen(pop.hidden));

  /* 바깥을 누르면 닫습니다.
     전파를 막지 않고 눌린 자리로 판단합니다. 막아버리면 판 안의
     '업무 담기' 같은 단추가 바깥의 처리까지 닿지 못합니다. */
  document.addEventListener('click', e => {
    if(pop.hidden) return;
    if(btn.contains(e.target)) return;              // 단추는 위에서 처리
    if(pop.contains(e.target)){
      // 판 안에서 무언가를 실행했으면 판은 닫아줍니다
      if(e.target.closest('[data-newtask]')) setOpen(false);
      return;
    }
    setOpen(false);
  });

  addEventListener('keydown', e => { if(e.key === 'Escape' && !pop.hidden) setOpen(false); });

  setOpen(false);
})();
