/**
 * DAG (Directed Acyclic Graph) resolver for inter-component dependencies.
 *
 * Financial components (income, expenses, assets, liabilities, taxes, credit)
 * are nodes in a dependency graph. This module resolves activation order
 * via topological sort and detects cycles.
 */

export interface DAGNode {
  id: string;
  dependsOn: string[];
}

/**
 * Topologically sorts a set of DAG nodes using Kahn's algorithm.
 * Throws if a cycle is detected (non-compliant per spec).
 *
 * @returns Ordered list of node IDs in safe execution order
 */
export function topologicalSort(nodes: DAGNode[]): string[] {
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize
  for (const node of nodes) {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  // Build adjacency + in-degree counts
  for (const node of nodes) {
    for (const dep of node.dependsOn) {
      if (!graph.has(dep)) {
        throw new Error(`DAG error: node "${node.id}" depends on unknown node "${dep}"`);
      }
      graph.get(dep)!.push(node.id);
      inDegree.set(node.id, (inDegree.get(node.id) ?? 0) + 1);
    }
  }

  // Seed queue with zero in-degree nodes
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  // Sort deterministically (alphabetical tie-breaking for bit-exact order)
  queue.sort();

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighbor of graph.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        // Insert in sorted position for determinism
        const insertIdx = queue.findIndex((q) => q > neighbor);
        if (insertIdx === -1) {
          queue.push(neighbor);
        } else {
          queue.splice(insertIdx, 0, neighbor);
        }
      }
    }
  }

  if (sorted.length !== nodes.length) {
    const missing = nodes.filter((n) => !sorted.includes(n.id)).map((n) => n.id);
    throw new Error(`DAG cycle detected involving nodes: ${missing.join(', ')}`);
  }

  return sorted;
}
