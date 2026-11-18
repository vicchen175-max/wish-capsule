(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const store = window.WishStore;
  const ideas = [
    '下个晴天，一起买两杯喜欢的饮料，去看一场日落。',
    '各挑一首舍不得跳过的歌，在散步的时候放给对方听。',
    '一起做一道两个人都没做过的菜，给它取个只有我们懂的名字。',
    '把手机收起来，轮流讲一件最近让自己开心的小事。',
    '一起走一条没走过的路，拍下今天最喜欢的一个角落。',
    '找张我们最早的合照，在同一个姿势下再拍一张。'
  ];
  let state = {revision:-1, notes:[], pending:null};
  let machine, busy = '', selectedId = '', suggestion = '', ideaIndex = Math.floor(Math.random()*ideas.length);
  let updates;
  try { if (window.BroadcastChannel) updates = new BroadcastChannel('wish-post-for-two'); } catch {}
  const poolSize = () => state.notes.filter(note => !note.opened && note.id !== state.pending).length;
  const formatDate = time => new Intl.DateTimeFormat('zh-CN', {year:'numeric',month:'long',day:'numeric'}).format(time);
  const count = n => String(n).padStart(2,'0');
  function announce(text) { $('status').textContent = text; }
  function paint() {
    const waiting = poolSize();
    $('waiting').textContent = count(waiting);
    $('opened').textContent = count(state.notes.filter(note => note.opened).length);
    $('drawBtn').disabled = !machine || Boolean(busy) || (!state.pending && !waiting);
    $('writeBtn').disabled = !machine || Boolean(busy);
    $('drawText').textContent = busy === 'draw' ? '扭蛋中…' : state.pending ? '拆开心愿' : '抽一颗';
    $('drawBtn').className = 'button ' + (state.pending || waiting ? 'main-button' : 'secondary');
    $('writeBtn').className = 'button ' + (state.pending || waiting ? 'secondary' : 'main-button');
  }
  function adopt(next) {
    if (next.revision >= state.revision) state = next;
    paint();
  }
  function syncMachine() { machine?.setCount(poolSize()); }
  async function refresh() {
    try {
      adopt(await store.read());
      if (busy !== 'draw') syncMachine();
      if ($('journal').open) journal();
    } catch { announce('暂时读不到心愿，请刷新后再试。'); }
  }
  function notify() { updates?.postMessage('changed'); }
  function show(id) { if (!$(id).open) $(id).showModal(); }
  function compose() {
    if (busy) return;
    show('composer');
    $('wishBody').focus();
  }
  function updateInput() {
    const value = $('wishBody').value;
    $('length').textContent = value.length + ' / 200';
    $('deposit').disabled = !value.trim() || busy === 'save';
    $('inspire').disabled = Boolean(value.trim() && value !== suggestion);
  }
  $('inspire').onclick = () => {
    suggestion = ideas[ideaIndex++ % ideas.length];
    $('wishBody').value = suggestion;
    updateInput(); $('wishBody').focus();
  };
  $('wishBody').oninput = updateInput;
  $('wishForm').onsubmit = async event => {
    event.preventDefault();
    const text = $('wishBody').value.trim(), author = $('sender').value.trim();
    if (busy || !text) return;
    busy = 'save'; updateInput(); paint();
    try {
      adopt(await store.add(text, author)); notify();
      $('composer').close(); $('wishForm').reset(); suggestion = '';
      machine.deposit(poolSize());
      announce('心愿已投进机器。可以换对方来写了。');
    } catch { announce('这张纸条没能存好，请再试一次。'); $('saveError').hidden = false; }
    finally { busy = ''; updateInput(); paint(); }
  };
  function sealed(id) {
    selectedId = id;
    $('sealed').hidden = false; $('unfolded').hidden = true;
    $('letterBody').textContent = ''; $('letterFrom').textContent = '';
    $('letter').setAttribute('aria-labelledby','letterTitle');
    show('letter'); $('reveal').focus();
  }
  async function draw() {
    if (busy || !machine || document.querySelector('dialog[open]')) return;
    if (state.pending) { sealed(state.pending); return; }
    if (!poolSize()) { compose(); return; }
    busy = 'draw'; paint(); announce('旋钮转动了，看看会掉出哪一颗。');
    try {
      adopt(await store.select()); notify();
      const id = state.pending;
      if (!id) { announce('机器里暂时没有待抽的心愿。'); return; }
      await machine.dispense();
      adopt(await store.read());
      if (state.pending === id) {
        announce('抽到了一封心愿，拆开看看。');
        sealed(id);
      } else { announce('这封心愿已收进记录。'); }
    } catch { announce('请再试一次，已抽出的纸条可以继续拆开。'); }
    finally { busy = ''; syncMachine(); paint(); }
  }
  $('reveal').onclick = async () => {
    if (busy || !selectedId) return;
    busy = 'open'; $('reveal').disabled = true;
    try {
      adopt(await store.open(selectedId)); notify(); syncMachine();
      const note = state.notes.find(note => note.id === selectedId && note.opened);
      if (!note) { $('letter').close(); return; }
      $('sealed').hidden = true; $('unfolded').hidden = false;
      $('letter').setAttribute('aria-labelledby','readTitle');
      $('letterDate').textContent = formatDate(note.opened);
      $('letterBody').textContent = note.text;
      $('letterFrom').textContent = '—— ' + (note.author || '匿名');
      $('unfolded').querySelector('button').focus(); announce('这张纸条已收进心愿记录。');
    } catch { announce('暂时没有拆开，请再试一次。'); }
    finally { busy = ''; $('reveal').disabled = false; paint(); }
  };
  function journal() {
    const list = $('entries');
    const notes = state.notes.filter(n => n.opened).sort((a,b) => b.opened-a.opened);
    list.replaceChildren(); $('noEntries').hidden = notes.length > 0;
    for (const note of notes) {
      const entry = document.createElement('article'); entry.className = 'entry';
      const head = document.createElement('div'); head.className = 'entry-head';
      const date = document.createElement('span'); date.textContent = formatDate(note.opened) + ' · ' + (note.author || '匿名');
      const done = document.createElement('button'); done.className = 'done';
      done.textContent = note.done ? '已一起完成 ✓' : '标记为已完成'; done.setAttribute('aria-pressed',String(note.done));
      done.onclick = async () => {
        done.disabled = true;
        try { adopt(await store.finish(note.id, !note.done)); notify(); journal(); }
        catch { done.disabled = false; done.textContent = '再试一次'; }
      };
      const body = document.createElement('p'); body.className = 'entry-body'; body.textContent = note.text;
      head.append(date,done); entry.append(head,body); list.append(entry);
    }
  }
  $('writeBtn').onclick = () => { $('saveError').hidden = true; compose(); };
  $('drawBtn').onclick = draw;
  $('historyBtn').onclick = async () => {
    if (busy) return;
    await refresh(); if (!busy && !document.querySelector('dialog[open]')) { journal(); show('journal'); }
  };
  for (const btn of document.querySelectorAll('[data-close]')) btn.onclick = () => btn.closest('dialog').close();
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  }
  if (updates) updates.onmessage = refresh;
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  async function init() {
    paint(); updateInput();
    const fonts = document.fonts;
    if (fonts) await Promise.allSettled([fonts.load('550 18px "Atelier Serif"','心愿信局'), fonts.load('500 14px "Atelier Sans"','心愿')]);
    machine = window.WishStage.create($('machineView'),{onOperate:draw});
    if (!machine.is3D) $('machineHint').textContent = '点击旋钮抽取';
    await refresh();
    if (!await store.persistent) $('saveInfo').textContent = '此浏览器仅暂存本次心愿';
    if (state.pending) announce('上次抽到的心愿还在，点「拆开心愿」继续。');
    paint();
  }
  init();
})();
