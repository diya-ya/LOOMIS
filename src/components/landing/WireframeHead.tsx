import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import type { Group, Mesh } from 'three';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

function HeadModel({
  pointer,
  reducedMotion,
}: {
  pointer: { x: number; y: number; active: boolean };
  reducedMotion: boolean;
}) {
  const group = useRef<Group>(null);
  const target = useRef({ x: 0, y: 0 });
  const auto = useRef(0);

  const jawGeo = useMemo(() => {
    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const y = -0.15 - t * 0.95;
      const x =
        0.72 * (1 - t * 0.15) * Math.pow(Math.cos((t * Math.PI) / 2), 0.55) +
        (t > 0.7 ? (t - 0.7) * 0.15 : 0);
      points.push(new THREE.Vector2(Math.max(0.08, x), y));
    }
    return new THREE.LatheGeometry(points, 32);
  }, []);

  const facePlaneGeo = useMemo(() => {
    return new THREE.CircleGeometry(0.62, 32);
  }, []);

  const wireMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#EAE4DA',
        wireframe: true,
        transparent: true,
        opacity: 0.55,
      }),
    [],
  );

  const solidEdge = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#F2EBE0',
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      }),
    [],
  );

  const guideLines = useMemo(() => {
    const makeLine = (pts: [number, number, number][], color: string) => {
      const geo = new THREE.BufferGeometry().setFromPoints(
        pts.map((p) => new THREE.Vector3(...p)),
      );
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
      });
      return new THREE.Line(geo, mat);
    };

    const centerline = makeLine(
      [
        [0, 0.95, 0.35],
        [0, 0.15, 0.72],
        [0, -0.35, 0.7],
        [0, -1.05, 0.35],
      ],
      '#F2EBE0',
    );

    const equator = makeLine(
      [
        [-0.78, 0.12, 0.15],
        [-0.55, 0.15, 0.55],
        [0, 0.15, 0.72],
        [0.55, 0.15, 0.55],
        [0.78, 0.12, 0.15],
      ],
      '#C78368',
    );

    const brow = makeLine(
      [
        [-0.42, 0.22, 0.65],
        [-0.2, 0.26, 0.7],
        [0, 0.24, 0.72],
        [0.2, 0.26, 0.7],
        [0.42, 0.22, 0.65],
      ],
      '#91A8B8',
    );

    const nose = makeLine(
      [
        [0, 0.18, 0.72],
        [0, -0.05, 0.8],
        [0, -0.22, 0.78],
        [-0.08, -0.28, 0.7],
        [0.08, -0.28, 0.7],
      ],
      '#A9A9A2',
    );

    const jawL = makeLine(
      [
        [-0.55, 0.05, 0.45],
        [-0.48, -0.35, 0.5],
        [-0.28, -0.85, 0.4],
        [0, -1.05, 0.35],
      ],
      '#A89BB8',
    );

    const jawR = makeLine(
      [
        [0.55, 0.05, 0.45],
        [0.48, -0.35, 0.5],
        [0.28, -0.85, 0.4],
        [0, -1.05, 0.35],
      ],
      '#A89BB8',
    );

    return [centerline, equator, brow, nose, jawL, jawR];
  }, []);

  useFrame((_, delta) => {
    if (!group.current) return;

    if (!reducedMotion) {
      if (pointer.active) {
        target.current.x = pointer.y * 0.35;
        target.current.y = pointer.x * 0.45;
      } else {
        auto.current += delta * 0.25;
        target.current.x = Math.sin(auto.current * 0.35) * 0.08;
        target.current.y = auto.current;
      }
    }

    const g = group.current;
    if (reducedMotion) {
      g.rotation.x = 0.08;
      g.rotation.y = 0.35;
      return;
    }

    if (pointer.active) {
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, target.current.x, 4, delta);
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, target.current.y, 4, delta);
    } else {
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, target.current.x, 2, delta);
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, target.current.y, 1.2, delta);
    }
  });

  return (
    <group ref={group} position={[0, 0.15, 0]}>
      {/* Cranial sphere */}
      <mesh position={[0, 0.2, 0]} material={wireMat}>
        <sphereGeometry args={[0.85, 28, 20]} />
      </mesh>

      {/* Slightly flattened front cranial cap */}
      <mesh position={[0, 0.25, 0.15]} scale={[0.92, 0.88, 0.75]} material={solidEdge}>
        <sphereGeometry args={[0.82, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
      </mesh>

      {/* Face disc suggestion */}
      <mesh
        position={[0, -0.05, 0.55]}
        rotation={[0, 0, 0]}
        scale={[1, 1.15, 1]}
        material={solidEdge}
        ref={(m: Mesh | null) => {
          if (m) m.geometry = facePlaneGeo;
        }}
      >
        <circleGeometry args={[0.62, 32]} />
      </mesh>

      {/* Jaw / mandible */}
      <mesh position={[0, 0.05, 0]} material={wireMat} geometry={jawGeo} />

      {/* Chin bulb */}
      <mesh position={[0, -1.0, 0.28]} scale={[0.55, 0.4, 0.5]} material={wireMat}>
        <sphereGeometry args={[0.28, 12, 10]} />
      </mesh>

      {/* Neck suggestion */}
      <mesh position={[0, -1.25, 0.05]} material={solidEdge}>
        <cylinderGeometry args={[0.28, 0.32, 0.45, 12, 3, true]} />
      </mesh>

      {guideLines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}

export function WireframeHead() {
  const reducedMotion = usePrefersReducedMotion();
  const [pointer, setPointer] = useState({ x: 0, y: 0, active: false });
  const containerRef = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    setPointer({ x, y, active: true });
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[320px] w-full"
      onPointerMove={onMove}
      onPointerEnter={onMove}
      onPointerLeave={() => setPointer((p) => ({ ...p, active: false }))}
      aria-hidden
    >
      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 40 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <HeadModel pointer={pointer} reducedMotion={reducedMotion} />
      </Canvas>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, #111110 78%)',
        }}
      />
    </div>
  );
}
