import { useState, useCallback } from "react";
import { buildWfsUrl } from "@/lib/layers";

interface GeoJSONFeature {
  type: "Feature";
  id: string;
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][] | number[][][][];
  };
  properties: Record<string, unknown>;
}

interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
  totalFeatures?: number;
}

interface WfsState {
  data: GeoJSONCollection | null;
  loading: boolean;
  error: string | null;
}

const cache = new Map<string, GeoJSONCollection>();

export function useWfsData() {
  const [state, setState] = useState<WfsState>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchLayer = useCallback(async (layerName: string, maxFeatures = 500) => {
    // Check cache first
    const cacheKey = `${layerName}_${maxFeatures}`;
    if (cache.has(cacheKey)) {
      setState({ data: cache.get(cacheKey)!, loading: false, error: null });
      return cache.get(cacheKey)!;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const url = buildWfsUrl(layerName, maxFeatures);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`WFS request failed: ${response.status}`);
      }
      const data: GeoJSONCollection = await response.json();
      cache.set(cacheKey, data);
      setState({ data, loading: false, error: null });
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Onbekende fout";
      setState({ data: null, loading: false, error: message });
      return null;
    }
  }, []);

  return { ...state, fetchLayer };
}

export function clearWfsCache() {
  cache.clear();
}
