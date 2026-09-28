/** Type declarations for dist-graph.mjs — consumed by tsc and astro check. */
export interface DistPage {
  path: string;
  /** `/`, `/es/planner/`, `/recipes/rec_001/`, … */
  route: string;
  /** `/_astro/*.js` chunks referenced directly by the HTML. */
  entries: string[];
  /** Entries plus their transitive static imports: the page's initial JS. */
  initial: Set<string>;
}

export interface DistGraph {
  chunks: Map<string, string>;
  text(name: string): string;
  staticImports(name: string): string[];
  dynamicImports(name: string): string[];
  staticClosure(name: string): Set<string>;
  fullClosure(roots: Iterable<string>): Set<string>;
  pages: DistPage[];
  gzipSize(name: string): number;
  find(marker: RegExp): Set<string>;
}

export function walk(dir: string, ext: string): string[];
export function routeOf(distDir: string, htmlPath: string): string;
export function loadDistGraph(distDir: string): DistGraph;
export const MARKERS: { firebase: RegExp; recharts: RegExp };
