(() => {
  'use strict';
  const designs = [
    {id:'sunset', name:'江边日落', edition:'Riverside at dusk', colors:['#ffd18e','#dba2ae','#a9dbe3'], angle:110},
    {id:'tide', name:'月下潮汐', edition:'Moonlit tide', colors:['#cfecff','#889ee9','#8ce1d8'], angle:72},
    {id:'lantern', name:'灯火长街', edition:'Lantern promenade', colors:['#ffc381','#f59287','#f4d592'], angle:106},
    {id:'aurora', name:'极光雪原', edition:'Northern lights', colors:['#89f5ce','#a7c4ff','#d49bf1'], angle:126},
    {id:'sakura', name:'樱雨车站', edition:'Cherry blossom station', colors:['#ffbed4','#e6d3eb','#a8ddc9'], angle:64},
    {id:'cosmos', name:'星海航行', edition:'Celestial voyage', colors:['#b5a4ff','#80c9ff','#e1bcdf'], angle:125},
    {id:'garden', name:'萤火花园', edition:'Firefly garden', colors:['#ebec94','#96dfae','#d7bd82'], angle:92},
    {id:'whale', name:'云上鲸歌', edition:'Whale above the clouds', colors:['#89dced','#a0b6ff','#eac5ee'], angle:55}
  ];
  const byId = new Map(designs.map(design => [design.id,design]));
  const $ = id => document.getElementById(id);
  const dialog = $('letter'), tilt = $('cardTilt'), canvas = $('prismBurst');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const asset = name => window.WishEmbeddedAssets?.['cards/'+name] || 'cards/'+name;
  const photo = design => asset(design.id+'.webp');
  const mask = design => asset(design.id+'-mask.png');
  const loaded = new Map();
  function prime(id) {
    const design = byId.get(id);
    if (!design) return Promise.resolve();
    if (!loaded.has(id)) {
      const ready = Promise.all([photo(design),mask(design),asset('back.webp'),asset('frame.webp')].map(src => {
        const image = new Image();image.src=src;return image.decode();
      }));
      loaded.set(id,ready.catch(() => { loaded.delete(id); }));
    }
    return loaded.get(id);
  }
  let frame = 0, active = null;
  function clearPose() {
    tilt.style.setProperty('--tilt-x','0deg');tilt.style.setProperty('--tilt-y','0deg');
    tilt.style.setProperty('--light-x','0%');
  }
  tilt.addEventListener('pointermove',e => {
    if (!dialog.open || motion.matches) return;
    const box=tilt.getBoundingClientRect();
    const x=Math.max(-1,Math.min(1,(e.clientX-box.left)/box.width*2-1));
    const y=Math.max(-1,Math.min(1,(e.clientY-box.top)/box.height*2-1));
    tilt.style.setProperty('--tilt-x',(-6*y)+'deg');tilt.style.setProperty('--tilt-y',(10*x)+'deg');
    tilt.style.setProperty('--light-x',(x*33)+'%');
  });
  tilt.addEventListener('pointerleave',clearPose);tilt.addEventListener('pointercancel',clearPose);
  tilt.addEventListener('pointerup',e => { if(e.pointerType==='touch') clearPose(); });

  function spark(ctx,x,y,r,color) {
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y-r);
    ctx.quadraticCurveTo(x+r*.11,y-r*.11,x+r*.69,y);ctx.quadraticCurveTo(x+r*.11,y+r*.11,x,y+r);
    ctx.quadraticCurveTo(x-r*.11,y+r*.11,x-r*.69,y);ctx.quadraticCurveTo(x-r*.11,y-r*.11,x,y-r);ctx.fill();
  }
  function burst(design) {
    cancelAnimationFrame(frame);
    const c=canvas.getContext('2d');if (!c || motion.matches) return;
    const box=canvas.getBoundingClientRect(),w=box.width,h=box.height,scale=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);c.setTransform(scale,0,0,scale,0,0);
    const rect=tilt.getBoundingClientRect(),cx=rect.left-box.left+rect.width/2,cy=rect.top-box.top+rect.height/2;
    const particles=Array.from({length:76},(_,i)=>({a:Math.random()*Math.PI*2, speed:.64+Math.random()*.84,
      delay:Math.random()*.17, spin:Math.random()*8+3, size:1.1+Math.random()**2*7, color:design.colors[i%3]}));
    const start=performance.now();
    function draw(now) {
      const time=(now-start)/1000;
      c.clearRect(0,0,w,h);
      if(!dialog.open || time>2.25 || motion.matches) return;
      const age=time-.36,energy=Math.max(0,1-Math.abs(time-.65)/.35);
      if(energy){
        const r=rect.width*1.30,l=c.createRadialGradient(cx,cy,0,cx,cy,r);
        l.addColorStop(0,design.colors[0]+'76');l.addColorStop(.46,design.colors[1]+'35');l.addColorStop(1,'transparent');
        c.globalAlpha=energy;c.fillStyle=l;c.fillRect(cx-r,cy-r,2*r,2*r);
      }
      c.globalCompositeOperation='screen';
      if (age>0 && age<.8) {
        const progress=age/.8, radius=rect.width*(.32+.60*progress);
        c.save();c.translate(cx,cy);c.rotate(-.29);
        for(let ring=0;ring<3;ring++){
          const phase=progress*4+ring*2.1;
          c.globalAlpha=Math.sin(Math.PI*progress)**1.4*(.76-ring*.13);
          c.strokeStyle=design.colors[ring];c.lineWidth=2.2-ring*.5;
          c.beginPath();c.ellipse(0,0,radius*(1+ring*.06),radius*(.29+ring*.045),0,phase,phase+Math.PI*1.45);c.stroke();
        }
        c.restore();
      }
      for(const [i,p] of particles.entries()){
        const dt=age-p.delay;if(dt<=0)continue;
        const life=Math.max(0,1-dt/1.57);if(!life)continue;
        const r=rect.width*(.21+(1-Math.exp(-dt*3.6))*p.speed),dx=Math.cos(p.a)*r,dy=Math.sin(p.a)*r*1.10;
        const x=cx+dx,y=cy+dy+dt*dt*40;
        c.globalAlpha=life*.90;
        if(i%5===0){spark(c,x,y,(3+p.size)*life,p.color);continue;}
        if(i%3===0){c.strokeStyle=p.color;c.lineWidth=1.25*life;c.beginPath();c.moveTo(x-dx*.13*life,y-dy*.13*life);c.lineTo(x,y);c.stroke();}
        c.save();c.translate(x,y);c.rotate(p.a+dt*p.spin);
        const s=p.size*(.35+.65*Math.abs(Math.cos(dt*p.spin)))*life;c.fillStyle=p.color;
        c.beginPath();c.moveTo(-s*1.58,0);c.lineTo(s*.45,-s*.37);c.lineTo(s*.96,0);c.lineTo(s*.15,s*.76);c.closePath();c.fill();
        c.strokeStyle='#fff2d7';c.lineWidth=.65;c.beginPath();c.moveTo(-s*1.58,0);c.lineTo(s*.45,-s*.37);c.stroke();c.restore();
      }
      c.globalAlpha=1;c.globalCompositeOperation='source-over';
      frame=requestAnimationFrame(draw);
    }
    frame=requestAnimationFrame(draw);
  }
  function show(note, fromRecord=false) {
    const design=byId.get(note.designId);if(!design)return;
    active=note.id;clearPose();
    dialog.dataset.design=design.id;
    for(const [i,col] of design.colors.entries())dialog.style.setProperty('--foil-'+i,col);
    dialog.style.setProperty('--beam-angle',design.angle+'deg');
    for(const [key,file] of [['--foil-mask',mask(design)],['--frame-art',asset('frame.webp')],['--back-art',asset('back.webp')]]) {
      dialog.style.setProperty(key,'url("'+file+'")');
    }
    $('cardArt').src=photo(design);$('cardName').textContent=design.name;$('cardFolio').textContent=design.edition;
    $('letterBody').textContent=note.text;$('letterFrom').textContent='—— '+(note.author||'匿名');
    $('keepCard').textContent=fromRecord?'返回心愿记录':'收好彩卡';
    dialog.classList.toggle('from-draw',!fromRecord);
    if(!dialog.open)dialog.showModal();
    if($('letterBody').scrollHeight>$('letterBody').clientHeight+1)$('letterBody').tabIndex=0;
    else $('letterBody').removeAttribute('tabindex');
    $('letterBody').scrollTop=0;
    $('keepCard').focus({preventScroll:true});
    if(!fromRecord)burst(design);
  }
  dialog.addEventListener('close',()=>{
    active=null;cancelAnimationFrame(frame);canvas.width=1;canvas.height=1;dialog.classList.remove('from-draw');clearPose();
  });
  function thumbnail(note) {
    const design=byId.get(note.designId);
    const button=document.createElement('button');button.type='button';button.className='record-card';
    button.setAttribute('aria-label','查看彩卡：'+design.name);
    const img=document.createElement('img');img.alt='';img.loading='lazy';img.src=photo(design);
    const title=document.createElement('span');title.textContent=design.name;
    button.append(img,title);
    button.onclick=()=>{if(!active){prime(note.designId);show(note,true);}};
    return button;
  }
  window.WishCards={designs,prime,show,thumbnail};
})();
