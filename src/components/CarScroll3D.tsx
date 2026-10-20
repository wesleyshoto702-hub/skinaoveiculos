import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { HeroCar } from "./HeroCar";

/**
 * Scroll-driven virtual camera over the two original FLAT car illustrations.
 * All visible car geometry is only transparent artwork planes; there are no
 * 3D car boxes, wheels, roof meshes or GLB models hidden under the artwork.
 * After reaching the front, the camera holds still while BOTH LEDs flash.
 */
const TOP_ARTWORK = "/skinao-classic-top.svg";
const FRONT_ARTWORK = "/skinao-classic-front.svg";

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
    const artworkTextures: THREE.Texture[] = [];
    const images: HTMLImageElement[] = [];
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

    // Two illustration plates of the SAME original stylized car. These are
    // zero-thickness transparent planes: no 3D body or floating base.
    const vehicleArtwork = new THREE.Group();
    scene.add(vehicleArtwork);

    const topMaterial = new THREE.MeshBasicMaterial({
      transparent: true, opacity: 1, side: THREE.DoubleSide,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
    });
    const topGeometry = new THREE.PlaneGeometry(2.52, 4.8);
    topGeometry.rotateZ(Math.PI);
    const topPlane = new THREE.Mesh(topGeometry, topMaterial);
    topPlane.rotation.x = -Math.PI / 2;
    topPlane.position.y = 0.037;
    topPlane.renderOrder = 2;
    vehicleArtwork.add(topPlane);

    const frontArtwork = new THREE.Group();
    frontArtwork.position.z = -2.29;
    // Mobile should display the complete front rather than cropping headlights.
    const mobile = window.innerWidth < 760;
    if (mobile) frontArtwork.scale.setScalar(0.63);
    vehicleArtwork.add(frontArtwork);

    const frontMaterial = new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
    });
    const frontPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.124), frontMaterial);
    frontPlane.rotation.y = Math.PI; // artwork faces the approaching front camera
    frontPlane.position.y = 1.06;
    frontPlane.renderOrder = 4;
    frontArtwork.add(frontPlane);

    // Two distinct white LED blooms, placed over both lights of the original
    // frontal SVG. They activate only AFTER the camera settles at the front.
    const glowTexture = (() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.13, "rgba(245,250,255,.97)");
      gradient.addColorStop(0.38, "rgba(198,226,255,.50)");
      gradient.addColorStop(0.7, "rgba(145,195,255,.10)");
      gradient.addColorStop(1, "rgba(145,195,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(canvas);
    })();
    const halos: THREE.Sprite[] = [];
    if (glowTexture) {
      for (const x of [-1.026, 1.026]) {
        const material = new THREE.SpriteMaterial({
          map: glowTexture, color: 0xeaf7ff, transparent: true,
          blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0,
        });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(x, 0.82, -0.07);
        sprite.scale.set(0.95, 0.83, 1);
        sprite.renderOrder = 6;
        frontArtwork.add(sprite);
        halos.push(sprite);
      }
    }

    function draw() {
      request = 0;
      if (!active || !visible) return;

      const p = progressRef.current;
      const travel = range(p, 0.12, 0.54);
      // Same camera progression, but no final one-headlight zoom.
      const orbit = range(p, 0.17, 0.73);
      const showFront = range(p, 0.44, 0.74);
      const lampsOn = range(p, 0.785, 0.855);
      const flash = range(p, 0.865, 0.935);

      // One continuous physical camera path from the top to a centered frontal
      // view, then completely stationary from scroll progress 0.73 onwards.
      camera.position.set(
        0.03 * (1 - orbit),
        9.6 - orbit * 8.05,
        0.04 - orbit * (mobile ? 6.95 : 6.05),
      );
      camera.up.set(0, orbit, 1 - orbit).normalize();
      focus.set(0, 0.23 + orbit * 0.65, -orbit * 1.40);
      camera.lookAt(focus);
      camera.fov = 45;
      camera.updateProjectionMatrix();

      topMaterial.opacity = 1 - showFront;
      frontMaterial.opacity = showFront;

      // The road motion is finished BEFORE the camera reaches the front.
      // The vehicle is stationary while the two lamps power up.
      for (let i = 0; i < dashed.length; i++) {
        const period = 32 * 3.4;
        const shifted = ((i * 3.4 + travel * 70) % period + period) % period;
        dashed[i].position.z = shifted - period / 2;
      }
      for (const halo of halos) {
        const mat = halo.material as THREE.SpriteMaterial;
        mat.opacity = showFront * lampsOn * (0.48 + 0.52 * flash);
        const size = 0.9 + flash * 2.3;
        halo.scale.set(size, size * .86, 1);
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

    // Rasterize the TWO bundled SVG artworks. They are the same drawings
    // used by the original HeroCar and FrontHeroCar components.
    let loaded = 0;
    const loadArtwork = (url: string, material: THREE.MeshBasicMaterial, w: number, h: number) => {
      const img = new Image();
      images.push(img);
      img.onload = () => {
        if (!active) return;
        try {
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas is unavailable");
          ctx.drawImage(img, 0, 0, w, h);
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
          artworkTextures.push(texture);
          material.map = texture;
          material.needsUpdate = true;
          loaded += 1;
          if (loaded === 2) setStatus("ready");
          invalidate();
        } catch {
          if (active) setStatus("failed");
        }
      };
      img.onerror = () => {
        if (active) setStatus("failed");
      };
      img.src = url;
    };
    loadArtwork(TOP_ARTWORK, topMaterial, 700, 1330);
    loadArtwork(FRONT_ARTWORK, frontMaterial, 1000, 590);

    return () => {
      active = false;
      renderRef.current = null;
      for (const img of images) { img.onload = null; img.onerror = null; }
      cancelAnimationFrame(request);
      observer.disconnect();
      resizeObserver.disconnect();
      for (const texture of artworkTextures) texture.dispose();
      glowTexture?.dispose();
      for (const halo of halos) (halo.material as THREE.SpriteMaterial).dispose();
      scene.traverse((item) => {
        if (!(item instanceof THREE.Mesh)) return;
        item.geometry.dispose();
        const materials = Array.isArray(item.material) ? item.material : [item.material];
        for (const material of materials) material.dispose();
      });
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
