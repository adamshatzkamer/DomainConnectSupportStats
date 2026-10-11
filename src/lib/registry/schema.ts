/**
 * Field labels and the feature list from the vendored registry schema
 * (contract/registry/schema/provider.schema.json), bundled at build time.
 */
import schema from '../../../contract/registry/schema/provider.schema.json';

interface Node {
  title?: string;
  description?: string;
  $ref?: string;
  type?: string | string[];
  properties?: Record<string, Node>;
  items?: Node;
}

const ROOT = schema as unknown as Node & { $defs: Record<string, Node> };
const FLAG = '#/$defs/flag';

/** The node with its `$ref` target merged in; the node's own title and description win. */
function deref(node: Node): Node {
  const target = node.$ref?.startsWith('#/$defs/')
    ? ROOT.$defs[node.$ref.slice('#/$defs/'.length)]
    : undefined;
  return target ? { ...target, ...node } : node;
}

function nodeAt(path: string): Node | undefined {
  let node: Node | undefined = ROOT;
  for (const key of path.split('.')) {
    if (!node) return undefined;
    node = deref(node);
    if (node.items) node = deref(node.items);
    node = node.properties?.[key];
  }
  return node && deref(node);
}

export interface Label {
  title: string;
  description: string | null;
}

/** Title and description of the field at dotted path `path`, e.g. `onboarding.cost`. */
export function label(path: string): Label {
  const node = nodeAt(path);
  return {
    title: node?.title ?? path.slice(path.lastIndexOf('.') + 1),
    description: node?.description ?? null,
  };
}

export interface Feature extends Label {
  /** Dotted path under `features`. */
  key: string;
  /** A list of `{key, description}` (empty = none) instead of a flag. */
  list: boolean;
}

export interface FeatureGroup extends Label {
  /** Key under `features`; null for the flags directly under `features`. */
  key: string | null;
  features: Feature[];
}

function isFlag(node: Node): boolean {
  return node.$ref === FLAG;
}

function isList(node: Node): boolean {
  return node.type === 'array' && node.items?.properties?.key !== undefined;
}

function feature(key: string, node: Node): Feature[] {
  if (!isFlag(node) && !isList(node)) return [];
  return [{ key, list: isList(node), ...label(`features.${key}`) }];
}

/** Features in schema order: the flags directly under `features` first, then one group per object. */
export const FEATURE_GROUPS: FeatureGroup[] = (() => {
  const top = Object.entries(nodeAt('features')?.properties ?? {});
  const groups: FeatureGroup[] = [
    {
      key: null,
      title: label('features').title,
      description: null,
      features: top.flatMap(([key, node]) => feature(key, node)),
    },
  ];
  for (const [group, node] of top) {
    if (node.type !== 'object') continue;
    groups.push({
      key: group,
      ...label(`features.${group}`),
      features: Object.entries(node.properties ?? {}).flatMap(([key, child]) =>
        feature(`${group}.${key}`, child),
      ),
    });
  }
  return groups.filter((g) => g.features.length > 0);
})();

export const FEATURES: Feature[] = FEATURE_GROUPS.flatMap((g) => g.features);
