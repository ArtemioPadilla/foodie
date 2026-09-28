/**
 * Schema reference — turns the Zod schemas in `src/schemas/` into plain data
 * the `/docs/reference/api/` page renders as one table per schema (roadmap
 * Issue 043). The page introspects the live schema objects at build time, so
 * the reference cannot drift from the code: add a field, rebuild, and it shows.
 *
 * Built on Zod 4's `z.toJSONSchema()` (input side, so defaults and transforms
 * read the way a JSON author sees them). A nested schema that is itself an
 * exported `*Schema` is not inlined: it is replaced by a reference to its name
 * so the table says `NutritionInfoSchema` and links to that table.
 *
 * Build-time only — never imported by an island.
 */
import { z } from 'zod';

export interface SchemaField {
  name: string;
  /** Human-readable type, e.g. `string`, `RecipeIngredientSchema[]`, `"easy" | "hard"`. */
  type: string;
  /** Names of exported schemas the type refers to (for links). */
  refs: string[];
  required: boolean;
  /** Constraints such as `min 1`, `format date`, `default "metric"`. */
  constraints: string[];
  description?: string;
}

export type SchemaKind = 'object' | 'enum' | 'array' | 'record' | 'tuple' | 'scalar';

export interface SchemaDoc {
  /** Export name, e.g. `RecipeSchema`. */
  name: string;
  /** Anchor id for the page, e.g. `recipeschema`. */
  anchor: string;
  kind: SchemaKind;
  /** Summary type for non-object schemas (`MealPlanSchema[]`, `Record<string, …>`). */
  type: string;
  refs: string[];
  constraints: string[];
  fields: SchemaField[];
  /** Enum values, when `kind === 'enum'`. */
  values: string[];
  description?: string;
}

export interface SchemaModuleDoc {
  /** Module file name without extension, e.g. `recipe`. */
  module: string;
  schemas: SchemaDoc[];
}

type JsonNode = Record<string, unknown>;

const REF_KEY = 'x-foodie-ref';
/** Patterns longer than this are summarised as "pattern" (Zod's date regexes are huge). */
const MAX_PATTERN_LENGTH = 32;
/** Enums with more values than this are summarised in the type column. */
const MAX_INLINE_ENUM = 6;

/** True for any Zod 4 schema instance. */
export function isZodSchema(value: unknown): value is z.ZodType {
  return typeof value === 'object' && value !== null && '_zod' in value;
}

