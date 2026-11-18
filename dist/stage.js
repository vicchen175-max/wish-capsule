/* A glass-and-lacquer tabletop dispenser. No wish text is passed into this scene. */
(() => {
  'use strict';
  const T=globalThis.THREE;
  const tau=2*Math.PI;
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const smooth=v=>v*v*(3-2*v);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rollTime=reduced?170:1850;
  const slots=[11,7,6,1,2,0,9,10,8,3,5,4];
  const countOf=n=>Math.max(0,Math.trunc(Number(n)||0));

  function studio(renderer){
    const w=128,h=64,data=new Float32Array(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const u=x/w,v=y/h;
      const panel=(cx,cy,rx,ry)=>Math.exp(-(((u-cx)/rx)**4)-(((v-cy)/ry)**6));
      const left=panel(.29,.63,.055,.24)*2.7,side=panel(.80,.56,.024,.23)*2.5;
      const ceiling=panel(.59,.87,.14,.09)*.9, dark=.028+.14*v;
      const k=4*(y*w+x);
      data[k]=dark+left+side*.83+ceiling;
      data[k+1]=dark*.90+left*.86+side*.85+ceiling*.86;
      data[k+2]=dark*.90+left*.78+side+ceiling*.73;
      data[k+3]=1;
    }
    const source=new T.DataTexture(data,w,h,T.RGBAFormat,T.FloatType);
    source.mapping=T.EquirectangularReflectionMapping;source.needsUpdate=true;
    const gen=new T.PMREMGenerator(renderer),map=gen.fromEquirectangular(source);
    gen.dispose();source.dispose();return map.texture;
  }

  function makeScene(renderer){
    const scene=new T.Scene();scene.environment=studio(renderer);
    scene.add(new T.HemisphereLight(0xffeee7,0x534454,.68));
    const key=new T.DirectionalLight(0xffe9d4,2.1);
    key.position.set(-3.7,6.8,4.9);key.target.position.y=1.7;
    key.castShadow=true;key.shadow.mapSize.set(1024,1024);
    key.shadow.bias=-.0004;key.shadow.normalBias=.012;
    Object.assign(key.shadow.camera,{left:-3.5,right:3.5,top:4,bottom:-3,near:.2,far:18});
    scene.add(key,key.target);
    const rim=new T.DirectionalLight(0xffd1bd,2.2);
    rim.position.set(-2.8,5.5,-3.5);scene.add(rim);
    const fill=new T.DirectionalLight(0xd7dfef,.88);
    fill.position.set(4.4,3.8,3);scene.add(fill);
    const plinthLayers=[
      [1.68,-.125,.145,0x271f28,.19,.63],
      [1.668,-.073,.015,0x995f56,.65,.40],
      [1.653,-.041,.053,0x37282f,.13,.72]
    ];
    for(const [r,y,h,color,metalness,roughness] of plinthLayers){
      const mesh=new T.Mesh(new T.CylinderGeometry(r,r*.985,h,96),
        new T.MeshStandardMaterial({color,metalness,roughness,envMapIntensity:.28}));
      mesh.position.y=y;mesh.receiveShadow=true;scene.add(mesh);
    }
    return scene;
  }

  function create3D(host,{onOperate}){
    const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
    const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');
    canvas.style.cssText='display:block;width:100%;height:100%;touch-action:pan-y';
    host.append(canvas);
    renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
    const scene=makeScene(renderer),unit=globalThis.WishMachine.make();
    scene.add(unit.group);
    const original=unit.balls.map(ball=>({p:ball.position.clone(),r:ball.rotation.clone()}));
    const camera=new T.OrthographicCamera(-3,3,3,-3,.1,50);
    const homeYaw=.27,homePitch=.14;
    let yaw=homeYaw,pitch=homePitch,frame=0,count=0,drag=null;
    let addition=null,draw=null;

    function pose(){
      camera.position.set(12*Math.sin(yaw)*Math.cos(pitch),2.45+12*Math.sin(pitch),12*Math.cos(yaw)*Math.cos(pitch));
      camera.lookAt(0,2.45,0);camera.updateMatrixWorld();
    }
    function render(){
      frame=0;
      if(document.hidden)return;
      const time=performance.now();
      if(draw)animateDispense(clamp((time-draw.start)/rollTime));
      else if(addition)animateDeposit(clamp((time-addition.start)/(reduced?140:640)));
      renderer.render(scene,camera);
      if(addition||draw)wake();
    }
    function wake(){if(!frame&&!document.hidden)frame=requestAnimationFrame(render);}
    function size(){
      const {width,height}=host.getBoundingClientRect();
      if(!width||!height)return;
      const aspect=width/height,half=Math.max(2.96,1.78/aspect);
      camera.left=-aspect*half;camera.right=aspect*half;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));renderer.setSize(width,height,false);wake();
    }
    function setCount(n){
      count=countOf(n);
      slots.forEach((idx,order)=>{unit.letters[idx].visible=order<count;});
      wake();
    }
    function settle(){
      unit.balls.forEach((ball,i)=>{
        ball.visible=true;ball.rotation.copy(original[i].r);ball.position.copy(original[i].p);
      });
      unit.gate.rotation.x=unit.knob.rotation.z=unit.group.rotation.z=0;
    }
    function deposit(n){
      setCount(n);
      if(draw||!count)return;
      settle();
      const index=slots[Math.min(count,slots.length)-1];
      addition={start:performance.now(),index};
      wake();
    }
    function animateDeposit(p){
      const {index}=addition,ball=unit.balls[index],origin=original[index];
      const fall=1-smooth(p);
      ball.position.y=origin.p.y+fall*Math.min(.84,4.15-origin.p.y)+Math.sin(p*Math.PI*3)**2*fall*.16;
      ball.rotation.z=origin.r.z+fall*.7;
      if(p===1)addition=null;
    }
    function animateDispense(p){
      const index=draw.index;
      const spin=smooth(clamp(p/.60)),jostle=reduced?0:Math.sin(Math.PI*clamp(p/.60));
      unit.knob.rotation.z=-tau*spin;
      unit.group.rotation.z=jostle*.014*Math.sin(spin*25);
      unit.balls.forEach((ball,i)=>{
        const {p:pos,r}=original[i],w=i*.93+spin*22;
        ball.position.set(pos.x+.066*Math.sin(w)*jostle,pos.y+.15*Math.abs(Math.sin(w*1.4))*jostle,pos.z+.057*Math.cos(w)*jostle);
        ball.rotation.set(r.x+.23*Math.sin(w)*jostle,r.y+.4*Math.cos(w)*jostle,r.z+.36*Math.cos(w*.7)*jostle);
      });
      const ball=unit.balls[index],origin=original[index].p;
      if(p>.29&&p<.66){
        const t=smooth(clamp((p-.29)/.32));
        ball.position.set(origin.x*(1-t),origin.y+(1.96-origin.y)*t,origin.z*(1-t));ball.visible=p<.60;
      }else if(p>=.66){
        const t=clamp((p-.66)/.34),roll=smooth(t);
        ball.visible=true;ball.position.copy(unit.dropPoint);
        ball.position.z+=.55*roll;
        ball.position.y+=.11-.48*roll+Math.abs(Math.sin(t*2.2*Math.PI))*(1-t)*.18;
        ball.rotation.z=-.20+1.15*roll;
      }
      unit.gate.rotation.x=-1.34*(smooth(clamp((p-.49)/.19))-smooth(clamp((p-.84)/.16)));
    }
    function finish(){
      if(!draw)return;
      animateDispense(1);
      // Show the resting ball through the last camera frame before the letter opens.
      if(!document.hidden)renderer.render(scene,camera);
      const done=draw;draw=null;clearTimeout(done.timer);done.resolve();
    }
    function dispense(){
      if(draw)return draw.promise;
      if(!count)return Promise.resolve();
      addition=null;settle();
      const index=slots[Math.floor(Math.random()*Math.min(slots.length,count))];
      let resolve;const promise=new Promise(r=>{resolve=r;});
      draw={index,start:performance.now(),resolve,promise,timer:setTimeout(finish,rollTime)};
      wake();return promise;
    }
    function restoreCount(n){
      if(!draw&&!addition)settle();
      setCount(n);
    }
    function reset(){yaw=homeYaw;pitch=homePitch;pose();wake();}
    const ray=new T.Raycaster();
    function hitKnob(e){
      const rect=canvas.getBoundingClientRect();
      ray.setFromCamera({x:2*(e.clientX-rect.left)/rect.width-1,y:1-2*(e.clientY-rect.top)/rect.height},camera);
      return ray.intersectObject(unit.knob,true).length>0;
    }
    canvas.addEventListener('pointerdown',e=>{
      if(e.button!==0||drag)return;
      drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw,pitch,knob:hitKnob(e),moved:false};
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove',e=>{
      if(!drag||drag.id!==e.pointerId)return;
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      if(Math.abs(dx)+Math.abs(dy)>7)drag.moved=true;
      if(drag.moved){yaw=drag.yaw-dx*.009;pitch=clamp(drag.pitch+dy*.003,-.06,.38);pose();wake();}
    });
    function release(e,cancelled){
      if(!drag||drag.id!==e.pointerId)return;
      const operate=drag.knob&&!drag.moved&&!cancelled&&!draw;drag=null;
      if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
      if(operate)onOperate?.();
    }
    canvas.addEventListener('pointerup',e=>release(e,false));
    canvas.addEventListener('pointercancel',e=>release(e,true));
    new ResizeObserver(size).observe(host);
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)finish();
      else wake();
    });
    window.addEventListener('pagehide',finish);window.addEventListener('pageshow',wake);
    pose();size();return {is3D:true,setCount:restoreCount,deposit,dispense,reset};
  }

  function fallback(host,{onOperate}){
    host.replaceChildren();
    const flat=document.createElement('div');flat.className='flat-machine';
    flat.innerHTML='<div class="flat-crown"></div><div class="flat-globe" aria-hidden="true"></div><div class="flat-body"><span class="flat-plate">心愿信局</span><button type="button" class="flat-knob" aria-label="转动旋钮抽一颗"></button><span class="flat-outlet"></span></div><div class="flat-foot"></div>';
    const globe=flat.querySelector('.flat-globe');
    for(let i=0;i<8;i++){
      const ball=document.createElement('i');ball.className='flat-ball';globe.append(ball);
    }
    host.append(flat);
    const knob=flat.querySelector('button');knob.addEventListener('click',()=>onOperate?.());
    let count=0,draw=null,addTimer;
    function setCount(n){
      count=countOf(n);Array.from(globe.children).forEach((ball,i)=>ball.classList.toggle('filled',i<count));
    }
    function deposit(n){
      setCount(n);clearTimeout(addTimer);
      flat.classList.remove('depositing');void flat.offsetWidth;flat.classList.add('depositing');
      addTimer=setTimeout(()=>flat.classList.remove('depositing'),500);
    }
    function finish(){
      if(!draw)return;
      const done=draw;draw=null;clearTimeout(done.timer);
      flat.classList.remove('dispensing');done.resolve();
    }
    function dispense(){
      if(draw)return draw.promise;
      if(!count)return Promise.resolve();
      flat.classList.add('dispensing');
      let resolve;const promise=new Promise(r=>{resolve=r;});
      draw={resolve,promise,timer:setTimeout(finish,reduced?145:1100)};
      return promise;
    }
    document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();});
    window.addEventListener('pagehide',finish);
    return {is3D:false,setCount,deposit,dispense,reset(){}};
  }
  globalThis.WishStage={create(host,options={}){
    if(T)try{return create3D(host,options);}catch(error){console.warn('WebGL display unavailable:',error.message);}
    return fallback(host,options);
  }};
})();
