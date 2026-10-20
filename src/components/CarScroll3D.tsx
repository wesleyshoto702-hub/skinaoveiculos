import { useEffect, useRef, useState } from "react";

type SceneController = {
  render: (progress: number) => void;
  dispose: () => void;
};
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const phase = (p: number, a: number, b: number) => smooth((p - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * A real, cohesive 3D concept sedan, built procedurally.
 * No external GLB, no flat images masquerading as a car and no morph/crossfade.
 * All bodywork, glass, wheels, grille and lamps stay fixed to ONE 3D vehicle;
 * only the camera changes when the user scrolls.
 */
async function mountScene(host: HTMLDivElement): Promise<SceneController> {
  const THREE = await import("three");
  const renderer = new THREE.WebGLRenderer({
    antialias: true, alpha: false, powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.55));
  renderer.setSize(Math.max(host.clientWidth, 1), Math.max(host.clientHeight, 1), false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;
  renderer.domElement.className = "hero-three-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#07090e");
  scene.fog = new THREE.FogExp2("#07090e", 0.032);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 110);

  scene.add(new THREE.HemisphereLight(0xc8d9ee, 0x111014, 2.5));
  const light = (color: number, intensity: number, position: [number, number, number]) => {
    const spot = new THREE.DirectionalLight(color, intensity);
    spot.position.set(...position);
    scene.add(spot);
  };
  light(0xf3f8ff, 3.4, [-5, 9, 7]);
  light(0x7589a8, 2.0, [6, 5, -3]);
  light(0xd52845, 0.85, [-5, 2, -6]);

  const paint = new THREE.MeshPhysicalMaterial({
    color: "#20262f", metalness: 0.48, roughness: 0.31,
    clearcoat: 0.82, clearcoatRoughness: 0.19, side: THREE.DoubleSide,
  });
  const edgePaint = new THREE.MeshStandardMaterial({
    color: "#515d6a", metalness: 0.65, roughness: 0.32, side: THREE.DoubleSide,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#0e2534", metalness: 0.32, roughness: 0.22,
    clearcoat: 1, clearcoatRoughness: 0.1,
    side: THREE.DoubleSide,
  });
  const sideGlass = new THREE.MeshPhysicalMaterial({
    color: "#132838", metalness: .18, roughness: .25,
    clearcoat: .9, side: THREE.DoubleSide,
  });
  const rubber = new THREE.MeshStandardMaterial({ color: "#07090b", roughness: .91 });
  const alloys = new THREE.MeshStandardMaterial({ color: "#a6b2bf", metalness: .75, roughness: .26 });
  const black = new THREE.MeshStandardMaterial({ color: "#07090e", metalness: .28, roughness: .5 });
  const darkChrome = new THREE.MeshStandardMaterial({ color: "#39434c", metalness: .83, roughness: .31 });
  const tailRed = new THREE.MeshStandardMaterial({
    color: "#db233e", emissive: "#941020", emissiveIntensity: .72, metalness: .1, roughness: .24,
  });
  const headlampMaterial = new THREE.MeshStandardMaterial({
    color: "#b5d9f4", emissive: "#b5e3ff", emissiveIntensity: .12, roughness: .23,
  });
  const asphalt = new THREE.MeshStandardMaterial({ color: "#11141b", metalness: .08, roughness: .91 });
  const lineMaterial = new THREE.MeshBasicMaterial({
    color: "#657080", transparent: true, opacity: .22, depthWrite: false,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: "#c62139", emissive: "#4b050d", emissiveIntensity: .22, roughness: .32,
  });

  const car = new THREE.Group();
  scene.add(car);
  const add = (parent: InstanceType<typeof THREE.Object3D>, geo: InstanceType<typeof THREE.BufferGeometry>, mat: InstanceType<typeof THREE.Material>) => {
    const mesh = new THREE.Mesh(geo, mat);
    parent.add(mesh);
    return mesh;
  };

  // Lofted, soft-shouldered body with a genuine continuous 3D surface. The
  // 16-point ring avoids the rectangular "blocks under the drawing" problem.
  type Section = readonly [number, number, number, number];
  const sections: Section[] = [
    [-2.48, .57, .72, .89],
    [-2.35, .89, .75, 1.02],
    [-2.04, .99, .75, 1.08],
    [-1.48, 1.04, .74, 1.09],
    [-.62, 1.06, .72, 1.02],
    [.38, 1.07, .73, 1.05],
    [1.28, 1.07, .71, 1.07],
    [1.88, 1.06, .70, 1.02],
    [2.22, 1.00, .66, .96],
    [2.44, .85, .64, .88],
    [2.51, .60, .63, .83],
  ];
  const radial = 20;
  const vertices: number[] = [];
  const triangles: number[] = [];
  const ring = (z: number, width: number, bottom: number, top: number) => {
    const h = top - bottom;
    for (let i = 0; i < radial; i++) {
      const angle = (i / radial) * Math.PI * 2;
      const sn = Math.sin(angle), cs = Math.cos(angle);
      const x = width * (sn >= 0 ? 1 : -1) * Math.pow(Math.abs(sn), .76);
      const y = bottom + h * (.5 + .5 * Math.sign(cs) * Math.pow(Math.abs(cs), .68));
      // Round body shoulders instead of generating a box-like chassis.
      vertices.push(x, y, z);
    }
  };
  for (const [z,w,bot,top] of sections) ring(z,w,bot,top);
  for (let row=0; row<sections.length-1; row++) {
    for (let i=0; i<radial; i++) {
      const a=row*radial+i, b=row*radial+(i+1)%radial;
      const c=(row+1)*radial+i, d=(row+1)*radial+(i+1)%radial;
      triangles.push(a,c,b,b,c,d);
    }
  }
  // Physically cap front and rear ends.
  const backIndex=vertices.length/3;
  vertices.push(0,.80,-2.48);
  const frontIndex=vertices.length/3;
  vertices.push(0,.75,2.51);
  for (let i=0;i<radial;i++) {
    const j=(i+1)%radial;
    triangles.push(backIndex,j,i);
    const off=(sections.length-1)*radial;
    triangles.push(frontIndex,off+i,off+j);
  }
  const bodyGeometry = new THREE.BufferGeometry();
  bodyGeometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices,3));
  bodyGeometry.setIndex(triangles);
  bodyGeometry.computeVertexNormals();
  add(car,bodyGeometry,paint);

  // Sculpted glasshouse: genuine roof height with forward sloping windscreen.
  type CabinSection = readonly [number, number, number, number];
  const canopy: CabinSection[] = [
    [-1.46,.70,1.04,1.08],
    [-1.13,.69,1.05,1.57],
    [-.68,.67,1.09,1.73],
    [.17,.68,1.08,1.75],
    [.49,.70,1.06,1.65],
    [1.11,.83,1.02,1.06],
  ];
  const cabinVertices: number[] = [];
  const cabinIndices: number[] = [];
  // Each longitudinal slice describes the glass base and slightly arched roof.
  for (const [z,w,base,top] of canopy) {
    for (const [x,y] of [
      [-w,base],[-w*.91,base+(top-base)*.78],[-w*.66,top],
      [0,top+.035],[w*.66,top],[w*.91,base+(top-base)*.78],[w,base],
    ]) cabinVertices.push(x,y,z);
  }
  for (let j=0;j<canopy.length-1;j++) {
    for(let k=0;k<6;k++) {
      const a=j*7+k, b=a+1, c=(j+1)*7+k, d=c+1;
      cabinIndices.push(a,b,c,b,d,c);
    }
  }
  const canopyGeometry = new THREE.BufferGeometry();
  canopyGeometry.setAttribute("position",new THREE.Float32BufferAttribute(cabinVertices,3));
  canopyGeometry.setIndex(cabinIndices);
  canopyGeometry.computeVertexNormals();
  add(car,canopyGeometry,paint);

  // Individual glass panes remain embedded in the sculpted roof rather than
  // being flat cards in front of the camera.
  const quad = (points: [number,number,number][], material: InstanceType<typeof THREE.Material>) => {
    const positions: number[] = [];
    // Double-sided face.
    for(const pt of points) positions.push(...pt);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
    geom.setIndex([0,1,2,0,2,3]);
    geom.computeVertexNormals();
    return add(car,geom,material);
  };
  quad([
    [-.65,1.742,.22],[.65,1.742,.22],
    [.79,1.097,1.084],[-.79,1.097,1.084],
  ],glass);
  quad([
    [.67,1.737,-.65],[-.67,1.737,-.65],
    [-.68,1.095,-1.13],[.68,1.095,-1.13],
  ],glass);
  for (const side of [-1,1]) {
    quad([
      [side*.695,1.08, .85],[side*.667,1.70,.36],
      [side*.668,1.71,-.54],[side*.695,1.10,-1.10],
    ],sideGlass);
  }

  const tube = (points: [number,number,number][], radius: number,
    material: InstanceType<typeof THREE.Material>) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    return add(car,new THREE.TubeGeometry(curve, Math.max(12,points.length*7),radius,6,false),material);
  };
  // A-pillars, B-pillar and metal roofline.
  for(const side of [-1,1]) {
    tube([[side*.84,1.065,1.12],[side*.75,1.30,.84],[side*.67,1.72,.43]],.036,edgePaint);
    tube([[side*.69,1.74,.35],[side*.67,1.77,-.44],[side*.68,1.73,-.68]],.029,edgePaint);
    tube([[side*.68,1.73,-.69],[side*.69,1.40,-1.04],[side*.72,1.075,-1.43]],.036,edgePaint);
    tube([[side*.72,1.07,-.24],[side*.70,1.58,-.23],[side*.68,1.75,-.23]],.026,darkChrome);
    // Bonnet character crease: no red element from the rear crosses the hood.
    tube([[side*.35,1.11,.98],[side*.48,1.10,1.41],[side*.58,1.02,2.22]],.014,edgePaint);
    // Side sill extending wheelbase.
    tube([[side*.99,.50,-.85],[side*1.05,.47,-.14],[side*1.03,.48,.83]],.042,black);
    // Tiny body-color mirrors.
    const mirror = add(car,new THREE.SphereGeometry(.135,12,9),paint);
    mirror.scale.set(1.55,.50,.72);
    mirror.position.set(side*.92,1.13,.68);
  }

  // Retain the complete wheels so their rotation matches the passing road.
  const animatedWheels: InstanceType<typeof THREE.Group>[] = [];
  // Physical tyres, alloys, center caps and five clean spokes.
  for(const side of [-1,1]){
    for(const z of [-1.52,1.52]){
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(side*1.055,.42,z);
      const tyre=add(wheelGroup,new THREE.CylinderGeometry(.43,.43,.235,28,1),rubber);
      tyre.rotation.z=Math.PI/2;
      const disc=add(wheelGroup,new THREE.CylinderGeometry(.290,.290,.246,28,1),alloys);
      disc.rotation.z=Math.PI/2;
      const inner=add(wheelGroup,new THREE.CylinderGeometry(.238,.238,.255,24,1),black);
      inner.rotation.z=Math.PI/2;
      const cap=add(wheelGroup,new THREE.CylinderGeometry(.076,.076,.27,16),darkChrome);
      cap.rotation.z=Math.PI/2;
      const faceX=side*.145;
      for(let spoke=0;spoke<5;spoke++){
        const a=spoke*(Math.PI*2/5);
        const arm=add(wheelGroup,new THREE.BoxGeometry(.025,.085,.30),alloys);
        arm.position.set(faceX,Math.sin(a)*.155,Math.cos(a)*.155);
        arm.rotation.x=a;
      }
      car.add(wheelGroup);
      animatedWheels.push(wheelGroup);
    }
  }

  // Front fascia is at positive Z, independent from the rear taillights.
  const grille=add(car,new THREE.BoxGeometry(1.12,.24,.06),black);
  grille.position.set(0,.75,2.508);
  for(let i=-2;i<=2;i++){
    const line=add(car,new THREE.BoxGeometry(1.00,.012,.066),darkChrome);
    line.position.set(0,.75+i*.042,2.548);
  }
  // Lower air intakes, bumper lip, and a subtle red accent.
  for(const side of [-1,1]) {
    const intake=add(car,new THREE.BoxGeometry(.31,.12,.045),black);
    intake.position.set(side*.77,.65,2.442);
    intake.rotation.y=side*.21;
  }
  tube([[-.76,.545,2.47],[0,.51,2.55],[.76,.545,2.47]],.016,accent);

  // Sharp paired headlights with distinct off-state emitters and local glows.
  const glowSprites: InstanceType<typeof THREE.Sprite>[]=[];
  const pointLights: InstanceType<typeof THREE.PointLight>[]=[];
  const glowCanvas=document.createElement("canvas");
  glowCanvas.width=glowCanvas.height=128;
  const ctx=glowCanvas.getContext("2d");
  if(ctx){
    const radialGlow=ctx.createRadialGradient(64,64,4,64,64,64);
    radialGlow.addColorStop(0,"rgba(255,255,255,1)");
    radialGlow.addColorStop(.18,"rgba(224,243,255,.85)");
    radialGlow.addColorStop(.49,"rgba(130,198,255,.27)");
    radialGlow.addColorStop(1,"rgba(130,198,255,0)");
    ctx.fillStyle=radialGlow;ctx.fillRect(0,0,128,128);
  }
  const glowTexture=new THREE.CanvasTexture(glowCanvas);
  glowTexture.colorSpace=THREE.SRGBColorSpace;
  for(const side of [-1,1]){
    const lamp=add(car,new THREE.BoxGeometry(.56,.065,.08),headlampMaterial);
    lamp.position.set(side*.70,.96,2.40);
    lamp.rotation.y=side*.24;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({
      map:glowTexture,color:0xcceaff,transparent:true,opacity:0,
      blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,
    }));
    sprite.position.set(side*.70,.96,2.54);
    sprite.scale.set(1.45,1.04,1);
    car.add(sprite);
    glowSprites.push(sprite);
    const led=new THREE.PointLight(0xd6ebff,0,3.4,2);
    led.position.set(side*.70,.96,2.6);
    car.add(led);
    pointLights.push(led);
    // Static rear taillights at negative Z — never animate them through body.
    const rear=add(car,new THREE.BoxGeometry(.55,.065,.07),tailRed);
    rear.position.set(side*.65,1.01,-2.42);
    rear.rotation.y=side*.17;
  }

  // Road surface, soft fake ambient shadow and restrained painted lane edges.
  const floor=add(scene,new THREE.PlaneGeometry(140,140),asphalt);
  floor.rotation.x=-Math.PI/2;
  floor.position.y=-.025;
  for(const side of [-1,1]){
    const line=add(scene,new THREE.PlaneGeometry(.048,55),lineMaterial);
    line.rotation.x=-Math.PI/2;
    line.position.set(side*3.3,-.014,0);
  }

  // Real-world yellow lane dashes, placed on the asphalt at both sides of
  // the vehicle. Instancing draws every dash in a single GPU draw call.
  // The dashes move toward negative Z: the car faces positive Z.
  // No decals are rendered on top of the paintwork or the vehicle itself.
  const dashLength=2.05;
  const dashSpacing=4.35;
  const dashesPerSide=22;
  const dashLoopLength=dashSpacing*dashesPerSide;
  const dashStartZ=37;
  const dashGeometry=new THREE.PlaneGeometry(.15,dashLength);
  dashGeometry.rotateX(-Math.PI/2);
  const yellowPaint=new THREE.MeshBasicMaterial({
    color: "#f5bd35", side: THREE.DoubleSide,
    transparent: true, opacity: .94, depthWrite: false, toneMapped: false,
  });
  const laneDashes=new THREE.InstancedMesh(dashGeometry,yellowPaint,dashesPerSide*2);
  laneDashes.frustumCulled=false;
  laneDashes.renderOrder=1;
  scene.add(laneDashes);
  const dashTransform=new THREE.Object3D();
  let travelled=0;
  const updateLaneDashes=(isMobile:boolean)=>{
    const laneOffset=isMobile?1.58:2.19;
    for(let sideIndex=0;sideIndex<2;sideIndex++){
      for(let i=0;i<dashesPerSide;i++){
        const z=dashStartZ-((i*dashSpacing+travelled)%dashLoopLength);
        dashTransform.position.set(sideIndex===0?-laneOffset:laneOffset,.008,z);
        dashTransform.updateMatrix();
        laneDashes.setMatrixAt(sideIndex*dashesPerSide+i,dashTransform.matrix);
      }
    }
    laneDashes.instanceMatrix.needsUpdate=true;
  };

  const shadowCanvas=document.createElement("canvas");
  shadowCanvas.width=shadowCanvas.height=128;
  const shadowCtx=shadowCanvas.getContext("2d");
  if(shadowCtx){
    const g=shadowCtx.createRadialGradient(64,64,4,64,64,64);
    g.addColorStop(0,"rgba(0,0,0,.83)");
    g.addColorStop(.55,"rgba(0,0,0,.45)");
    g.addColorStop(1,"rgba(0,0,0,0)");
    shadowCtx.fillStyle=g;
    shadowCtx.fillRect(0,0,128,128);
  }
  const shadowTexture=new THREE.CanvasTexture(shadowCanvas);
  const shadowMaterial=new THREE.MeshBasicMaterial({
    map:shadowTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,
  });
  const shadow=add(scene,new THREE.PlaneGeometry(3.75,7.4),shadowMaterial);
  shadow.rotation.x=-Math.PI/2;
  shadow.position.y=-.004;

  let mobile=false;
  let lastProgress=0;
  let repaint: (()=>void)|null=null;
  let disposed=false;
  let isVisible=true;
  let animationFrame=0;
  let previousFrameTime=0;
  let roadSpeed=0;
  let wheelAngle=0;

  // Scroll decides when to accelerate; wall-clock time moves the lane marks.
  // Once the user pauses scrolling, the car still feels as if it is driving.
  // The road slows again just before the headlight flash and brand reveal.
  const targetRoadSpeed=(progress:number)=>
    24*phase(progress,.15,.63)*(1-phase(progress,.875,.965));

  const resize=()=>{
    const width=Math.max(1,host.clientWidth), height=Math.max(1,host.clientHeight);
    mobile=width<=700;
    camera.aspect=width/height;
    camera.fov=mobile?45:42;
    camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
    updateLaneDashes(mobile);
    repaint?.();
  };
  const observer=new ResizeObserver(resize);
  observer.observe(host);
  resize();

  const draw=(progress:number)=>{
    if(disposed)return;
    const orbit=phase(progress,.12,.73);
    // The camera remains scroll-controlled; the road animation is independent.
    camera.position.set(
      0,
      lerp(mobile?12.2:10.7,mobile?1.92:1.76,orbit),
      lerp(mobile?3.8:2.55,mobile?10.4:6.95,orbit),
    );
    camera.up.set(0,1,0);
    camera.lookAt(0,lerp(.69,.98,orbit),lerp(.1,.35,orbit));
    const ignition=phase(progress,.785,.855);
    const flash=phase(progress,.865,.935);
    headlampMaterial.emissiveIntensity=.12+ignition*2.8+flash*4.0;
    for(let i=0;i<glowSprites.length;i++){
      const sprite=glowSprites[i]!;
      (sprite.material as InstanceType<typeof THREE.SpriteMaterial>).opacity=ignition*(.66+flash*.34);
      const scale=1+flash*1.35;
      sprite.scale.set(1.45*scale,1.04*scale,1);
      pointLights[i]!.intensity=ignition*2.8+flash*4.0;
    }
    if(isVisible&&!document.hidden)renderer.render(scene,camera);
  };

  const stopLoop=()=>{
    if(animationFrame)cancelAnimationFrame(animationFrame);
    animationFrame=0;
    previousFrameTime=0;
  };
  const tick=(now:number)=>{
    animationFrame=0;
    if(disposed||!isVisible||document.hidden)return;
    const delta=previousFrameTime
      ?Math.min((now-previousFrameTime)/1000,.05)
      :0;
    previousFrameTime=now;
    const desired=targetRoadSpeed(lastProgress);
    // Gradual acceleration and braking instead of instant lane teleportation.
    roadSpeed+=(desired-roadSpeed)*(1-Math.exp(-delta*3.4));
    if(delta>0&&roadSpeed>.015){
      const distance=roadSpeed*delta;
      travelled=(travelled+distance)%dashLoopLength;
      updateLaneDashes(mobile);
      wheelAngle=(wheelAngle+distance/.43)%(Math.PI*2);
      for(const wheel of animatedWheels)wheel.rotation.x=wheelAngle;
      renderer.render(scene,camera);
    }
    if(desired>.06||roadSpeed>.06){
      animationFrame=requestAnimationFrame(tick);
    }else{
      roadSpeed=0;
      previousFrameTime=0;
    }
  };
  const maybeRun=()=>{
    if(!disposed&&isVisible&&!document.hidden&&!animationFrame&&
      (targetRoadSpeed(lastProgress)>.06||roadSpeed>.06)){
      previousFrameTime=0;
      animationFrame=requestAnimationFrame(tick);
    }
  };
  const render=(progress:number)=>{
    if(disposed)return;
    lastProgress=progress;
    draw(progress);
    maybeRun();
  };
  repaint=()=>render(lastProgress);

  // Prevent continuous GPU use when this Hero is outside the viewport.
  const intersection=new IntersectionObserver(entries=>{
    isVisible=entries[0]?.isIntersecting??false;
    if(isVisible)render(lastProgress);
    else stopLoop();
  },{threshold:0});
  intersection.observe(host);
  const onVisibility=()=>{
    if(document.hidden)stopLoop();
    else render(lastProgress);
  };
  document.addEventListener("visibilitychange",onVisibility);

  const dispose=()=>{
    if(disposed)return;
    disposed=true;
    stopLoop();
    observer.disconnect();
    intersection.disconnect();
    document.removeEventListener("visibilitychange",onVisibility);
    const geometries=new Set<InstanceType<typeof THREE.BufferGeometry>>();
    const materials=new Set<InstanceType<typeof THREE.Material>>();
    scene.traverse(node=>{
      const mesh=node as InstanceType<typeof THREE.Mesh>;
      if(mesh.isMesh){
        geometries.add(mesh.geometry);
        const mat=mesh.material;
        (Array.isArray(mat)?mat:[mat]).forEach(m=>materials.add(m));
      }
      const sprite=node as InstanceType<typeof THREE.Sprite>;
      if(sprite.isSprite)materials.add(sprite.material);
    });
    geometries.forEach(g=>g.dispose());
    materials.forEach(m=>m.dispose());
    glowTexture.dispose();
    shadowTexture.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
  return {render,dispose};
}

