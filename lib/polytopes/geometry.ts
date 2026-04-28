/**
 * 4D Platonic Solid Geometry Engine
 *
 * Generates vertex positions and edge connections for polytope-based
 * agent team structures. All geometry is normalized to fit within a
 * sphere of radius ~3 for consistent rendering.
 *
 * Supported structures:
 *   - Tetrahedron (5 nodes: 4 vertices + 1 center) — default team
 *   - Tesseract/Hypercube (16 nodes) — pro team
 *   - Hexacosichoron (120 nodes, 600 tetrahedra) — enterprise fleet
 */

export interface PolytopeGeometry {
  vertices: [number, number, number][];
  edges: [number, number][];
  name: string;
  description: string;
  maxAgents: number;
}

// ── Tetrahedron (5 agents) ──────────────────────────────────────────────────

export function generateTetrahedron(): PolytopeGeometry {
  const r = 2.4;

  // Regular tetrahedron inscribed in a sphere
  const vertices: [number, number, number][] = [
    [0, r, 0],                                           // top
    [r * Math.sqrt(8 / 9), -r / 3, 0],                   // front
    [-r * Math.sqrt(2 / 9), -r / 3, r * Math.sqrt(2 / 3)],  // back-right
    [-r * Math.sqrt(2 / 9), -r / 3, -r * Math.sqrt(2 / 3)], // back-left
    [0, 0, 0],                                           // center (manager)
  ];

  // All outer vertices connected + center-to-all
  const edges: [number, number][] = [
    // Tetrahedron edges
    [0, 1], [0, 2], [0, 3],
    [1, 2], [1, 3], [2, 3],
    // Center to all vertices
    [4, 0], [4, 1], [4, 2], [4, 3],
  ];

  return {
    vertices,
    edges,
    name: 'Tetrahedron',
    description: '5-agent team with central manager',
    maxAgents: 5,
  };
}

// ── Tesseract / Hypercube (16 agents) ───────────────────────────────────────

/**
 * Generate a tesseract (4D hypercube) projected to 3D.
 * The 4th dimension (w) is used for perspective scaling.
 *
 * @param rotationAngle - Rotation angle in the XW plane (radians).
 *                        Animate this for the 4D rotation effect.
 */
export function generateTesseract(rotationAngle = 0): PolytopeGeometry {
  // 16 vertices of a 4D hypercube: all combinations of (-1,+1) in 4 dimensions
  const raw4D: [number, number, number, number][] = [];
  for (let i = 0; i < 16; i++) {
    raw4D.push([
      (i & 1) ? 1 : -1,
      (i & 2) ? 1 : -1,
      (i & 4) ? 1 : -1,
      (i & 8) ? 1 : -1,
    ]);
  }

  // Apply rotation in XW plane
  const cos = Math.cos(rotationAngle);
  const sin = Math.sin(rotationAngle);

  const rotated4D = raw4D.map(([x, y, z, w]) => [
    x * cos - w * sin,
    y,
    z,
    x * sin + w * cos,
  ] as [number, number, number, number]);

  // Perspective project from 4D to 3D
  const projectionDistance = 3;
  const scale = 1.8;

  const vertices: [number, number, number][] = rotated4D.map(([x, y, z, w]) => {
    const s = projectionDistance / (projectionDistance - w);
    return [x * s * scale, y * s * scale, z * s * scale];
  });

  // Edges: connect vertices that differ in exactly one coordinate
  const edges: [number, number][] = [];
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      // XOR to find differing bits — if exactly 1 bit differs, they share an edge
      const diff = i ^ j;
      if (diff === 1 || diff === 2 || diff === 4 || diff === 8) {
        edges.push([i, j]);
      }
    }
  }

  return {
    vertices,
    edges,
    name: 'Tesseract',
    description: '16-agent hypercube fleet',
    maxAgents: 16,
  };
}

// ── Hexacosichoron / 600-cell (120 agents) ──────────────────────────────────

/**
 * Generate a hexacosichoron (120-vertex 4D polytope) projected to 3D.
 * Uses the icosahedral symmetry group to generate vertices.
 *
 * For performance, edges are subsampled — only edges shorter than a
 * threshold are included (~200 edges instead of the full 720).
 */
