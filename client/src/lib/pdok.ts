export type PdokGeometry =
  | { type: "Point"; coordinates: [number, number] }
  | { type: "MultiPoint"; coordinates: [number, number][] }
  | { type: "LineString"; coordinates: [number, number][] }
  | { type: "MultiLineString"; coordinates: [number, number][][] }
  | { type: "Polygon"; coordinates: [number, number][][] }
  | { type: "MultiPolygon"; coordinates: [number, number][][][] }
  | { type: "GeometryCollection"; geometries: PdokGeometry[] };

export interface PdokFeature {
  type: "Feature";
  geometry: PdokGeometry | null;
  properties: Record<string, unknown>;
  id?: string | number;
}

export interface PdokFeatureCollection {
  type: "FeatureCollection";
  features: PdokFeature[];
}

export interface PdokCatalogCollection {
  apiTitle: string;
  id: string;
  title: string;
  description: string;
  itemsUrl: string;
}

export interface PdokTileSource {
  templateUrl: string;
  minZoom: number;
  maxZoom: number;
  tileSize: number;
}

export const PDOK_API_ROOTS: string[] = [
  "https://api.pdok.nl/kadaster/bag/ogc/v2",
  "https://api.pdok.nl/kadaster/brk-administratieve-eenheden/ogc/v1",
  "https://api.pdok.nl/kadaster/brt-achtergrondkaart/ogc/v1",
  "https://api.pdok.nl/brt/top10nl/ogc/v1",
  "https://api.pdok.nl/kadaster/3d-basisvoorziening/ogc/v1",
  "https://api.pdok.nl/kadaster/3d-geluid/ogc/v1",
  "https://api.pdok.nl/kadaster/bag-terugmeldingen/ogc/v1",
  "https://api.pdok.nl/kadaster/bgt-terugmeldingen/ogc/v1",
  "https://api.pdok.nl/kadaster/brt-terugmeldingen/ogc/v1",
  "https://api.pdok.nl/rvo/gewaspercelen/ogc/v1",
];

const PDOK_LANDING_PAGE = "https://api.pdok.nl/";

function to4326Bbox(bounds: google.maps.LatLngBounds): [number, number, number, number] {
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  return [southWest.lng(), southWest.lat(), northEast.lng(), northEast.lat()];
}

export function getMapBbox(map: google.maps.Map): [number, number, number, number] | null {
  const bounds = map.getBounds();
  if (!bounds) return null;
  return to4326Bbox(bounds);
}

