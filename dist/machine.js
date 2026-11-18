/* The cabinet, bell jar and two capsule mouldings are independently modelled solids. */
(() => {
  'use strict';
  const T = globalThis.THREE;
  if(!T)return;
  const tau = Math.PI * 2;
  const halfPi = Math.PI / 2;
  const materials = new Map();
  const geometries = new Map();

  function material(name, color, metalness, roughness, settings = {}) {
    if (!materials.has(name)) {
      const m = new T.MeshPhysicalMaterial({color, metalness, roughness, ...settings});
      m.name = name;
      materials.set(name, m);
    }
    return materials.get(name);
  }
  function glaze(color) {
    return material('Vitreous glaze ' + color, color, .12, .30,
      {clearcoat:.72, clearcoatRoughness:.22,envMapIntensity:.53});
  }
  const lacquer = glaze('#81354d'), vermilion = glaze('#ad5c68');
  const oxblood = glaze('#452732'), ivory = glaze('#f6e9d4');
  const enamel = glaze('#573b49'), dark = material('Bakelite', '#32262b', .25, .34);
  const brass = material('Brushed champagne brass', '#c49a56', .70, .28);
  const paleGold = material('Polished brass highlight', '#efcd86', .65, .23);
  const bronze = material('Patinated brass', '#82603d', .63, .37);
  const lining = material('Outlet interior', '#291f20', .06, .63);
  const palettes = ['#a35672','#df917e','#739493','#be91a6','#d2b497','#ab6d7b',
    '#9a92b9','#87aaa6','#d6ab91','#b96679','#cc9f87','#b8798c'];

  function geo(key, fn) {
    if (!geometries.has(key)) geometries.set(key, fn());
    return geometries.get(key);
  }
  function group(name, parent) {
    const g = new T.Group(); g.name = name;
    if (parent) parent.add(g);
    return g;
  }
  function mesh(parent, g, m, x=0, y=0, z=0, name='') {
    const o = new T.Mesh(g,m);
    o.name = name || m.name;
    o.position.set(x,y,z);
    o.castShadow = !m.transparent; o.receiveShadow = !m.transparent;
    parent.add(o);
    return o;
  }
  function sphere(parent,m,x,y,z,a,b=a,c=a) {
    const o=mesh(parent,geo('ball',()=>new T.SphereGeometry(1,28,18)),m,x,y,z);
    o.scale.set(a,b,c);return o;
  }
  function cyl(parent,m,x,y,z,rTop,rBottom,h,segments=64) {
    return mesh(parent,geo(['c',rTop,rBottom,h,segments].join(),()=>
      new T.CylinderGeometry(rTop,rBottom,h,segments)),m,x,y,z);
  }
  function revolve(parent,m,profile,name) {
    return mesh(parent,new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),80),m,0,0,0,name);
  }
  function hoop(parent,m,r,t,x,y,z,front=false) {
    const segments=r<.36?40:r<.8?56:80;
    const o=mesh(parent,geo(['t',r,t].join(),()=>new T.TorusGeometry(r,t,r<.36?7:10,segments)),m,x,y,z);
    if(!front)o.rotation.x=halfPi;
    return o;
  }
  function roundedPath(p,x,y,w,h,r) {
    const X=x+w,Y=y+h;
    p.moveTo(x+r,y);p.lineTo(X-r,y);p.quadraticCurveTo(X,y,X,y+r);
    p.lineTo(X,Y-r);p.quadraticCurveTo(X,Y,X-r,Y);p.lineTo(x+r,Y);
    p.quadraticCurveTo(x,Y,x,Y-r);p.lineTo(x,y+r);p.quadraticCurveTo(x,y,x+r,y);
    p.closePath();return p;
  }
  function extrusion(s,depth,bevel=0) {
    return new T.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,
      bevelSize:bevel,bevelSegments:3,curveSegments:12,steps:1});
  }
  function plate(parent,m,x,y,z,w,h,d,r=.055,b=.014) {
    const key=['round',w,h,d,r,b].join();
    const g=geo(key,()=>extrusion(roundedPath(new T.Shape(),-w/2,-h/2,w,h,r),d,b));
    return mesh(parent,g,m,x,y,z-d/2);
  }
  function box(parent,m,x,y,z,w,h,d) {
    return mesh(parent,geo(['box',w,h,d].join(),()=>new T.BoxGeometry(w,h,d)),m,x,y,z);
  }
  function pipe(parent,m,points,r=.014) {
    const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    return mesh(parent,new T.TubeGeometry(path,Math.max(10,points.length*5),r,7,false),m);
  }
  function screw(parent,x,y,z,r=.04) {
    const head=cyl(parent,brass,x,y,z,r,r,.016,20);head.rotation.x=halfPi;
    const slot=plate(parent,bronze,x,y,z+.011,r*1.15,r*.18,.003,r*.07,.001);
    slot.rotation.z=(x>.3?.55:-.65)+y*.2;
  }

  function textPlate(parent,name,lines,x,y,z,w,h,style) {
    if(typeof document==='undefined')return;
    const key='Enamel print '+name;
    if(!materials.has(key)) {
      const c=document.createElement('canvas');
      c.width=1024;c.height=Math.max(110,Math.round(1024*h/w));
      const ctx=c.getContext('2d');
      if(!ctx)return;
      ctx.fillStyle=style.background;ctx.fillRect(0,0,c.width,c.height);
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=style.ink;
      for(const [label,position,size,font] of lines) {
        ctx.font=font.replace('SIZE',Math.round(c.height*size)+'px');
        ctx.fillText(label,c.width/2,c.height*position,c.width*.92);
      }
      const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
      texture.anisotropy=4;texture.name=name;
      materials.set(key,new T.MeshStandardMaterial({name:key,map:texture,metalness:.13,roughness:.34}));
    }
    return mesh(parent,new T.PlaneGeometry(w,h),materials.get(key),x,y,z,name);
  }

  // Preserve named moving groups and material boundaries, consolidate fixed detail
  // (screw slots, tick marks, lathe profiles) to keep the cabinet inexpensive to draw.
  function batch(group) {
    const buckets=new Map();
    for(const child of group.children.slice()) {
      if(!child.isMesh || child.material.transparent || Array.isArray(child.material))continue;
      let bucket=buckets.get(child.material);
      if(!bucket){bucket=[];buckets.set(child.material,bucket);}
      bucket.push(child);
    }
    for(const [mat,items] of buckets){
      if(items.length<2)continue;
      const pos=[],norm=[],uv=[],indices=[];
      for(const obj of items) {
        obj.updateMatrix();
        const g=obj.geometry.clone().applyMatrix4(obj.matrix);
        const start=pos.length/3, p=g.getAttribute('position'),n=g.getAttribute('normal'),u=g.getAttribute('uv');
        for(let i=0;i<p.count;i++){
          pos.push(p.getX(i),p.getY(i),p.getZ(i));norm.push(n.getX(i),n.getY(i),n.getZ(i));
          uv.push(u?u.getX(i):0,u?u.getY(i):0);
        }
        if(g.index){ for(let i=0;i<g.index.count;i++)indices.push(start+g.index.getX(i)); }
        else { for(let i=0;i<p.count;i++)indices.push(start+i); }
        g.dispose();group.remove(obj);
      }
      const combined=new T.BufferGeometry();
      combined.setAttribute('position',new T.Float32BufferAttribute(pos,3));
      combined.setAttribute('normal',new T.Float32BufferAttribute(norm,3));
      combined.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
      combined.setIndex(indices);mesh(group,combined,mat);
    }
  }

  function heartOutline(scale, z, samples=36) {
    return Array.from({length:samples+1},(_,i)=>{
      const t=i*tau/samples;
      return [scale*Math.sin(t)**3,scale*(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/16,z];
    });
  }
  function makeLetter(parent,index) {
    const note=group('Sealed wish',parent);
    const colors=['#fcdfc9','#fae9c8','#fae4db','#ebd7da'];
    const paper=material('Folded cotton paper '+index%4,colors[index%4],.02,.83);
    const flap=material('Envelope edge','#b3846e',.02,.81);
    const rose=material('Bordeaux sealing wax','#8c334a',.22,.34,{clearcoat:.56});
    plate(note,paper,0,0,0,.39,.25,.036,.016,.003);
    for(const side of [-1,1]){
      pipe(note,flap,[[.18*side,.112,.024],[.08*side,.025,.025],[0,-.023,.026]],.0038);
      pipe(note,flap,[[.18*side,-.108,.023],[.127*side,-.067,.023],[.074*side,-.028,.023]],.0022);
    }
    const seal=sphere(note,rose,0,-.012,.027,.037,.033,.013);
    seal.rotation.z=.3;
    const impression=pipe(note,paleGold,heartOutline(.017,.041),.0024);
    impression.position.y=-.01;
    note.position.y=.107;note.rotation.set(-.20,.07,.12*(index%3-1));
    batch(note);return note;
  }
  function makeCapsule(color,index) {
    const root=group('Twist capsule');
    const top=group('Clear upper shell',root),bottom=group('Lacquer lower shell',root);
    const radius=.32;
    const upper=geo('capsule top',()=>new T.SphereGeometry(radius,32,18,0,tau,0,halfPi));
    const lower=geo('capsule bottom',()=>new T.SphereGeometry(radius,32,18,0,tau,halfPi,halfPi));
    const tint=new T.Color(color).lerp(new T.Color('#f6e7dd'),.57);
    const shellGlass=material('Tinted acetate '+index,tint,.045,.14,
      {transparent:true,opacity:.38,depthWrite:false,clearcoat:1,side:T.FrontSide});
    const cap=mesh(top,upper,shellGlass);cap.renderOrder=3;cap.castShadow=false;
    const varnish=glaze(color);
    mesh(bottom,lower,varnish);
    hoop(bottom,brass,.318,.008,0,.001,0);
    hoop(top,material('Frosted capsule edge','#d7ebd9',.12,.26),.319,.006,0,.014,0);
    hoop(bottom,varnish,.313,.012,0,-.035,0);
    // Leaf-shaped reflection stamped on the mould. Kept off-centre to leave the face clear.
    const glintMaterial=material('Capsule window glint','#fffbed',.0,.23,
      {transparent:true,opacity:.51,depthWrite:false});
    const glint=pipe(top,glintMaterial,[
      [-.166,.22,.16],[-.19,.19,.172],[-.207,.151,.184]],.007);
    glint.renderOrder=4;
    const edge=pipe(top,glintMaterial,[[.191,.241,.087],[.220,.215,.093],[.243,.182,.101]],.0035);
    edge.renderOrder=4;
    for(let k=0;k<3;k++){
      const a=k*tau/3+.37;
      const pin=box(bottom,brass,Math.sin(a)*.317,-.013,Math.cos(a)*.317,.031,.034,.011);
      pin.rotation.y=a;
    }
    const letter=makeLetter(root,index);letter.visible=false;
    root.userData.capsuleColor=typeof color==='string'?color:'#'+new T.Color(color).getHexString();
    batch(bottom);
    return {group:root,letter};
  }

  const opening={x:.54,y:.435,w:.86,h:.82,r:.21};
  function openingPath(p,margin=0){
    const a=opening;
    return roundedPath(p,a.x-a.w/2-margin,a.y-margin,a.w+margin*2,a.h+margin*2,a.r+margin);
  }
  function outletRing(parent,mat,inner,outer,z,d,b){
    const s=openingPath(new T.Shape(),outer);s.holes.push(openingPath(new T.Path(),inner));
    return mesh(parent,extrusion(s,d,b),mat,0,0,z);
  }
  function createCabinet(fixed) {
    const body=roundedPath(new T.Shape(),-1.19,.27,2.38,1.59,.20);
    body.holes.push(openingPath(new T.Path(),.02));
    mesh(fixed,extrusion(body,1.41,.058),lacquer,0,0,-.73,'Pierced cast cabinet');
    // Broad metal feet and continuous gold plinth reveal.
    for(const x of [-.90,.90])for(const z of [-.49,.49]){
      cyl(fixed,dark,x,.064,z,.14,.145,.098,28);
      cyl(fixed,brass,x,.115,z,.127,.15,.057,28);
    }
    plate(fixed,oxblood,0,.27,-.012,2.46,.24,1.59,.095,.061);
    plate(fixed,brass,0,.332,-.009,2.48,.036,1.61,.016,.021);
    // Stepped pressed top; globe is cradled by the circular seat above it.
    plate(fixed,oxblood,0,1.84,-.013,2.47,.21,1.59,.095,.055);
    plate(fixed,brass,0,1.89,-.013,2.48,.046,1.61,.018,.03);
    plate(fixed,vermilion,0,1.987,-.013,2.47,.16,1.62,.066,.05);
    plate(fixed,brass,0,1.968,.847,2.18,.021,.006,.009,.002);
    plate(fixed,paleGold,0,1.977,.851,2.10,.006,.003,.002,.001);
    for(const sign of [-1,1]){
      const wing=plate(fixed,brass,sign*1.284,1.968,-.003,1.22,.02,.005,.007,.001);
      wing.rotation.y=sign*halfPi;
    }
    revolve(fixed,lacquer,[[.01,1.99],[.91,1.99],[1.06,2.035],[1.095,2.09],[1.09,2.17],[.99,2.209],[.01,2.209]],'Turntable cradle');
    hoop(fixed,brass,1.09,.024,0,2.105,0);
    hoop(fixed,paleGold,1.077,.012,0,2.167,0);
    cyl(fixed,enamel,0,2.198,0,1.018,1.035,.052);
    hoop(fixed,brass,1.036,.025,0,2.217,0);

    // Cartouche above the controls. Its printed wording remains legible from a side angle.
    plate(fixed,bronze,0,1.609,.758,1.77,.339,.075,.13,.020);
    plate(fixed,paleGold,0,1.612,.803,1.706,.283,.025,.105,.009);
    plate(fixed,ivory,0,1.612,.819,1.659,.239,.016,.089,.005);
    textPlate(fixed,'Love post cartouche',[
      ['心 愿 信 局',.48,.72,'620 SIZE "Atelier Serif","Songti SC","Microsoft YaHei",serif']
    ],0,1.616,.843,1.28,.212,{background:'#f6e9d4',ink:'#682c45'});
    screw(fixed,-.722,1.615,.835,.026);screw(fixed,.722,1.615,.835,.026);
    // Right cheek, vertical decorative ribs and a maintenance inspection hatch.
    for(const side of [-1,1]){
      const x=side*1.249;
      const sidePanel=group('Service hatch',fixed);
      sidePanel.position.set(x,1.064,0);sidePanel.rotation.y=side*halfPi;
      plate(sidePanel,bronze,0,0,0,1.04,1.10,.012,.175,.012);
      plate(sidePanel,oxblood,0,0,.013,.995,1.057,.011,.161,.009);
      for(let i=0;i<5;i++){
        const yy=(i-2)*.093;
        plate(sidePanel,bronze,0,yy+.075,.034,.59-Math.abs(i-2)*.049,.027,.008,.012,.003);
      }
      for(const u of [-.394,.394])for(const v of [-.409,.409])screw(sidePanel,u,v,.031,.022);
      batch(sidePanel);
    }
    // Genuine recessed service bay. The shell and both beaded bezels are pierced.
    outletRing(fixed,bronze,.01,.119,.735,.066,.012);
    outletRing(fixed,paleGold,.009,.088,.809,.016,.010);
    outletRing(fixed,oxblood,.007,.052,.83,.009,.006);
    plate(fixed,lining,.54,.84,.29,.94,.91,.046,.16,.012);
    const tray=plate(fixed,bronze,.54,.469,.80,.80,.067,.58,.028,.013);
    tray.rotation.x=.055;
    for(let i=-3;i<=3;i++){
      const rail=box(fixed,brass,.54+i*.098,.509,.817,.018,.012,.49);
      rail.rotation.x=.055;
    }
    plate(fixed,brass,.54,.49,1.10,.87,.074,.043,.03,.012);
    // Rotary dial bezel, lithographed turn scale and index marks on its fixed body.
    const cx=-.585,cy=.976;
    for(const [r,z,d,mat] of [[.443,.763,.065,bronze],[.417,.804,.040,paleGold],
      [.389,.833,.043,ivory],[.301,.866,.036,bronze]]){
      const disc=cyl(fixed,mat,cx,cy,z,r,r,d);disc.rotation.x=halfPi;
    }
    for(let n=0;n<21;n++){
      const a=(-130+n*13)*Math.PI/180;
      const rr=.355;
      const tick=box(fixed,n%5===0?lacquer:bronze,cx+Math.sin(a)*rr,cy+Math.cos(a)*rr,.86,
        n%5===0?.018:.012,n%5===0?.052:.028,.008);
      tick.rotation.z=-a;
    }
    for(const x of [-1.02,1.02])for(const y of [.485,1.728])screw(fixed,x,y,.747,.032);
    // Small red enamel engineering hallmark below the dial.
    plate(fixed,brass,cx,.445,.752,.45,.105,.011,.032,.002);
    textPlate(fixed,'Foundry marker',[['L O V E   P O S T',.5,.72,'550 SIZE "Atelier Sans",sans-serif']],
      cx,.446,.767,.394,.068,{background:'#c49a56',ink:'#513729'});
  }

  // Lathe profile of the blown bell. A continuous shoulder keeps the jar
  // recognisable in profile and avoids an oversized fishbowl silhouette.
  const jarProfile=[
    [1.018,2.218],[1.052,2.254],[1.065,2.320],[1.113,2.434],
    [1.205,2.635],[1.283,2.870],[1.325,3.115],[1.337,3.374],
    [1.319,3.615],[1.277,3.825],[1.205,4.053],[1.101,4.242],
    [.970,4.406],[.811,4.535],[.650,4.616],[.548,4.646],[.53,4.68]
  ];
  function radiusAt(y){
    for(let j=1;j<jarProfile.length;j++){
      const [r1,y1]=jarProfile[j],[r0,y0]=jarProfile[j-1];
      if(y<=y1)return r0+(r1-r0)*(y-y0)/(y1-y0);
    }
    return jarProfile[jarProfile.length-1][0];
  }
  function jarReflection(parent,start,end,azimuth,width,alpha) {
    const position=[],ix=[],segments=42;
    const glassHighlight=material('Glass softbox '+alpha,'#fffbef',.02,.24,
      {transparent:true,opacity:alpha,depthWrite:false,side:T.DoubleSide});
    for(let i=0;i<=segments;i++){
      const t=i/segments;
      const y=start+(end-start)*t,r=radiusAt(y)+.006;
      const a=azimuth+.12*t+.047*Math.sin(t*Math.PI);
      const hw=.5*width*Math.pow(Math.sin(Math.PI*t),.53);
      for(const side of [-1,1]){
        position.push(Math.sin(a+side*hw)*r,y,Math.cos(a+side*hw)*r);
      }
      if(i>0){
        const right=i*2+1,left=i*2;
        ix.push(left-2,left,right-2,right-2,left,right);
      }
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(position,3));
    g.setIndex(ix);g.computeVertexNormals();
    const o=mesh(parent,g,glassHighlight);o.renderOrder=6;o.castShadow=false;
  }
  function createJar(fixed) {
    const glass=material('Blown pale glass','#d6b7ca',.03,.16,{
      clearcoat:1,clearcoatRoughness:.10,transparent:true,opacity:.09,
      depthWrite:false,side:T.FrontSide});
    const bell=revolve(fixed,glass,jarProfile,'Blown glass bell');
    bell.renderOrder=5;bell.castShadow=false;
    // Embedded softbox-shaped highlights make the glass read in an unlit environment too.
    jarReflection(fixed,2.68,4.46,-.73,.105,.46);
    jarReflection(fixed,3.15,4.38,-.86,.022,.47);
    jarReflection(fixed,2.79,4.35,1.05,.055,.36);
    jarReflection(fixed,2.71,3.53,1.16,.027,.17);
    const lowEdge=material('Glass cut edge','#bfddd0',.18,.20,
      {transparent:true,opacity:.51,depthWrite:false});
    hoop(fixed,lowEdge,1.053,.012,0,2.282,0).renderOrder=6;

    // A small gold transfer follows the front of the curved glass.
    const transfer=group('Winged envelope transfer',fixed);
    transfer.position.set(0,4.00,1.218);
    transfer.rotation.x=-.31;
    const gild=material('Fired champagne transfer','#d6b37e',.36,.34);
    const mark=[[-.15,.085,0],[.15,.085,0],[.15,-.085,0],[-.15,-.085,0],[-.15,.085,0]];
    for(let i=1;i<mark.length;i++)pipe(transfer,gild,[mark[i-1],mark[i]],.008);
    for(const side of [-1,1]){
      pipe(transfer,gild,[[.146*side,.078,.002],[.064*side,.008,.003],[0,-.030,.004]],.007);
      for(let k=0;k<3;k++){
        const start=.195+k*.023;
        pipe(transfer,gild,[[start*side,.000+k*.021,-.007],[(start+.075)*side,.003+k*.036,-.021],[(start+.119)*side,.016+k*.044,-.035]],.0048);
      }
    }
    batch(transfer);

    // Two marginal brass stays support the lid without crossing the glass centre.
    for(const a of [-1.84,1.84]){
      const points=jarProfile.filter((v,i)=>i%2===0||i===jarProfile.length-1)
        .map(([r,y])=>[Math.sin(a)*(r+.009),y,Math.cos(a)*(r+.009)]);
      pipe(fixed,brass,points,.012);
      sphere(fixed,brass,points[0][0],2.25,points[0][2],.035,.055,.035);
    }

    // Red enamel pagoda crown on a raised knurled retaining ring.
    revolve(fixed,brass,[[.01,4.61],[.55,4.61],[.604,4.635],[.605,4.69],
      [.566,4.708],[.01,4.708]],'Lid retaining ring');
    for(let i=0;i<44;i++){
      const a=tau*i/44,rad=.605;
      const rib=box(fixed,bronze,Math.sin(a)*rad,4.661,Math.cos(a)*rad,.009,.026,.008);
      rib.rotation.y=a;
    }
    revolve(fixed,vermilion,[[.01,4.699],[.572,4.699],[.598,4.721],[.576,4.755],
      [.477,4.79],[.345,4.818],[.175,4.825],[.01,4.825]],'Enamel crown');
    hoop(fixed,paleGold,.585,.013,0,4.723,0);
    cyl(fixed,brass,0,4.824,0,.126,.159,.052,48);
    sphere(fixed,brass,0,4.877,0,.094,.061,.094);
    const loop=pipe(fixed,brass,heartOutline(.132,0),.022);
    loop.position.y=5.015;
    sphere(fixed,paleGold,-.065,4.897,0,.029);
    sphere(fixed,paleGold,.065,4.897,0,.029);
  }

  function createKnob(root) {
    const knob=group('Clockwise winding knob',root);
    knob.position.set(-.585,.976,.918);
    // Everything inside this axis group is centred on the axle at the nose of the casting.
    const hub=cyl(knob,brass,0,0,-.004,.282,.288,.119,64);hub.rotation.x=halfPi;
    const face=cyl(knob,oxblood,0,0,.069,.255,.268,.054,64);face.rotation.x=halfPi;
    hoop(knob,paleGold,.268,.012,0,0,.064,true);
    for(let i=0;i<32;i++){
      const a=tau*i/32;
      const ridge=box(knob,bronze,Math.cos(a)*.283,Math.sin(a)*.283,-.008,.014,.029,.068);
      ridge.rotation.z=a;
    }
    const grip=group('Porcelain inlaid handle',knob);grip.rotation.z=.22;
    plate(grip,bronze,0,0,.11,.616,.152,.078,.069,.022);
    plate(grip,paleGold,0,0,.151,.591,.133,.058,.059,.015);
    plate(grip,ivory,0,.006,.192,.488,.094,.045,.043,.011);
    for(const x of [-.253,.253])sphere(grip,paleGold,x,0,.180,.029,.034,.014);
    batch(grip);batch(knob);return knob;
  }
  function createGate(root) {
    const gate=group('Dispensing flap · hinge',root);gate.position.set(.54,1.225,.754);
    plate(gate,bronze,0,-.112,0,.74,.228,.043,.063,.013);
    plate(gate,ivory,0,-.117,.031,.702,.193,.019,.047,.005);
    textPlate(gate,'Outlet lettering',[['O U T',.51,.81,'580 SIZE "Atelier Sans",sans-serif']],
      0,-.119,.047,.40,.098,{background:'#ece0be',ink:'#78563c'});
    const axle=cyl(gate,brass,0,0,0,.035,.035,.84,28);axle.rotation.z=halfPi;
    batch(gate);return gate;
  }

  // Front and back rows are deliberately staggered, like capsules settled under gravity.
  const ballPositions=[
    [-.61,2.65,.35],[.026,2.56,.60],[.629,2.65,.39],
    [-.03,2.54,-.045],[-.506,2.66,-.523],[.488,2.66,-.50],
    [-.34,3.125,.49],[.344,3.135,.495],[.00,3.115,-.48],
    [-.704,3.117,-.097],[.695,3.12,-.096],[.055,3.618,.073]
  ];
  function make() {
    const root=group('Love post capsule dispenser'),fixed=group('Cabinet and bell',root);
    createCabinet(fixed);createJar(fixed);batch(fixed);
    const knob=createKnob(root),gate=createGate(root);
    const letters=[];
    const balls=ballPositions.map(([x,y,z],i)=>{
      const capsule=makeCapsule(palettes[i],i);letters.push(capsule.letter);
      const o=capsule.group;o.name='Chamber capsule '+String(i+1).padStart(2,'0');
      o.position.set(x,y,z);
      o.rotation.set([-.25,-.02,.15][i%3],Math.sin(i*2.65)*.46,[.25,-.31,.04,.17][i%4]);
      root.add(o);return o;
    });
    return {group:root,knob,gate,balls,letters,dropPoint:new T.Vector3(.54,.82,1.00)};
  }
  globalThis.WishMachine={make};
})();
