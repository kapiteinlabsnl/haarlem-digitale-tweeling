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

