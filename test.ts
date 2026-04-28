import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Text } from '@react-three/drei';

const DEFAULT_CODE = `wall MainWall {
  height 15
  width 10
  angle 12
}

route "Easy" on MainWall {
  color "green"
  grade "V1"
  hold "jug" at (1.5, 2.0, 0.35)
  hold "jug" at (2.2, 4.0, 0.35)
  hold "pinch" at (3.0, 6.0, 0.35)
  hold "sloper" at (3.8, 8.5, 0.35)
}

route "Flow" on MainWall {
  color "blue"
  grade "V3"
  hold "crimp" at (5.8, 2.5, 0.35)
  hold "pinch" at (5.1, 4.6, 0.35)
  hold "crimp" at (6.2, 6.8, 0.35)
  hold "sloper" at (5.6, 9.2, 0.35)
}

route "Power" on MainWall {
  color "red"
  grade "V5"
  hold "jug" at (8.0, 2.2, 0.35)
  hold "crimp" at (7.3, 4.3, 0.35)
  hold "pinch" at (8.4, 6.4, 0.35)
  hold "crimp" at (7.8, 9.0, 0.35)
}`;

const COLOR_MAP = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  purple: '#a855f7',
  pink: '#ec4899',
  black: '#111827',
  white: '#f8fafc',
};

function parseCrux(source) {
  const wallMatch = source.match(/wall\s+(\w+)\s*\{([\s\S]*?)\}/);
  if (!wallMatch) {
    throw new Error('Missing wall block. Example: wall MainWall { height 15 width 10 angle 12 }');
  }

  const wallName = wallMatch[1];
  const wallBody = wallMatch[2];
  const height = Number((wallBody.match(/height\s+([\d.]+)/) || [])[1] || 15);
  const width = Number((wallBody.match(/width\s+([\d.]+)/) || [])[1] || 10);
  const angle = Number((wallBody.match(/angle\s+([\d.]+)/) || [])[1] || 0);

  const routeRegex = /route\s+"([^"]+)"\s+on\s+(\w+)\s*\{([\s\S]*?)\}/g;
  const routes = [];
  let routeMatch;

  while ((routeMatch = routeRegex.exec(source)) !== null) {
    const name = routeMatch[1];
    const targetWall = routeMatch[2];
    const body = routeMatch[3];

    if (targetWall !== wallName) continue;

    const colorRaw = ((body.match(/color\s+"([^"]+)"/) || [])[1] || 'orange').toLowerCase();
    const grade = (body.match(/grade\s+"([^"]+)"/) || [])[1] || 'V0';
    const holds = [];
    const holdRegex = /hold\s+"([^"]+)"\s+at\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/g;
    let holdMatch;

    while ((holdMatch = holdRegex.exec(body)) !== null) {
      holds.push({
        type: holdMatch[1].toLowerCase(),
        x: Number(holdMatch[2]),
        y: Number(holdMatch[3]),
        z: Number(holdMatch[4]),
      });
    }

    routes.push({
      name,
      colorName: colorRaw,
      color: COLOR_MAP[colorRaw] || colorRaw,
      grade,
      holds,
    });
  }

  return { wall: { name: wallName, height, width, angle }, routes };
}

