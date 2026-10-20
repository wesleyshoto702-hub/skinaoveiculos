import { useEffect, useRef, useState } from "react";
import { HeroCar } from "./HeroCar";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

/**
 * One actual 3D vehicle and one continuous physical camera path.
 * Scroll drives camera height, pitch, distance, lights and road movement.
 * There is no top-view image, frontal image, crossfade or camera cut.
 *
 * Source demonstration mesh: Ferrari 458 by vicent091036 (CC BY 4.0).
 * Replace the MODEL_URL with an approved, locally hosted GLB for production.
 */
const MODEL_URL = "https://threejs.org/examples/models/gltf/ferrari.glb";
const DRACO_URL = "https://www.gstatic.com/draco/v1/decoders/";

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
    if (!mount || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let active = true;
    let request = 0;
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
    renderer.toneMappingExposure = 1.45;
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

    // Dark night road. Stripes physically move backward as the car accelerates.
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
    const wheels: THREE.Object3D[] = [];

    // LEDs belong to the 3D scene; their beam direction remains attached to the
    // front as the actual camera travels from the roof to the headlamps.
    const lampMeshMaterial = new THREE.MeshBasicMaterial({ color: 0xe9f7ff, transparent: true, opacity: 0 });
    const lampMeshes: THREE.Mesh[] = [];
    const beams: THREE.SpotLight[] = [];
    const glowTexture = (() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const context = canvas.getContext("2d");
      if (!context) return null;
      const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 64);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.10, "rgba(235,248,255,0.91)");
      gradient.addColorStop(0.35, "rgba(171,211,255,0.36)");
      gradient.addColorStop(1, "rgba(171,211,255,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(canvas);
    })();
    const halos: THREE.Sprite[] = [];
    const createHeadlight = (x: number) => {
      const glass = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), lampMeshMaterial);
      glass.position.set(x, 0.66, -2.13);
      car.add(glass);
      lampMeshes.push(glass);
      if (glowTexture) {
        const material = new THREE.SpriteMaterial({
          map: glowTexture, color: 0xe6f4ff, blending: THREE.AdditiveBlending,
          depthWrite: false, transparent: true, opacity: 0,
        });
        const halo = new THREE.Sprite(material);
        halo.position.set(x, 0.67, -2.23);
        halo.scale.set(1.0, 1.0, 1);
        car.add(halo);
        halos.push(halo);
      }
      const beam = new THREE.SpotLight(0xe5f2ff, 0, 17, Math.PI / 6, 0.6, 1.25);
      beam.position.set(x, 0.73, -2.11);
      const target = new THREE.Object3D();
      target.position.set(x * 1.3, 0.02, -10);
      car.add(beam, target);
      beam.target = target;
      beams.push(beam);
    };
    createHeadlight(-0.68);
    createHeadlight(0.68);

    let visible = true;
    const observer = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) invalidate();
    }, { rootMargin: "300px 0px" });
    observer.observe(mount);

    function draw() {
      request = 0;
      if (!active || !visible) return;
      const p = progressRef.current;
      const travel = range(p, 0.13, 0.61);
      const orbit = range(p, 0.28, 0.77);
      const approach = range(p, 0.77, 0.875);
      const lit = range(p, 0.10, 0.29);
      const flash = range(p, 0.79, 0.90);

      // One continuous camera path around one unchanged 3D mesh.
      // Front of this demonstration model points toward negative Z.
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
      for (const wheel of wheels) wheel.rotation.x = -travel * 18;

      lampMeshMaterial.opacity = lit;
      for (const beam of beams) beam.intensity = lit * (3 + flash * 9);
      for (const halo of halos) {
        const material = halo.material as THREE.SpriteMaterial;
        material.opacity = lit * (0.58 + flash * 0.42);
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

    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_URL);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (!active) return;
        const vehicle = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(vehicle);
        const size = bounds.getSize(new THREE.Vector3());
        if (!size.z || !isFinite(size.z)) { setStatus("failed"); return; }
        vehicle.scale.setScalar(4.50 / size.z);
        const finalBox = new THREE.Box3().setFromObject(vehicle);
        const center = finalBox.getCenter(new THREE.Vector3());
        vehicle.position.set(-center.x, 0.12 - finalBox.min.y, -center.z);
        const body = vehicle.getObjectByName("body") as THREE.Mesh | undefined;
        if (body?.isMesh) {
          body.material = new THREE.MeshPhysicalMaterial({
            color: 0x14171d, metalness: 0.72, roughness: 0.24,
            clearcoat: 1, clearcoatRoughness: 0.11,
          });
        }
        const glass = vehicle.getObjectByName("glass") as THREE.Mesh | undefined;
        if (glass?.isMesh) {
          glass.material = new THREE.MeshPhysicalMaterial({
            color: 0x1c303e, metalness: 0.18, roughness: 0.12,
            clearcoat: 1, clearcoatRoughness: 0.1,
          });
        }
        for (const name of ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr"]) {
          const item = vehicle.getObjectByName(name);
          if (item) wheels.push(item);
        }
        car.add(vehicle);
        setStatus("ready");
        invalidate();
      },
      undefined,
      () => {
        if (active) setStatus("failed");
      },
    );

    return () => {
      active = false;
      renderRef.current = null;
      cancelAnimationFrame(request);
      observer.disconnect();
      resizeObserver.disconnect();
      draco.dispose();
      glowTexture?.dispose();
      for (const halo of halos) (halo.material as THREE.SpriteMaterial).dispose();
      for (const object of [...scene.children, ...car.children]) {
        object.traverse((item) => {
          if (!(item instanceof THREE.Mesh)) return;
          item.geometry?.dispose();
          const materials = Array.isArray(item.material) ? item.material : [item.material];
          for (const material of materials) material.dispose();
        });
      }
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
