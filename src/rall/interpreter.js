export function interpretRall(ast) {
  const routes = ast.routes.map((route) => {
    if (!route.isLoop) {
      return route;
    }

    const holds = [];

    const columns = 10;
    const spacingX = 0.85;
    const spacingY = 1.45;
    const startX = 1.0;
    const startY = 1.2;

    for (let i = route.loop.start; i <= route.loop.end; i += 1) {
      let type = 'jug';
      let color = '#9ca3af';

      if (i % 15 === 0) {
        type = 'sloper';
        color = '#8b5cf6';
      } else if (i % 3 === 0) {
        type = 'crimp';
        color = '#3f7fe8';
      } else if (i % 5 === 0) {
        type = 'pinch';
        color = '#e85a3d';
      }

      const x = startX + ((i - 1) % columns) * spacingX;
      const y = startY + Math.floor((i - 1) / columns) * spacingY;

      holds.push({
        type,
        x,
        y,
        z: 0.24,
        color,
        label: i,
      });
    }

    return {
      ...route,
      name: route.name || 'Generated Loop Route',
      color: '#6b7280',
      grade: 'Loop',
      holds,
    };
  });

  const scene = {
    ...ast,
    routes,
  };

  const totalHolds = routes.reduce((sum, route) => sum + route.holds.length, 0);
  const loopRoutes = routes.filter((route) => route.isLoop).length;

  return {
    scene,
    output: [
      'Rall Interpreter Started',
      `Created wall: ${ast.wall.name}`,
      `Wall dimensions: ${ast.wall.width} wide x ${ast.wall.height} high`,
      `Wall angle: ${ast.wall.angle} degrees`,
      `Loaded routes: ${routes.length}`,
      `Executed loops: ${loopRoutes}`,
      `Placed holds: ${totalHolds}`,
      '3D scene generated successfully',
    ],
  };
}