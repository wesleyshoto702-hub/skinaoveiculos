import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { HeroCar } from "./HeroCar";

/**
 * The ORIGINAL HeroCar SVG is used as the visible vehicle artwork.
 * A minimal dark body gives it side/front depth when the existing real
 * scroll-driven 3D camera lowers to the nose. No Ferrari/GLB is loaded.
 */
const CLASSIC_ARTWORK = "/skinao-classic-top.svg";

const ease = (value: number) => value * value * (3 - 2 * value);
function range(progress: number, start: number, end: number) {
  return ease(Math.max(0, Math.min(1, (progress - start) / (end - start))));
}

export function CarScroll3D({ progress }: { progress: number }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const renderRef = useRef<(() => void) | null>(null);
  const progressRef = useRef(progress);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    progressRef.current = progress;
    renderRef.current?.();
  }, [progress]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let active = true;
    let visible = true;
    let request = 0;
    let artworkTexture: THREE.Texture | null = null;
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: window.innerWidth > 760,
        powerPreference: "high-performance",
      });
    } catch {
      setStatus("failed");
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth <= 760 ? 1.25 : 1.6));
    renderer.setClearColor(0x030407, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.42;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.className = "hero-3d-canvas";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040509, 0.023);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.07, 110);
    const focus = new THREE.Vector3();

    scene.add(new THREE.HemisphereLight(0x9bb1d4, 0x0a0b12, 2.1));
    const overhead = new THREE.DirectionalLight(0xf0f5ff, 3.5);
    overhead.position.set(-3, 9, -4);
    scene.add(overhead);
    const rim = new THREE.PointLight(0xe5223a, 29, 12, 2);
    rim.position.set(3, 3.4, 2.8);
    scene.add(rim);
    const silverRim = new THREE.PointLight(0xb9d8ff, 30, 14, 2);
    silverRim.position.set(-3, 2.6, -0.8);
    scene.add(silverRim);

    // The same dark road, with stripes traveling backward when the car speeds up.
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 130),
      new THREE.MeshStandardMaterial({ color: 0x101218, roughness: 0.87, metalness: 0.05, side: THREE.DoubleSide }),
    );
    road.rotation.x = -Math.PI / 2;
    road.position.y = -0.035;
    scene.add(road);

    const dashed: THREE.Mesh[] = [];
    const markings = new THREE.Group();
    const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x4a4d56, transparent: true, opacity: 0.8 });
    const dashMaterial = new THREE.MeshBasicMaterial({ color: 0x787a86, transparent: true, opacity: 0.66 });
    for (const x of [-2.5, 2.5]) {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.055, 120), edgeMaterial);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(x, -0.013, 0);
      markings.add(edge);
    }
    for (let i = 0; i < 32; i++) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 1.5), dashMaterial);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, -0.012, 0);
      markings.add(dash);
      dashed.push(dash);
    }
    scene.add(markings);

    const car = new THREE.Group();
    scene.add(car);

    const blackBody = new THREE.MeshPhysicalMaterial({
      color: 0x121820, metalness: 0.73, roughness: 0.27,
      clearcoat: 1, clearcoatRoughness: 0.14,
    });
    const blackTrim = new THREE.MeshStandardMaterial({ color: 0x07090e, metalness: 0.55, roughness: 0.38 });
    const windowGlass = new THREE.MeshPhysicalMaterial({
      color: 0x1c303b, metalness: 0.36, roughness: 0.13,
      clearcoat: 1, clearcoatRoughness: 0.1,
    });
    const chrome = new THREE.MeshStandardMaterial({ color: 0x515b68, metalness: 0.85, roughness: 0.25 });
    const red = new THREE.MeshBasicMaterial({ color: 0xbd2136 });
    const grilleMaterial = new THREE.MeshStandardMaterial({ color: 0x04060a, roughness: 0.7 });
    const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xeaf8ff, transparent: true, opacity: 0 });
    const addBox = (
      width: number, height: number, depth: number,
      material: THREE.Material, x: number, y: number, z: number,
    ) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
      mesh.position.set(x, y, z);
      car.add(mesh);
      return mesh;
    };

    // Subtle volume only: the overhead face is still the exact old SVG.
    addBox(2.04, 0.55, 4.25, blackBody, 0, 0.56, 0);
    addBox(1.94, 0.13, 1.24, blackBody, 0, 0.90, -1.47);
    addBox(1.63, 0.42, 2.10, windowGlass, 0, 0.96, 0.20);
    addBox(1.50, 0.09, 1.54, blackTrim, 0, 1.20, 0.29);
    for (const x of [-0.96, 0.96]) {
      addBox(0.045, 0.055, 3.48, chrome, x, 0.72, -0.01);
      addBox(0.17, 0.10, 0.26, blackTrim, x * 1.04, 1.02, -0.25);
    }
    // Front view matches the old SVG: broad dark nose, cool white LEDs,
    // narrow grille, red lower bumper accent.
    addBox(1.95, 0.42, 0.11, blackBody, 0, 0.65, -2.19);
    addBox(1.90, 0.12, 0.10, chrome, 0, 0.88, -2.25);
    addBox(0.98, 0.22, 0.08, grilleMaterial, 0, 0.55, -2.28);
    addBox(1.64, 0.09, 0.07, blackTrim, 0, 0.37, -2.28);
    addBox(1.49, 0.023, 0.10, red, 0, 0.29, -2.30);

    const wheelSpinners: THREE.Group[] = [];
    for (const x of [-1.04, 1.04]) {
      for (const z of [-1.41, 1.38]) {
        const pivot = new THREE.Group();
        pivot.position.set(x, 0.42, z);
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.22, 18), blackTrim);
        tire.rotation.z = Math.PI / 2;
        pivot.add(tire);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.225, 12), chrome);
        hub.rotation.z = Math.PI / 2;
        pivot.add(hub);
        car.add(pivot);
        wheelSpinners.push(pivot);
      }
    }

    // Both the roof and hood use the ORIGINAL SVG image from HeroCar.tsx.
    // It remains a flat illustration; modest geometry only fills out the face
    // seen while the exact same camera lowers toward the headlights.
    const topGeometry = new THREE.PlaneGeometry(2.52, 4.80);
    topGeometry.rotateZ(Math.PI);
    const topMaterial = new THREE.MeshBasicMaterial({
      transparent: true, side: THREE.DoubleSide, depthWrite: false,
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.rotation.x = -Math.PI / 2;
    top.position.set(0, 1.265, 0);
    car.add(top);

    const lamps: THREE.Mesh[] = [];
    const beams: THREE.SpotLight[] = [];
    for (const x of [-0.70, 0.70]) {
      const darkHousing = addBox(0.49, 0.14, 0.10, blackTrim, x, 0.79, -2.28);
      darkHousing.position.x = x;
      const lamp = addBox(0.42, 0.07, 0.015, lampMaterial, x, 0.81, -2.355);
      lamps.push(lamp);
      const beam = new THREE.SpotLight(0xe5f2ff, 0, 17, Math.PI / 6, 0.6, 1.25);
      beam.position.set(x, 0.78, -2.36);
      const target = new THREE.Object3D();
      target.position.set(x * 1.3, 0.02, -10);
      car.add(beam, target);
      beam.target = target;
      beams.push(beam);
    }

    const glowTexture = (() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.12, "rgba(235,248,255,0.91)");
      gradient.addColorStop(0.38, "rgba(171,211,255,0.36)");
      gradient.addColorStop(1, "rgba(171,211,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(canvas);
    })();
    const halos: THREE.Sprite[] = [];
    if (glowTexture) {
      for (const x of [-0.70, 0.70]) {
        const mat = new THREE.SpriteMaterial({
          map: glowTexture, color: 0xe6f4ff, blending: THREE.AdditiveBlending,
          depthWrite: false, transparent: true, opacity: 0,
        });
        const halo = new THREE.Sprite(mat);
        halo.position.set(x, 0.81, -2.39);
        car.add(halo);
        halos.push(halo);
      }
    }

    function draw() {
      request = 0;
      if (!active || !visible) return;
      const p = progressRef.current;
      const travel = range(p, 0.13, 0.61);
      const orbit = range(p, 0.28, 0.77);
      const approach = range(p, 0.77, 0.875);
      const lit = range(p, 0.10, 0.29);
      const flash = range(p, 0.79, 0.90);

      // Unchanged camera choreography approved by the user.
      camera.position.set(
        0.03 + orbit * 0.15 + approach * 0.52,
        9.6 - orbit * 8.0 - approach * 0.80,
        0.04 - orbit * 5.55 + approach * 2.85,
      );
      camera.up.set(0, orbit, 1 - orbit).normalize();
      focus.set(approach * 0.62, 0.10 + 0.54 * orbit, -approach * 1.91);
      camera.lookAt(focus);
      camera.fov = 45 - 3 * approach;
      camera.updateProjectionMatrix();

      for (let i = 0; i < dashed.length; i++) {
        const period = 32 * 3.4;
        const shifted = ((i * 3.4 + travel * 70) % period + period) % period;
        dashed[i].position.z = shifted - period / 2;
      }
      for (const wheel of wheelSpinners) wheel.rotation.x = -travel * 18;

      lampMaterial.opacity = lit;
      for (const beam of beams) beam.intensity = lit * (3 + flash * 9);
      for (const halo of halos) {
        const mat = halo.material as THREE.SpriteMaterial;
        mat.opacity = lit * (0.58 + flash * 0.42);
        const size = 0.95 + flash * 0.8;
        halo.scale.set(size, size, size);
      }
      renderer.render(scene, camera);
    }
    function invalidate() {
      if (!active || request) return;
      request = requestAnimationFrame(draw);
    }
    renderRef.current = invalidate;
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) invalidate();
    }, { rootMargin: "300px 0px" });
    observer.observe(mount);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      invalidate();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    // Same-origin asset, no GLB downloads. Convert SVG to a canvas texture
    // for reliable GPU upload on desktop browsers and mobile Safari.
    const img = new Image();
    img.onload = () => {
      if (!active) return;
      const canvas = document.createElement("canvas");
      canvas.width = 700;
      canvas.height = 1330;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setStatus("failed");
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
      artworkTexture = texture;
      topMaterial.map = texture;
      topMaterial.needsUpdate = true;
      setStatus("ready");
      invalidate();
    };
    img.onerror = () => {
      if (active) setStatus("failed");
    };
    img.src = CLASSIC_ARTWORK;

    return () => {
      active = false;
      renderRef.current = null;
      img.onload = null;
      img.onerror = null;
      cancelAnimationFrame(request);
      observer.disconnect();
      resizeObserver.disconnect();
      artworkTexture?.dispose();
      glowTexture?.dispose();
      for (const halo of halos) (halo.material as THREE.SpriteMaterial).dispose();
      scene.traverse((item) => {
        if (!(item instanceof THREE.Mesh)) return;
        item.geometry.dispose();
        const materials = Array.isArray(item.material) ? item.material : [item.material];
        for (const material of materials) material.dispose();
      });
      topGeometry.dispose();
      topMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div className="hero-3d-host" ref={mountRef} data-state={status} aria-hidden="true">
      {status !== "ready" && <div className="hero-3d-fallback">
        <HeroCar />
        {status === "failed" && <span className="hero-3d-fallback-note">Prévia automotiva</span>}
      </div>}
    </div>
  );
}