export async function fetchPdokFeatures(
  collectionUrl: string,
  options?: {
    limit?: number;
    bbox?: [number, number, number, number];
  }
): Promise<PdokFeatureCollection> {
  const params = new URLSearchParams({
    f: "json",
    limit: String(options?.limit ?? 500),
  });
  if (options?.bbox) {
    params.set("bbox", options.bbox.join(","));
  }

  const response = await fetch(`${collectionUrl}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`PDOK request failed (${response.status})`);
  }
  const json = await response.json();

  if (!json || json.type !== "FeatureCollection" || !Array.isArray(json.features)) {
    throw new Error("PDOK response is not a valid FeatureCollection");
  }

  return {
    type: "FeatureCollection",
    features: json.features.map(normalizeFeature),
  };
}

function normalizeFeature(feature: {
  geometry?: PdokGeometry | null;
  properties?: Record<string, unknown> | null;
  id?: string | number;
}): PdokFeature {
  return {
    type: "Feature",
    geometry: feature.geometry ?? null,
    properties: feature.properties ?? {},
    id: feature.id,
  };
}

function normalizeApiRoot(apiRoot: string): string {
  return apiRoot.replace(/\/+$/, "");
}

export async function fetchPdokCollections(apiRoot: string): Promise<PdokCatalogCollection[]> {
  const normalized = normalizeApiRoot(apiRoot);
  const response = await fetch(`${normalized}/collections?f=json`);
  if (!response.ok) {
    throw new Error(`PDOK collections request failed (${response.status})`);
  }

  const json = (await response.json()) as {
    title?: string;
    collections?: Array<{
      id?: string;
      title?: string;
      description?: string;
      links?: Array<{ rel?: string; href?: string; type?: string }>;
    }>;
  };

  const apiTitle = json.title || normalized;
  const collections = Array.isArray(json.collections) ? json.collections : [];

  return collections
    .filter((collection): collection is { id: string; title?: string; description?: string; links?: Array<{ rel?: string; href?: string; type?: string }> } => Boolean(collection?.id))
    .map((collection) => {
      const linkedItemsUrl =
        collection.links?.find((link) => link.rel === "items")?.href ||
        collection.links?.find((link) => link.rel === "http://www.opengis.net/def/rel/ogc/1.0/items")?.href;
      const itemsUrl = linkedItemsUrl || `${normalized}/collections/${collection.id}/items`;

      return {
        apiTitle,
        id: collection.id,
        title: collection.title || collection.id,
        description: collection.description || "",
        itemsUrl,
      };
    });
}

export async function loadPdokCatalog(apiRoots = PDOK_API_ROOTS): Promise<PdokCatalogCollection[]> {
  const discoveredRoots = await discoverPdokApiRootsFromLanding();
  const uniqueRoots = Array.from(new Set([...apiRoots, ...discoveredRoots]));
  const settled = await Promise.allSettled(uniqueRoots.map((root) => fetchPdokCollections(root)));
  const allCollections: PdokCatalogCollection[] = [];

  for (const result of settled) {
    if (result.status === "fulfilled") {
      allCollections.push(...result.value);
    }
  }

  const seen = new Set<string>();
  return allCollections.filter((collection) => {
    const key = `${collection.apiTitle}::${collection.id}::${collection.itemsUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchPdokTileSource(tilesUrl: string): Promise<PdokTileSource | null> {
  const normalized = tilesUrl.replace(/\/+$/, "");
  try {
    const response = await fetch(`${normalized}?f=json`);
    if (!response.ok) return null;
    const json = await response.json();

    const links = extractTileLinks(json);
    const template = links.find((href) => /\{tile(matrix|row|col)\}/i.test(href)) || links[0];
    if (!template) return null;

    const absTemplate = toAbsoluteUrl(normalized, template)
      .replace(/\{tilematrix\}/gi, "{z}")
      .replace(/\{tilerow\}/gi, "{y}")
      .replace(/\{tilecol\}/gi, "{x}");

    return {
      templateUrl: absTemplate,
      minZoom: 0,
      maxZoom: 22,
      tileSize: 256,
    };
  } catch {
    return null;
  }
}

function extractTileLinks(payload: any): string[] {
  const candidates: string[] = [];
  const inspectLinks = (links: any[] | undefined) => {
    if (!Array.isArray(links)) return;
    for (const link of links) {
      const href = typeof link?.href === "string" ? link.href : "";
      const rel = typeof link?.rel === "string" ? link.rel : "";
      const type = typeof link?.type === "string" ? link.type : "";
      if (!href) continue;
      if (rel === "item" || rel.includes("tiles") || type.startsWith("image/") || type.includes("mapbox")) {
        candidates.push(href);
      }
    }
  };

  inspectLinks(payload?.links);
  if (Array.isArray(payload?.tilesets)) {
    for (const tileset of payload.tilesets) inspectLinks(tileset?.links);
  }
  return Array.from(new Set(candidates));
}

function toAbsoluteUrl(base: string, href: string): string {
  try {
    return new URL(href, `${base}/`).toString();
  } catch {
    return href;
  }
}

async function discoverPdokApiRootsFromLanding(): Promise<string[]> {
  try {
    const response = await fetch(PDOK_LANDING_PAGE);
    if (!response.ok) return [];
    const html = await response.text();

    const matches = html.match(/https:\/\/api\.pdok\.nl\/[a-z0-9-_/]+\/ogc\/v\d+\/?/gi) || [];
    return Array.from(new Set(matches.map((match) => match.replace(/\/+$/, ""))));
  } catch {
    return [];
  }
}

