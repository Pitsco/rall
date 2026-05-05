const COLOR_MAP = {
  red: '#e85a3d',
  blue: '#3f7fe8',
  green: '#4fa65a',
  yellow: '#d6ae2b',
  orange: '#e67e22',
  purple: '#8b5cf6',
  pink: '#ec4899',
  black: '#222222',
  white: '#f8f7f4',
};

export function parseRall(source) {
  const wallMatch = source.match(/wall\s+(\w+)\s*\{([\s\S]*?)\}/);
  if (!wallMatch) {
    throw new Error('Missing wall block. Example: wall MainWall { height 15 width 10 angle 8 }');
  }

  const wallName = wallMatch[1];
  const wallBody = wallMatch[2];
  const height = Number((wallBody.match(/height\s+([\d.]+)/) || [])[1] || 15);
  const width = Number((wallBody.match(/width\s+([\d.]+)/) || [])[1] || 10);
  const angle = Number((wallBody.match(/angle\s+([\d.]+)/) || [])[1] || 0);

  const routeRegex = /route\s+"([^"]+)"\s+on\s+(\w+)\s*\{([\s\S]*?)\}/g;
  const routes = [];
  let routeMatch;
  const loopRegex = /for\s+(\w+)\s+from\s+(\d+)\s+to\s+(\d+)\s*\{([\s\S]*?)\}/g;

let loopMatch;

  while ((loopMatch = loopRegex.exec(source)) !== null) {
    routes.push({
      name: "Generated Loop Route",
      isLoop: true,
      loop: {
        varName: loopMatch[1],
        start: Number(loopMatch[2]),
        end: Number(loopMatch[3]),
        body: loopMatch[4],
      },
      holds: [],
      color: "#888",
      grade: "Loop",
    });
  }
  while ((routeMatch = routeRegex.exec(source)) !== null) {
    const name = routeMatch[1];
    const targetWall = routeMatch[2];
    const body = routeMatch[3];

    if (targetWall !== wallName) continue;

    const colorRaw = ((body.match(/color\s+"([^"]+)"/) || [])[1] || 'orange').toLowerCase();
    const grade = (body.match(/grade\s+"([^"]+)"/) || [])[1] || 'V0';
    const holds = [];
    const holdRegex = /hold\s+"([^"]+)"\s+at\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/g;
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