function HoldMesh({ type, color, position }) {
  const common = { castShadow: true, receiveShadow: true };

  if (type === 'jug') {
    return (
      <mesh position={position} {...common}>
        <sphereGeometry args={[0.25, 24, 24]} />
        <meshStandardMaterial color={color} />
      </mesh>
    );
  }

  if (type === 'crimp') {
    return (
      <mesh position={position} rotation={[0.2, 0.1, 0]} {...common}>
        <boxGeometry args={[0.45, 0.18, 0.22]} />
        <meshStandardMaterial color={color} />
      </mesh>
    );
  }

  if (type === 'sloper') {
    return (
      <mesh position={position} rotation={[0.6, 0.15, 0]} {...common}>
        <sphereGeometry args={[0.28, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} />
      </mesh>
    );
  }

  if (type === 'pinch') {
    return (
      <mesh position={position} rotation={[0.1, 0.2, 0.5]} {...common}>
        <cylinderGeometry args={[0.12, 0.18, 0.48, 18]} />
        <meshStandardMaterial color={color} />
      </mesh>
    );
  }

  return (
    <mesh position={position} {...common}>
      <dodecahedronGeometry args={[0.22, 0]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function RouteLabels({ wall }) {
  return (
    <Text
      position={[wall.width / 2, wall.height + 0.8, 0.2]}
      fontSize={0.5}
      color="#e5e7eb"
      anchorX="center"
      anchorY="middle"
    >
      {wall.name}
    </Text>
  );
}

function WallScene({ data }) {
  const { wall, routes } = data;
  const wallCenterX = wall.width / 2;
  const wallCenterY = wall.height / 2;
  const angleRad = (-wall.angle * Math.PI) / 180;

  return (
    <group rotation={[angleRad, 0, 0]} position={[-wallCenterX, -wallCenterY, 0]}>
      <mesh receiveShadow position={[wallCenterX, wallCenterY, 0]}>
        <boxGeometry args={[wall.width, wall.height, 0.25]} />
        <meshStandardMaterial color="#d6d3d1" />
      </mesh>

      <gridHelper args={[Math.max(wall.width, wall.height) * 1.2, Math.max(wall.width, wall.height)]} position={[wallCenterX, wallCenterY, -0.2]} />

      {routes.map((route) =>
        route.holds.map((hold, index) => (
          <HoldMesh
            key={`${route.name}-${index}`}
            type={hold.type}
            color={route.color}
            position={[hold.x, hold.y, hold.z]}
          />
        ))
      )}

      <RouteLabels wall={wall} />
    </group>
  );
}

function Legend({ routes }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Routes</h2>
      <div className="mt-3 space-y-2">
        {routes.map((route) => (
          <div key={route.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: route.color }} />
              <div>
                <div className="font-medium text-slate-900">{route.name}</div>
                <div className="text-sm text-slate-500">{route.holds.length} holds</div>
              </div>
            </div>
            <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">{route.grade}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [code, setCode] = useState(DEFAULT_CODE);

  const parsed = useMemo(() => {
    try {
      return { data: parseCrux(code), error: null };
    } catch (error) {
      return { data: null, error: error.message || 'Parse error' };
    }
  }, [code]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-4 p-4 lg:grid-cols-[420px_1fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Crux Wall Designer</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Write Crux-like route code and preview the wall in 3D.
                </p>
              </div>
              <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">Prototype</div>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
              Syntax: <span className="font-mono">wall</span>, <span className="font-mono">route</span>, <span className="font-mono">color</span>, <span className="font-mono">grade</span>, <span className="font-mono">hold</span>, <span className="font-mono">at (x,y,z)</span>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Crux Source</label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-[420px] w-full rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-sm text-slate-100 outline-none"
              spellCheck={false}
            />
            {parsed.error ? (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {parsed.error}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Parsed successfully.
              </div>
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

          <div className="h-[780px] overflow-hidden rounded-3xl bg-slate-900">
            {parsed.data ? (
              <Canvas shadows camera={{ position: [8, 8, 18], fov: 45 }}>
                <color attach="background" args={["#0f172a"]} />
                <ambientLight intensity={1.4} />
                <directionalLight position={[10, 18, 12]} intensity={1.8} castShadow />
                <spotLight position={[0, 20, 15]} intensity={1.2} angle={0.35} penumbra={0.5} castShadow />

                <WallScene data={parsed.data} />

                <Grid
                  args={[40, 40]}
                  cellSize={1}
                  sectionSize={5}
                  fadeDistance={35}
                  fadeStrength={1}
                  position={[0, -7.5, -2]}
                  infiniteGrid
                />
                <OrbitControls makeDefault />
              </Canvas>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-300">Fix the Crux code to render the wall.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