export function generateHexacosichoron(rotationAngle = 0): PolytopeGeometry {
  const phi = (1 + Math.sqrt(5)) / 2; // golden ratio ≈ 1.618

  // Generate 120 vertices using the permutations of the H4 root system
  const raw4D: [number, number, number, number][] = [];

  // 8 vertices: permutations of (±2, 0, 0, 0)
  for (const sign of [-1, 1]) {
    for (let axis = 0; axis < 4; axis++) {
      const v: [number, number, number, number] = [0, 0, 0, 0];
      v[axis] = sign * 2;
      raw4D.push(v);
    }
  }

  // 16 vertices: (±1, ±1, ±1, ±1)
  for (let i = 0; i < 16; i++) {
    raw4D.push([
      (i & 1) ? 1 : -1,
      (i & 2) ? 1 : -1,
      (i & 4) ? 1 : -1,
      (i & 8) ? 1 : -1,
    ]);
  }

  // 96 vertices: even permutations of (±phi, ±1, ±1/phi, 0)
  const coords = [phi, 1, 1 / phi, 0];
  const evenPerms = [
    [0, 1, 2, 3], [0, 2, 3, 1], [0, 3, 1, 2],
    [1, 0, 3, 2], [1, 2, 0, 3], [1, 3, 2, 0],
    [2, 0, 1, 3], [2, 1, 3, 0], [2, 3, 0, 1],
    [3, 0, 2, 1], [3, 1, 0, 2], [3, 2, 1, 0],
  ];

  for (const perm of evenPerms) {
    for (let signs = 0; signs < 8; signs++) {
      // Only use sign combinations where the number of negatives is even
      const s0 = (signs & 1) ? -1 : 1;
      const s1 = (signs & 2) ? -1 : 1;
      const s2 = (signs & 4) ? -1 : 1;
      const negCount = ((signs & 1) + ((signs >> 1) & 1) + ((signs >> 2) & 1));
      if (negCount % 2 !== 0) continue;

      const v: [number, number, number, number] = [0, 0, 0, 0];
      v[perm[0]] = coords[0] * s0;
      v[perm[1]] = coords[1] * s1;
      v[perm[2]] = coords[2] * s2;
      // perm[3] gets 0
      raw4D.push(v);
    }
  }

  // Deduplicate vertices (floating point tolerance)
  const unique4D: [number, number, number, number][] = [];
  for (const v of raw4D) {
    const isDup = unique4D.some(u =>
      Math.abs(u[0] - v[0]) < 0.01 &&
      Math.abs(u[1] - v[1]) < 0.01 &&
      Math.abs(u[2] - v[2]) < 0.01 &&
      Math.abs(u[3] - v[3]) < 0.01
    );
    if (!isDup) unique4D.push(v);
  }

  // Cap at 120 vertices
  const verts4D = unique4D.slice(0, 120);

  // Apply rotation in XW plane
  const cos = Math.cos(rotationAngle);
  const sin = Math.sin(rotationAngle);

  const rotated = verts4D.map(([x, y, z, w]) => [
    x * cos - w * sin,
    y,
    z,
    x * sin + w * cos,
  ] as [number, number, number, number]);

  // Stereographic projection from 4D to 3D
  const projScale = 1.2;
  const vertices: [number, number, number][] = rotated.map(([x, y, z, w]) => {
    const s = projScale / (3 - w);
    return [x * s, y * s, z * s];
  });

  // Find edges: connect vertices within a threshold distance in 4D
  const edgeThreshold = 2.1; // adjusted to get ~200-300 edges
  const edges: [number, number][] = [];
  for (let i = 0; i < verts4D.length; i++) {
    for (let j = i + 1; j < verts4D.length; j++) {
      const dx = verts4D[i][0] - verts4D[j][0];
      const dy = verts4D[i][1] - verts4D[j][1];
      const dz = verts4D[i][2] - verts4D[j][2];
      const dw = verts4D[i][3] - verts4D[j][3];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
      if (dist < edgeThreshold) {
        edges.push([i, j]);
      }
    }
  }

  return {
    vertices,
    edges,
    name: 'Hexacosichoron',
    description: `${vertices.length}-agent hyperfleet (600-cell)`,
    maxAgents: 120,
  };
}

// ── Utility ─────────────────────────────────────────────────────────────────

export type TeamStructure = 'tetrahedron' | 'tesseract' | 'hexacosichoron';

export function generatePolytope(
  structure: TeamStructure,
  rotationAngle = 0,
): PolytopeGeometry {
  switch (structure) {
    case 'tetrahedron':
      return generateTetrahedron();
    case 'tesseract':
      return generateTesseract(rotationAngle);
    case 'hexacosichoron':
      return generateHexacosichoron(rotationAngle);
  }
}

export const TEAM_STRUCTURES: { id: TeamStructure; name: string; agents: number; tier: string }[] = [
  { id: 'tetrahedron', name: 'Tetrahedron', agents: 5, tier: 'free' },
  { id: 'tesseract', name: 'Tesseract', agents: 16, tier: 'pro' },
  { id: 'hexacosichoron', name: 'Hexacosichoron', agents: 120, tier: 'enterprise' },
];
