// China administrative divisions (province/city/district) with centroid
// coordinates from Ali DataV GeoJSON. Server-side only; the client fetches
// children incrementally via /api/myfate/china-areas.

import raw from "../data/china-areas.json";

type AreaNode = { code: string; name: string; center: [number, number] | null; children: AreaNode[] };

const tree: AreaNode = raw as unknown as AreaNode;

export type AreaOption = { code: string; name: string };

function findArea(code: string, node: AreaNode): AreaNode | null {
  if (node.code === code) return node;
  for (const child of node.children) {
    const found = findArea(code, child);
    if (found) return found;
  }
  return null;
}

export function getAreaChildren(code?: string | null): AreaOption[] {
  if (!code || code === "100000") return tree.children.map((node) => ({ code: node.code, name: node.name }));
  const node = findArea(code, tree);
  if (!node) return [];
  if (!node.children.length && node.center) return []; // leaf
  return node.children.map((node) => ({ code: node.code, name: node.name }));
}

export type ResolvedArea = {
  code: string;
  path: string[];
  lat: number;
  lon: number;
};

export function resolveArea(code: string): ResolvedArea | null {
  const path: AreaNode[] = [];
  const walk = (node: AreaNode): AreaNode | null => {
    path.push(node);
    if (node.code === code) return node;
    for (const child of node.children) {
      const found = walk(child);
      if (found) return found;
    }
    path.pop();
    return null;
  };
  const node = walk(tree);
  if (!node) return null;
  // Fall back up the path for a centroid when a mid-level node lacks one.
  let center: [number, number] | null = node.center;
  for (let index = path.length - 1; index >= 0 && !center; index -= 1) {
    center = path[index].center;
  }
  if (!center) return null;
  return { code: node.code, path: path.slice(1).map((item) => item.name), lat: center[1], lon: center[0] };
}
