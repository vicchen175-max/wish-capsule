(() => {
  'use strict';
  const canvas = document.getElementById('nightSky');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let seed = 171;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const dust = Array.from({length:86}, () => [random(),random(),random(),random()]);
  const plate = document.createElement('canvas');
  let width = 0, height = 0, frame = 0, last = -1000;
  function paintBackdrop() {
    plate.width=width;plate.height=height;
    const g=plate.getContext('2d');
    const sky=g.createLinearGradient(0,0,width,height);
    sky.addColorStop(0,'#151322');sky.addColorStop(.48,'#261d2c');sky.addColorStop(1,'#080e1a');
    g.fillStyle=sky;g.fillRect(0,0,width,height);
    // The three pools of light use the film's 1080 x 1920 stage coordinates.
    g.scale(width/1080,height/1920);g.globalCompositeOperation='screen';
    for (const [x,y,rx,ry,color,opacity] of [[736,900,815,950,'#654351',.59],[190,1010,603,780,'#285466',.32],[535,1370,610,160,'#bb7666',.14]]) {
      g.save();g.translate(x,y);g.scale(rx,ry);g.globalAlpha=opacity;
      const mist=g.createRadialGradient(0,0,0,0,0,1);
      for(const [stop,alpha] of [[0,'dc'],[.12,'a2'],[.31,'56'],[.63,'17'],[1,'00']])mist.addColorStop(stop,color+alpha);
      g.fillStyle=mist;g.fillRect(-1,-1,2,2);g.restore();
    }
  }
  function draw(time) {
    frame = 0;
    if (document.hidden) return;
    if (time - last >= 46 || motion.matches) {
      if (!width || !height) return;
      ctx.drawImage(plate,0,0,width,height);
      const t = motion.matches ? 0 : time / 1000;
      for (const [u,v,depth,phase] of dust) {
        const x = u*width + 12*Math.sin(t*.20+depth*8);
        const y = ((v*height-t*(2+5*depth))%height+height)%height;
        const a = (.17+.49*depth)*(.78+.22*Math.sin(t*.6+phase*8));
        ctx.fillStyle = 'rgba(255,215,175,'+a+')';
        ctx.beginPath();ctx.arc(x,y,.38+depth*depth*.87,0,2*Math.PI);ctx.fill();
        if (depth>.97) {
          ctx.fillStyle = 'rgba(232,163,125,.07)';
          ctx.beginPath();ctx.arc(x,y,3.2,0,2*Math.PI);ctx.fill();
        }
      }
      last=time;
    }
    if (!motion.matches) frame=requestAnimationFrame(draw);
  }
  function resize() {
    cancelAnimationFrame(frame);
    width=canvas.clientWidth;height=canvas.clientHeight;
    paintBackdrop();
    const scale=Math.min(devicePixelRatio||1,1.5);
    canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    ctx.setTransform(scale,0,0,scale,0,0);last=-1000;draw(performance.now());
  }
  new ResizeObserver(resize).observe(canvas);
  motion.addEventListener('change',resize);
  document.addEventListener('visibilitychange',resize);
})();
