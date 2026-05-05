import React, { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, useGLTF } from '@react-three/drei';
import { DEFAULT_CODE } from './rall/samples';
import { parseRall } from './rall/parser';
import { interpretRall } from './rall/interpreter';

const HOLD_MODEL_PATHS = {
  jug: '/rall/models/holds/jug.glb',
  crimp: '/rall/models/holds/crimp.glb',
  sloper: '/rall/models/holds/sloper.glb',
  pinch: '/rall/models/holds/pinch.glb',
};

function PrimitiveHold({ type, color, position }) {
  const materialProps = { color, roughness: 0.82, metalness: 0.03 };
  const common = { castShadow: true, receiveShadow: true, position };

  if (type === 'jug') {
    return (
      <mesh {...common} rotation={[0.2, -0.3, 0.1]}>
        <sphereGeometry args={[0.24, 28, 28]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  if (type === 'crimp') {
    return (
      <mesh {...common} rotation={[0.15, 0.12, 0.1]}>
        <boxGeometry args={[0.42, 0.16, 0.18]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  if (type === 'sloper') {
    return (
      <mesh {...common} rotation={[0.75, 0.2, 0]}>
        <sphereGeometry args={[0.3, 28, 28, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  if (type === 'pinch') {
    return (
      <mesh {...common} rotation={[0.2, 0.3, 0.55]}>
        <cylinderGeometry args={[0.12, 0.18, 0.46, 22]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    );
  }

  return (
    <mesh {...common}>
      <dodecahedronGeometry args={[0.22, 0]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  );
}

function HoldModel({ type, color, position }) {
  const { scene } = useGLTF(HOLD_MODEL_PATHS[type]);
  const model = useMemo(() => scene.clone(), [scene]);

  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      if (child.material) {
        child.material = child.material.clone();
        child.material.color.set(color);
        child.material.roughness = 0.85;
        child.material.metalness = 0.03;
      }
    }
  });

  const rotationMap = {
    jug: [0.2, -0.3, 0.1],
    crimp: [0.15, 0.12, 0.1],
    sloper: [0.75, 0.2, 0],
    pinch: [0.2, 0.3, 0.55],
  };

  const scaleMap = {
    jug: 0.01,
    crimp: 0.5,
    sloper: 0.01,
    pinch: 0.5,
  };

  return (
    <primitive
      object={model}
      position={position}
      rotation={rotationMap[type] || [0, 0, 0]}
      scale={scaleMap[type] || 0.02}
    />
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

useGLTF.preload('/models/holds/jug.glb');
useGLTF.preload('/models/holds/crimp.glb');
useGLTF.preload('/models/holds/sloper.glb');
useGLTF.preload('/models/holds/pinch.glb');

function RouteLabels({ wall }) {
  return (
    <Text position={[wall.width / 2, wall.height + 2.0, 0.35]} fontSize={0.48} color="#4b5563" anchorX="center" anchorY="middle">
      {wall.name}
    </Text>
  );
}

function PanelBoltHoles({ width, height, spacingX = 0.78, spacingY = 0.78, z = 0.155, offsetX = 0, offsetY = 0 }) {
  const holes = [];

  for (let x = 0.5; x <= width - 0.5; x += spacingX) {
    for (let y = 0.5; y <= height - 0.5; y += spacingY) {
      holes.push(
        <mesh key={`${offsetX + x}-${offsetY + y}`} position={[offsetX + x, offsetY + y, z]}>
          <cylinderGeometry args={[0.028, 0.028, 0.025, 12]} />
          <meshStandardMaterial color="#8e8a84" roughness={1} metalness={0} />
        </mesh>
      );
    }
  }

  return <>{holes}</>;
}

function FrontPanels({ wall }) {
  return (
    <group>
      <mesh
        receiveShadow
        castShadow
        position={[wall.width / 2, wall.height / 2, 0]}
      >
        <boxGeometry args={[wall.width, wall.height, 0.3]} />
        <meshStandardMaterial
          color="#d8d4ce"
          roughness={0.98}
          metalness={0.01}
        />
      </mesh>

      <PanelBoltHoles width={wall.width} height={wall.height} />
    </group>
  );
}
function LeftWing({ wall }) {
  const width = 2.9;
  const height = wall.height - 1.4;

  return (
    <group position={[-1.55, 0.7, -0.95]} rotation={[0, 0.24, 0]}>
      <mesh receiveShadow castShadow position={[width / 2, height / 2, 0]}>
        <boxGeometry args={[width, height, 0.3]} />
        <meshStandardMaterial color="#d7d3cd" roughness={0.98} metalness={0.01} />
      </mesh>
      <PanelBoltHoles width={width} height={height} />
    </group>
  );
}

function RightWing({ wall }) {
  const width = 3.2;
  const height = wall.height - 1.0;

  return (
    <group position={[wall.width + 1.6, 0.5, -1.05]} rotation={[0, -0.35, 0]}>
      <mesh receiveShadow castShadow position={[width / 2, height / 2, 0]}>
        <boxGeometry args={[width, height, 0.3]} />
        <meshStandardMaterial color="#d7d2cb" roughness={0.98} metalness={0.01} />
      </mesh>
      <PanelBoltHoles width={width} height={height} />
    </group>
  );
}

function TopOverhang({ wall }) {
  const width = wall.width * 0.46;
  const height = 2.3;

  return (
    <group position={[wall.width * 0.35, wall.height - 0.3, -0.85]} rotation={[0.32, 0, 0]}>
      <mesh receiveShadow castShadow position={[width / 2, height / 2, 0]}>
        <boxGeometry args={[width, height, 0.3]} />
        <meshStandardMaterial color="#d3cfc8" roughness={0.98} metalness={0.01} />
      </mesh>
      <PanelBoltHoles width={width} height={height} />
    </group>
  );
}

function Volumes() {
  const volumeMaterial = { color: '#aaa39a', roughness: 0.95, metalness: 0.01 };

  return (
    <group>
      <mesh receiveShadow castShadow position={[1.6, 6.0, 0.7]} rotation={[0.1, 0.35, 0]}>
        <coneGeometry args={[0.65, 2.2, 4]} />
        <meshStandardMaterial {...volumeMaterial} />
      </mesh>

      <mesh receiveShadow castShadow position={[4.7, 2.7, 0.62]} rotation={[0.25, -0.6, 0.22]}>
        <boxGeometry args={[1.25, 0.95, 0.95]} />
        <meshStandardMaterial {...volumeMaterial} />
      </mesh>

      <mesh receiveShadow castShadow position={[6.3, 7.0, 0.8]} rotation={[0.45, 0.15, 0.08]}>
        <coneGeometry args={[0.82, 1.7, 3]} />
        <meshStandardMaterial {...volumeMaterial} />
      </mesh>

      <mesh receiveShadow castShadow position={[8.2, 4.9, 0.74]} rotation={[0.18, 0.52, 0.1]}>
        <coneGeometry args={[0.72, 1.9, 4]} />
        <meshStandardMaterial {...volumeMaterial} />
      </mesh>
    </group>
  );
}

function FloorPads({ wall }) {
  const totalWidth = wall.width + 8;
  const padCount = 4;
  const padWidth = totalWidth / padCount;
  const pads = [];

  for (let i = 0; i < padCount; i += 1) {
    pads.push(
      <mesh key={i} receiveShadow castShadow position={[wall.width / 2 - totalWidth / 2 + padWidth / 2 + i * padWidth, -1.42, 1.05]}>
        <boxGeometry args={[padWidth - 0.05, 1.05, 6.2]} />
        <meshStandardMaterial color="#7b7c80" roughness={0.92} metalness={0.01} />
      </mesh>
    );
  }

  return <>{pads}</>;
}

function FloorBase({ wall }) {
  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[wall.width / 2, -2.0, 0]}>
        <planeGeometry args={[50, 30]} />
        <meshStandardMaterial color="#eee8de" roughness={1} metalness={0} />
      </mesh>

      <FloorPads wall={wall} />
    </>
  );
}

function WallScene({ data, useRealModels }) {
  const { wall, routes } = data;
  const wallCenterX = wall.width / 2;
  const angleRad = (-wall.angle * Math.PI) / 180;

  return (
    <group rotation={[angleRad, 0, 0]} position={[-wallCenterX, -7.4, 0]}>
      <FloorBase wall={wall} />
      <LeftWing wall={wall} />
      <RightWing wall={wall} />
      <TopOverhang wall={wall} />
      <FrontPanels wall={wall} />
      <Volumes />

      {routes.map((route) =>
        route.holds.map((hold, index) => (
          <HoldMesh
            key={`${route.name}-${index}`}
            type={hold.type}
            color={hold.color || route.color}
            position={[hold.x, hold.y, hold.z]}
            useRealModels={useRealModels}
          />
        ))
      )}

      <RouteLabels wall={wall} />
    </group>
  );
}

function Legend({ routes }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Routes</h2>

      <div className="mt-3 space-y-2">
        {routes.map((route) => (
          <div key={route.name} className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 rounded-full border border-stone-300" style={{ backgroundColor: route.color }} />
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
      const response = await fetch(`/examples/${fileName}`);

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
              <div className="mb-2 text-sm font-semibold text-slate-700">Load Example Programs</div>

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
                <div className="text-sm font-semibold text-slate-800">Hold rendering</div>
                <div className="text-xs text-slate-500">Uses .glb models from public/models/holds when available</div>
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

            <label className="mb-2 block text-sm font-semibold text-slate-700">Rall Source</label>

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

          {parsed.data && <Legend routes={parsed.data.routes} />}
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
              <Canvas shadows camera={{ position: [8.5, 5.8, 22], fov: 28 }}>
                <color attach="background" args={['#f4eee4']} />
                <ambientLight intensity={1.15} />

                <directionalLight
                  position={[12, 18, 14]}
                  intensity={1.35}
                  castShadow
                  shadow-mapSize-width={2048}
                  shadow-mapSize-height={2048}
                />

                <directionalLight position={[-8, 10, 8]} intensity={0.45} />

                <spotLight position={[0, 20, 18]} intensity={0.55} angle={0.45} penumbra={0.8} castShadow />

                <WallScene data={parsed.data} useRealModels={useRealModels} />

                <OrbitControls
                  makeDefault
                  minDistance={12}
                  maxDistance={32}
                  target={[0, 0.5, 0]}
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