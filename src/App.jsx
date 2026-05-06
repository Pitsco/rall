import React, { Suspense, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { DEFAULT_CODE } from './rall/samples';
import { parseRall } from './rall/parser';
import { interpretRall } from './rall/interpreter';

const BASE_URL = import.meta.env.BASE_URL;

const HOLD_MODEL_PATHS = {
  jug: `${BASE_URL}models/holds/jug.glb`,
  crimp: `${BASE_URL}models/holds/crimp.glb`,
  sloper: `${BASE_URL}models/holds/sloper.glb`,
  pinch: `${BASE_URL}models/holds/pinch.glb`,
};

const WALL_HEIGHT = 7.2;
const CENTER_WIDTH = 5.8;
const SIDE_WIDTH = 3.0;
const TOTAL_FLAT_WIDTH = CENTER_WIDTH + SIDE_WIDTH * 2;
const FACE_DEPTH = 0.14;
const SIDE_ANGLE = 0.32;

const COLORS = {
  wood: '#dec7a4',
  woodLight: '#ead8b8',
  woodDark: '#cbb894',
  pink: '#c91452',
  pinkDark: '#8f0a32',
  orange: '#ef6b25',
  burgundy: '#7a071f',
  mat: '#303438',
  matLine: '#202428',
  bolt: '#4f4a42',
};

const FACE_LAYOUT = {
  left: {
    flatCenterX: -CENTER_WIDTH / 2 - SIDE_WIDTH / 2,
    width: SIDE_WIDTH,
  },
  center: {
    flatCenterX: 0,
    width: CENTER_WIDTH,
  },
  right: {
    flatCenterX: CENTER_WIDTH / 2 + SIDE_WIDTH / 2,
    width: SIDE_WIDTH,
  },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function centerForHingedPanel(hingeX, hingeZ, localXAtHinge, rotationY) {
  const xOffset = localXAtHinge * Math.cos(rotationY);
  const zOffset = -localXAtHinge * Math.sin(rotationY);

  return [hingeX - xOffset, WALL_HEIGHT / 2, hingeZ - zOffset];
}

function PrimitiveHold({ type, color, position }) {
  const materialProps = {
    color,
    roughness: 0.82,
    metalness: 0.03,
  };

  const meshProps = {
    castShadow: true,
    receiveShadow: true,
  };

  return (
    <group position={position}>
      {type === 'jug' && (
        <mesh {...meshProps} position={[0, 0, 0.24]} rotation={[0, 0, 0.15]}>
          <sphereGeometry args={[0.24, 28, 28]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      )}

      {type === 'crimp' && (
        <mesh {...meshProps} position={[0, 0, 0.09]} rotation={[0, 0, -0.1]}>
          <boxGeometry args={[0.42, 0.16, 0.18]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      )}

      {type === 'sloper' && (
        <mesh {...meshProps} position={[0, 0, 0.19]} rotation={[0, 0, 0.2]}>
          <sphereGeometry args={[0.3, 28, 28, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      )}

      {type === 'pinch' && (
        <mesh {...meshProps} position={[0, 0, 0.18]} rotation={[0, 0, 0.55]}>
          <cylinderGeometry args={[0.12, 0.18, 0.46, 22]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      )}

      {!['jug', 'crimp', 'sloper', 'pinch'].includes(type) && (
        <mesh {...meshProps} position={[0, 0, 0.2]}>
          <dodecahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      )}
    </group>
  );
}

function HoldModel({ type, color, position }) {
  const { scene } = useGLTF(HOLD_MODEL_PATHS[type]);

  const { model, correction } = useMemo(() => {
    const cloned = scene.clone(true);

    cloned.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map((material) => {
              const clonedMaterial = material.clone();

              if (clonedMaterial.color) {
                clonedMaterial.color.set(color);
              }

              clonedMaterial.roughness = 0.85;
              clonedMaterial.metalness = 0.03;

              return clonedMaterial;
            });
          } else {
            child.material = child.material.clone();

            if (child.material.color) {
              child.material.color.set(color);
            }

            child.material.roughness = 0.85;
            child.material.metalness = 0.03;
          }
        }
      }
    });

    cloned.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(cloned);

    if (box.isEmpty()) {
      return {
        model: cloned,
        correction: [0, 0, 0],
      };
    }

    const center = new THREE.Vector3();
    box.getCenter(center);

    return {
      model: cloned,
      correction: [-center.x, -center.y, -box.min.z],
    };
  }, [scene, color]);

  const rotationMap = {
    jug: [0, 0, 0.15],
    crimp: [0, 0, -0.1],
    sloper: [0, 0, 0.2],
    pinch: [0, 0, 0.55],
  };

  const scaleMap = {
    jug: 0.01,
    crimp: 0.5,
    sloper: 0.01,
    pinch: 0.5,
  };

  return (
    <group
      position={position}
      rotation={rotationMap[type] || [0, 0, 0]}
      scale={scaleMap[type] || 0.02}
    >
      <primitive object={model} position={correction} />
    </group>
  );
}

function HoldMesh({ type, color, position, useRealModels }) {
  if (!useRealModels || !HOLD_MODEL_PATHS[type]) {
    return <PrimitiveHold type={type} color={color} position={position} />;
  }

  return (
    <Suspense fallback={<PrimitiveHold type={type} color={color} position={position} />}>
      <HoldModel type={type} color={color} position={position} />
    </Suspense>
  );
}

Object.values(HOLD_MODEL_PATHS).forEach((path) => {
  if (path) {
    useGLTF.preload(path);
  }
});

function PanelBoltHoles({ width, height, spacingX = 0.48, spacingY = 0.48 }) {
  const holes = [];
  const z = FACE_DEPTH / 2 + 0.009;

  for (let x = -width / 2 + 0.34; x <= width / 2 - 0.34; x += spacingX) {
    for (let y = -height / 2 + 0.34; y <= height / 2 - 0.34; y += spacingY) {
      holes.push(
        <mesh
          key={`${x.toFixed(2)}-${y.toFixed(2)}`}
          renderOrder={-10}
          position={[x, y, z]}
        >
          <circleGeometry args={[0.017, 10]} />
          <meshStandardMaterial
            color={COLORS.bolt}
            roughness={1}
            metalness={0}
            depthWrite={false}
          />
        </mesh>
      );
    }
  }

  return <>{holes}</>;
}

function SurfaceRect({ x, y, width, height, color, layer = 1 }) {
  const z = FACE_DEPTH / 2 + 0.003 + layer * 0.001;

  return (
    <mesh renderOrder={-20 + layer} position={[x, y, z]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color={color}
        roughness={0.92}
        metalness={0}
        side={THREE.FrontSide}
        depthTest={false}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2 - layer}
        polygonOffsetUnits={-2 - layer}
      />
    </mesh>
  );
}

function SurfacePolygon({ points, color, layer = 1 }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();

    shape.moveTo(points[0][0], points[0][1]);

    for (let i = 1; i < points.length; i += 1) {
      shape.lineTo(points[i][0], points[i][1]);
    }

    shape.closePath();

    return new THREE.ShapeGeometry(shape);
  }, [points]);

  const z = FACE_DEPTH / 2 + 0.003 + layer * 0.001;

  return (
    <mesh renderOrder={-20 + layer} position={[0, 0, z]}>
      <primitive attach="geometry" object={geometry} />
      <meshStandardMaterial
        color={color}
        roughness={0.92}
        metalness={0}
        side={THREE.FrontSide}
        depthTest={false}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2 - layer}
        polygonOffsetUnits={-2 - layer}
      />
    </mesh>
  );
}