export function anchorFor(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** Collects every exported `*Schema` of the given modules into instance → name. */
export function collectSchemaNames(modules: Record<string, Record<string, unknown>>): Map<z.ZodType, string> {
  const names = new Map<z.ZodType, string>();
  for (const exports of Object.values(modules)) {
    for (const [name, value] of Object.entries(exports)) {
      if (name.endsWith('Schema') && isZodSchema(value) && !names.has(value)) names.set(value, name);
    }
  }
  return names;
}

function toJson(schema: z.ZodType, names: Map<z.ZodType, string>): JsonNode {
  return z.toJSONSchema(schema, {
    unrepresentable: 'any',
    io: 'input',
    override: (ctx) => {
      const ref = names.get(ctx.zodSchema as unknown as z.ZodType);
      if (!ref || ctx.zodSchema === (schema as unknown)) return;
      const node = ctx.jsonSchema as JsonNode;
      for (const key of Object.keys(node)) delete node[key];
      node[REF_KEY] = ref;
    },
  }) as JsonNode;
}

const quote = (v: unknown) => JSON.stringify(v);

/** Renders a JSON-schema node as a short type expression, collecting schema refs. */
export function typeOf(node: JsonNode | boolean | undefined, refs: Set<string>): string {
  if (node === undefined || node === true) return 'unknown';
  if (node === false) return 'never';
  if (typeof node[REF_KEY] === 'string') {
    refs.add(node[REF_KEY] as string);
    return node[REF_KEY] as string;
  }
  if ('const' in node) return quote(node.const);
  if (Array.isArray(node.enum)) {
    const values = node.enum as unknown[];
    return values.length <= MAX_INLINE_ENUM ? values.map(quote).join(' | ') : `enum (${values.length} values)`;
  }
  const union = (node.anyOf ?? node.oneOf) as JsonNode[] | undefined;
  if (Array.isArray(union)) return union.map((n) => typeOf(n, refs)).join(' | ');
  if (Array.isArray(node.allOf)) return (node.allOf as JsonNode[]).map((n) => typeOf(n, refs)).join(' & ');

  const type = node.type;
  if (Array.isArray(type)) return type.map((t) => typeOf({ ...node, type: t }, refs)).join(' | ');
  switch (type) {
    case 'array': {
      if (Array.isArray(node.prefixItems)) {
        return `[${(node.prefixItems as JsonNode[]).map((n) => typeOf(n, refs)).join(', ')}]`;
      }
      const inner = typeOf(node.items as JsonNode | undefined, refs);
      return inner.includes(' ') ? `(${inner})[]` : `${inner}[]`;
    }
    case 'object': {
      const extra = node.additionalProperties;
      if (extra && typeof extra === 'object' && !node.properties) {
        const key = node.propertyNames ? typeOf(node.propertyNames as JsonNode, refs) : 'string';
        return `Record<${key}, ${typeOf(extra as JsonNode, refs)}>`;
      }
      const props = Object.keys((node.properties as JsonNode | undefined) ?? {});
      return props.length > 0 ? `{ ${props.join(', ')} }` : 'object';
    }
    case 'string':
    case 'number':
    case 'integer':
    case 'boolean':
    case 'null':
      return type;
    default:
      return 'unknown';
  }
}

/** Human-readable constraints of a node (min/max, format, pattern, default). */
export function constraintsOf(node: JsonNode | boolean | undefined): string[] {
  if (!node || typeof node !== 'object') return [];
  const out: string[] = [];
  const pairs: [string, string][] = [
    ['minLength', 'min length'],
    ['maxLength', 'max length'],
    ['minimum', 'min'],
    ['maximum', 'max'],
    ['exclusiveMinimum', '>'],
    ['exclusiveMaximum', '<'],
    ['minItems', 'min items'],
    ['maxItems', 'max items'],
  ];
  for (const [key, label] of pairs) {
    const value = node[key];
    // `.int()` adds ±MAX_SAFE_INTEGER bounds — noise, not a documented limit.
    if (typeof value === 'number' && Math.abs(value) !== Number.MAX_SAFE_INTEGER) out.push(`${label} ${value}`);
  }
  if (typeof node.format === 'string') out.push(`format ${node.format}`);
  if (typeof node.pattern === 'string') {
    out.push(node.pattern.length <= MAX_PATTERN_LENGTH ? `pattern ${node.pattern}` : 'pattern');
  }
  if ('default' in node) out.push(`default ${quote(node.default)}`);
  if (Array.isArray(node.enum) && node.enum.length > MAX_INLINE_ENUM) {
    out.push(`one of ${(node.enum as unknown[]).map(quote).join(', ')}`);
  }
  return out;
}

function kindOf(node: JsonNode): SchemaKind {
  if (Array.isArray(node.enum)) return 'enum';
  if (node.type === 'array') return Array.isArray(node.prefixItems) ? 'tuple' : 'array';
  if (node.type === 'object') return node.properties ? 'object' : 'record';
  return 'scalar';
}

/** Describes one exported schema. */
export function describeSchema(name: string, schema: z.ZodType, names: Map<z.ZodType, string>): SchemaDoc {
  const node = toJson(schema, names);
  const kind = kindOf(node);
  const refs = new Set<string>();
  const required = new Set((node.required as string[] | undefined) ?? []);
  const fields: SchemaField[] =
    kind === 'object'
      ? Object.entries(node.properties as Record<string, JsonNode>).map(([field, child]) => {
          const fieldRefs = new Set<string>();
          const type = typeOf(child, fieldRefs);
          fieldRefs.forEach((r) => refs.add(r));
          return {
            name: field,
            type,
            refs: [...fieldRefs],
            required: required.has(field),
            constraints: constraintsOf(child),
            description: typeof child.description === 'string' ? child.description : undefined,
          };
        })
      : [];
  const type = kind === 'object' ? 'object' : typeOf(node, refs);
  return {
    name,
    anchor: anchorFor(name),
    kind,
    type,
    refs: [...refs],
    constraints: kind === 'object' ? [] : constraintsOf(node),
    fields,
    values: kind === 'enum' ? (node.enum as unknown[]).map(String) : [],
    description: typeof node.description === 'string' ? node.description : undefined,
  };
}

/**
 * Describes every module: `modules` maps a path (`…/schemas/recipe.ts`) to its
 * exports, as `import.meta.glob(…, { eager: true })` returns them. Only exports
 * named `*Schema` are documented; modules without any are dropped.
 */
export function describeModules(modules: Record<string, Record<string, unknown>>): SchemaModuleDoc[] {
  const moduleName = (path: string) => path.replace(/^.*\//, '').replace(/\.ts$/, '');
  // The barrel re-exports everything; documenting it would duplicate each schema.
  const own = Object.fromEntries(Object.entries(modules).filter(([path]) => moduleName(path) !== 'index'));
  const names = collectSchemaNames(own);
  return Object.entries(own)
    .map(([path, exports]) => ({
      module: moduleName(path),
      schemas: Object.entries(exports)
        .filter(([name, value]) => name.endsWith('Schema') && isZodSchema(value) && names.get(value) === name)
        .map(([name, value]) => describeSchema(name, value as z.ZodType, names)),
    }))
    .filter((m) => m.schemas.length > 0)
    .sort((a, b) => a.module.localeCompare(b.module));
}