export function CarScroll3D({ progress, onSceneReady }: { progress: number; onSceneReady?: () => void }) {
  const hostRef=useRef<HTMLDivElement>(null);
  const controllerRef=useRef<SceneController|null>(null);
  const progressRef=useRef(progress);
  const onSceneReadyRef=useRef(onSceneReady);
  onSceneReadyRef.current=onSceneReady;
  const [ready,setReady]=useState(false);

  useEffect(()=>{
    progressRef.current=progress;
    controllerRef.current?.render(progress);
  },[progress]);

  useEffect(()=>{
    let cancelled=false;
    let cleanup: SceneController|null=null;
    const host=hostRef.current;
    if(!host)return;
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){
      onSceneReadyRef.current?.();
      return;
    }
    mountScene(host).then(controller=>{
      if(cancelled){controller.dispose();return;}
      cleanup=controller;
      controllerRef.current=controller;
      controller.render(progressRef.current);
      setReady(true);
      onSceneReadyRef.current?.();
    }).catch(error=>{
      // Preserve a static automotive fallback on unsupported devices/WebGL.
      console.warn("Skinão 3D: fallback activated",error);
      if(!cancelled){
        setReady(false);
        onSceneReadyRef.current?.(); // Static fallback is safe to reveal.
      }
    });
    return ()=>{
      cancelled=true;
      controllerRef.current=null;
      cleanup?.dispose();
    };
  },[]);

  return (
    <div className="hero-three-scene" aria-hidden="true" data-ready={ready}>
      <div ref={hostRef} className="hero-three-stage"/>
      {!ready&&<div className="hero-three-fallback"/>}
    </div>
  );
}