function BoxVolume({
  x,
  y,
  width = 1,
  height = 1,
  depth = 0.55,
  rotation = 0,
  color = COLORS.woodLight,
}) {
  return (
    <mesh
      receiveShadow
      castShadow
      position={[x, y, FACE_DEPTH / 2 + depth / 2 + 0.006]}
      rotation={[0, 0, rotation]}
    >
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} roughness={0.95} metalness={0.01} />
    </mesh>
  );
}

function TriangularVolume({
  x,
  y,
  size = 1,
  depth = 0.65,
  rotation = 0,
  color = COLORS.woodLight,
}) {
  const geometry = useMemo(() => {
    const r = size;

    const vertices = [
      0, r, 0,
      -r * 0.9, -r * 0.55, 0,
      r * 0.9, -r * 0.55, 0,
      0, 0, depth,
    ];

    // No back face, so it does not z-fight with the wall.
    const indices = [
      0, 3, 1,
      1, 3, 2,
      2, 3, 0,
    ];

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }, [size, depth]);

  return (
    <mesh
      receiveShadow
      castShadow
      position={[x, y, FACE_DEPTH / 2 + 0.006]}
      rotation={[0, 0, rotation]}
    >
      <primitive attach="geometry" object={geometry} />
      <meshStandardMaterial
        color={color}
        roughness={0.95}
        metalness={0.01}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function WallFace({
  width,
  height,
  position,
  rotation = [0, 0, 0],
  color = COLORS.wood,
  children,
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh receiveShadow castShadow renderOrder={-30}>
        <boxGeometry args={[width, height, FACE_DEPTH]} />
        <meshStandardMaterial color={color} roughness={0.96} metalness={0.01} />
      </mesh>

      {children}

      <PanelBoltHoles width={width} height={height} />
    </group>
  );
}

function mapHoldToFace(hold, wall) {
  const sourceWidth = Math.max(toNumber(wall?.width, TOTAL_FLAT_WIDTH), 1);
  const sourceHeight = Math.max(toNumber(wall?.height, WALL_HEIGHT), 1);

  const rawX = toNumber(hold.x, sourceWidth / 2);
  const rawY = toNumber(hold.y, sourceHeight / 2);
  const rawZ = toNumber(hold.z, 0);

  const xFlat = clamp(
    (rawX / sourceWidth - 0.5) * TOTAL_FLAT_WIDTH,
    -TOTAL_FLAT_WIDTH / 2 + 0.28,
    TOTAL_FLAT_WIDTH / 2 - 0.28
  );

  const y = clamp(
    (rawY / sourceHeight) * WALL_HEIGHT,
    0.35,
    WALL_HEIGHT - 0.35
  );

  let faceKey = 'center';

  if (xFlat < -CENTER_WIDTH / 2) {
    faceKey = 'left';
  } else if (xFlat > CENTER_WIDTH / 2) {
    faceKey = 'right';
  }

  const face = FACE_LAYOUT[faceKey];

  const localX = clamp(
    xFlat - face.flatCenterX,
    -face.width / 2 + 0.25,
    face.width / 2 - 0.25
  );

  const zExtra = clamp(rawZ, 0, 0.025);

  return {
    faceKey,
    localX,
    y,
    z: FACE_DEPTH / 2 + 0.014 + zExtra,
  };
}

function HoldsForFace({ faceKey, wall, routes, useRealModels }) {
  return routes.flatMap((route) =>
    (route.holds || []).map((hold, index) => {
      const mapped = mapHoldToFace(hold, wall);

      if (mapped.faceKey !== faceKey) {
        return null;
      }

      return (
        <HoldMesh
          key={`${route.name}-${faceKey}-${index}`}
          type={hold.type}
          color={hold.color || route.color || '#ef4444'}
          position={[mapped.localX, mapped.y - WALL_HEIGHT / 2, mapped.z]}
          useRealModels={useRealModels}
        />
      );
    })
  );
}

function ClimbingWall({ wall, routes, useRealModels }) {
  const leftCenter = centerForHingedPanel(
    -CENTER_WIDTH / 2,
    0,
    SIDE_WIDTH / 2,
    SIDE_ANGLE
  );

  const rightCenter = centerForHingedPanel(
    CENTER_WIDTH / 2,
    0,
    -SIDE_WIDTH / 2,
    -SIDE_ANGLE
  );

  return (
    <group>
      {/* Left connected wall panel */}
      <WallFace
        width={SIDE_WIDTH}
        height={WALL_HEIGHT}
        position={leftCenter}
        rotation={[0, SIDE_ANGLE, 0]}
        color={COLORS.wood}
      >
        <SurfaceRect
          x={-0.35}
          y={-WALL_HEIGHT / 2 + 0.85}
          width={2.3}
          height={1.7}
          color={COLORS.pink}
          layer={2}
        />

        <SurfacePolygon
          color={COLORS.orange}
          layer={3}
          points={[
            [-SIDE_WIDTH / 2, -1.1],
            [SIDE_WIDTH / 2, -0.55],
            [SIDE_WIDTH / 2, 0.15],
            [-SIDE_WIDTH / 2, -0.35],
          ]}
        />

        <TriangularVolume
          x={-0.25}
          y={0.55}
          size={0.65}
          depth={0.55}
          rotation={-0.5}
          color={COLORS.pinkDark}
        />

        <HoldsForFace
          faceKey="left"
          wall={wall}
          routes={routes}
          useRealModels={useRealModels}
        />
      </WallFace>

      {/* Main center wall panel */}
      <WallFace
        width={CENTER_WIDTH}
        height={WALL_HEIGHT}
        position={[0, WALL_HEIGHT / 2, 0]}
        color={COLORS.woodLight}
      >
        {/* Subtle plywood-style facets */}
        <SurfacePolygon
          color="#e4d0ad"
          layer={1}
          points={[
            [-CENTER_WIDTH / 2, -WALL_HEIGHT / 2],
            [-0.7, -WALL_HEIGHT / 2],
            [-1.6, -1.25],
            [-CENTER_WIDTH / 2, -0.35],
          ]}
        />

        <SurfacePolygon
          color="#d8c39f"
          layer={1}
          points={[
            [-1.4, 1.2],
            [0.5, 2.95],
            [CENTER_WIDTH / 2, 2.55],
            [CENTER_WIDTH / 2, WALL_HEIGHT / 2],
            [0.15, WALL_HEIGHT / 2],
          ]}
        />

        <SurfacePolygon
          color="#ead9ba"
          layer={1}
          points={[
            [-CENTER_WIDTH / 2, 0.4],
            [-0.3, 0.1],
            [1.6, -1.4],
            [-0.85, -2.1],
          ]}
        />

        {/* Bottom magenta section */}
        <SurfacePolygon
          color={COLORS.pink}
          layer={2}
          points={[
            [-CENTER_WIDTH / 2, -WALL_HEIGHT / 2],
            [-1.2, -WALL_HEIGHT / 2],
            [-0.4, -2.65],
            [-CENTER_WIDTH / 2, -2.05],
          ]}
        />

        {/* Orange diagonal band */}
        <SurfacePolygon
          color={COLORS.orange}
          layer={3}
          points={[
            [-CENTER_WIDTH / 2, -2.2],
            [1.9, -1.95],
            [CENTER_WIDTH / 2, -1.35],
            [CENTER_WIDTH / 2, -0.65],
            [-1.6, -1.25],
            [-CENTER_WIDTH / 2, -1.5],
          ]}
        />

        <BoxVolume
          x={-1.35}
          y={-1.05}
          width={1.2}
          height={0.9}
          depth={0.65}
          rotation={0.22}
          color={COLORS.wood}
        />

        <TriangularVolume
          x={0.95}
          y={0.55}
          size={0.9}
          depth={0.7}
          rotation={0.4}
          color={COLORS.woodLight}
        />

        <TriangularVolume
          x={1.9}
          y={-2.05}
          size={0.75}
          depth={0.6}
          rotation={-0.65}
          color={COLORS.orange}
        />

        <HoldsForFace
          faceKey="center"
          wall={wall}
          routes={routes}
          useRealModels={useRealModels}
        />
      </WallFace>

      {/* Right connected wall panel */}
      <WallFace
        width={SIDE_WIDTH}
        height={WALL_HEIGHT}
        position={rightCenter}
        rotation={[0, -SIDE_ANGLE, 0]}
        color={COLORS.wood}
      >
        <SurfacePolygon
          color={COLORS.orange}
          layer={2}
          points={[
            [-SIDE_WIDTH / 2, -WALL_HEIGHT / 2],
            [0.25, -WALL_HEIGHT / 2],
            [SIDE_WIDTH / 2, -1.85],
            [SIDE_WIDTH / 2, 2.35],
            [-SIDE_WIDTH / 2, 1.7],
          ]}
        />

        <SurfacePolygon
          color={COLORS.orange}
          layer={2}
          points={[
            [-SIDE_WIDTH / 2, 1.9],
            [SIDE_WIDTH / 2, 2.45],
            [SIDE_WIDTH / 2, WALL_HEIGHT / 2],
            [-0.45, WALL_HEIGHT / 2],
          ]}
        />

        <SurfaceRect
          x={0.92}
          y={1.15}
          width={0.85}
          height={4.65}
          color={COLORS.burgundy}
          layer={3}
        />

        <BoxVolume
          x={0.05}
          y={0.85}
          width={1.05}
          height={0.85}
          depth={0.55}
          rotation={-0.12}
          color={COLORS.woodLight}
        />

        <HoldsForFace
          faceKey="right"
          wall={wall}
          routes={routes}
          useRealModels={useRealModels}
        />
      </WallFace>
    </group>
  );
}

function FloorBase() {
  const seams = [];

  for (let i = -3; i <= 3; i += 1) {
    seams.push(
      <mesh key={i} position={[i * 1.85, 0.018, 2.85]}>
        <boxGeometry args={[0.025, 0.018, 5.7]} />
        <meshStandardMaterial color={COLORS.matLine} roughness={1} />
      </mesh>
    );
  }

  return (
    <>
      {/* Concrete room floor */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 3]}>
        <planeGeometry args={[24, 16]} />
        <meshStandardMaterial color="#d7d7d4" roughness={1} />
      </mesh>

      {/* Bouldering mat: top is exactly y = 0, so it touches the wall bottom */}
      <mesh receiveShadow castShadow position={[0, -0.1, 2.85]}>
        <boxGeometry args={[13.4, 0.2, 5.7]} />
        <meshStandardMaterial color={COLORS.mat} roughness={0.96} />
      </mesh>

      {seams}
    </>
  );
}

function WallScene({ data, useRealModels }) {
  const wall = data.wall;
  const routes = data.routes || [];

  return (
    <group position={[0, 0, 0]}>
      <FloorBase />

      <ClimbingWall
        wall={wall}
        routes={routes}
        useRealModels={useRealModels}
      />
    </group>
  );
}

function Legend({ routes }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Routes</h2>

      <div className="mt-3 space-y-2">
        {routes.map((route) => (
          <div
            key={route.name}
            className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-4 w-4 rounded-full border border-stone-300"
                style={{ backgroundColor: route.color }}
              />

              <div>
                <div className="font-medium text-slate-900">{route.name}</div>
                <div className="text-sm text-slate-500">{route.holds.length} holds</div>
              </div>
            </div>

            <span className="rounded-full bg-stone-200 px-2 py-1 text-xs font-semibold text-slate-700">
              {route.grade}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [useRealModels, setUseRealModels] = useState(true);

  async function loadExample(fileName) {
    try {
      const response = await fetch(`${BASE_URL}examples/${fileName}`);

      if (!response.ok) {
        throw new Error(`Could not load ${fileName}`);
      }

      const text = await response.text();
      setCode(text);
    } catch (error) {
      setCode(`// Error loading example: ${error.message}`);
    }
  }

  const parsed = useMemo(() => {
    try {
      const ast = parseRall(code);
      const result = interpretRall(ast);

      return {
        data: result.scene,
        output: result.output,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        output: [],
        error: error.message || 'Parse error',
      };
    }
  }, [code]);

  return (
    <div className="min-h-screen bg-stone-100 text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-4 p-4 lg:grid-cols-[420px_1fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Rall Wall Designer</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Write Rall source code, run the interpreter, and preview the climbing wall in 3D.
                </p>
              </div>

              <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                Interpreter Demo
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-stone-50 p-3 text-sm text-slate-600">
              Syntax:{' '}
              <span className="font-mono">wall</span>,{' '}
              <span className="font-mono">route</span>,{' '}
              <span className="font-mono">color</span>,{' '}
              <span className="font-mono">grade</span>,{' '}
              <span className="font-mono">hold</span>,{' '}
              <span className="font-mono">at (x,y,z)</span>,{' '}
              <span className="font-mono">for</span>,{' '}
              <span className="font-mono">if</span>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-sm font-semibold text-slate-700">
                Load Example Programs
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCode(DEFAULT_CODE)}
                  className="rounded-xl bg-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-300"
                >
                  Default
                </button>

                <button
                  type="button"
                  onClick={() => loadExample('hello_wall.rall')}
                  className="rounded-xl bg-slate-200 px-3 py-1 text-xs font-semibold hover:bg-slate-300"
                >
                  Hello Wall
                </button>

                <button
                  type="button"
                  onClick={() => loadExample('beginner_route.rall')}
                  className="rounded-xl bg-slate-200 px-3 py-1 text-xs font-semibold hover:bg-slate-300"
                >
                  Beginner Route
                </button>

                <button
                  type="button"
                  onClick={() => loadExample('multi_route.rall')}
                  className="rounded-xl bg-slate-200 px-3 py-1 text-xs font-semibold hover:bg-slate-300"
                >
                  Multi Route
                </button>

                <button
                  type="button"
                  onClick={() => loadExample('complex_wall.rall')}
                  className="rounded-xl bg-slate-200 px-3 py-1 text-xs font-semibold hover:bg-slate-300"
                >
                  Complex Wall
                </button>

                <button
                  type="button"
                  onClick={() => loadExample('fizzbuzz.rall')}
                  className="rounded-xl bg-purple-200 px-3 py-1 text-xs font-semibold text-purple-900 hover:bg-purple-300"
                >
                  FizzBuzz
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-stone-50 px-3 py-2">
              <div>
                <div className="text-sm font-semibold text-slate-800">
                  Hold rendering
                </div>
                <div className="text-xs text-slate-500">
                  Uses .glb models from public/models/holds when available
                </div>
              </div>

              <button
                type="button"
                onClick={() => setUseRealModels((value) => !value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  useRealModels ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {useRealModels ? 'Real models on' : 'Fallback shapes'}
              </button>
            </div>

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Rall Source
            </label>

            <textarea
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="h-[420px] w-full rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-sm text-slate-100 outline-none"
              spellCheck={false}
            />

            {parsed.error ? (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {parsed.error}
              </div>
            ) : (
              <>
                <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Parsed and interpreted successfully.
                </div>

                <div className="mt-3 rounded-2xl bg-slate-950 p-4 font-mono text-xs text-emerald-300">
                  <div className="mb-2 text-slate-400">Interpreter Output:</div>

                  {parsed.output.map((line, index) => (
                    <div key={index}>{`> ${line}`}</div>
                  ))}
                </div>
              </>
            )}
          </div>

          {parsed.data && <Legend routes={parsed.data.routes || []} />}
        </div>

        <div className="rounded-3xl bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between px-2 pt-2">
            <div>
              <h2 className="text-lg font-semibold">Interactive 3D Wall</h2>
              <p className="text-sm text-slate-600">Drag to rotate, scroll to zoom.</p>
            </div>
          </div>

          <div className="h-[780px] overflow-hidden rounded-[2rem] bg-[#f4eee4]">
            {parsed.data ? (
              <Canvas shadows camera={{ position: [0, 3.8, 15.5], fov: 38 }}>
                <color attach="background" args={['#f4eee4']} />

                <ambientLight intensity={1.15} />

                <directionalLight
                  position={[8, 11, 11]}
                  intensity={1.35}
                  castShadow
                  shadow-mapSize-width={2048}
                  shadow-mapSize-height={2048}
                />

                <directionalLight position={[-8, 8, 8]} intensity={0.45} />

                <spotLight
                  position={[0, 12, 10]}
                  intensity={0.45}
                  angle={0.5}
                  penumbra={0.8}
                  castShadow
                />

                <WallScene data={parsed.data} useRealModels={useRealModels} />

                <OrbitControls
                  makeDefault
                  minDistance={8}
                  maxDistance={24}
                  target={[0, 3.25, 1.05]}
                  maxPolarAngle={Math.PI / 2.05}
                />
              </Canvas>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                Fix the Rall code to render the wall.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}