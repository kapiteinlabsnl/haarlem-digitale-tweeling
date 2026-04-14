/*
 * Design: "Haarlem Rood" — Full-screen map with collapsible layer sidebar
 * Replicates Alkmaar's /twin page layout
 */

import { Header } from "@/components/Header";
import { MapView } from "@/components/Map";
import { themes, HAARLEM_CENTER, DEFAULT_ZOOM, buildWfsUrl } from "@/lib/layers";
import type { LayerConfig } from "@/lib/layers";
import { fetchPdokFeatures, fetchPdokTileSource, getMapBbox, loadPdokCatalog } from "@/lib/pdok";
import type { PdokFeature, PdokGeometry } from "@/lib/pdok";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import {
  ChevronDown,
  ChevronRight,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  CloudSun,
  Zap,
  Trees,
  Building,
  MapPin,
  Route,
  Landmark,
  Info,
  X,
  Layers,
  Download,
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  "cloud-sun": <CloudSun className="w-4 h-4" />,
  "zap": <Zap className="w-4 h-4" />,
  "trees": <Trees className="w-4 h-4" />,
  "building": <Building className="w-4 h-4" />,
  "map-pin": <MapPin className="w-4 h-4" />,
  "road": <Route className="w-4 h-4" />,
  "landmark": <Landmark className="w-4 h-4" />,
};

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function createMarkerSvg(color: string) {
  const { r, g, b } = hexToRgb(color);
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="rgb(${r},${g},${b})"/><circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/></svg>`)}`;
}

function getGeometryCoordinates(geometry: PdokGeometry | null | undefined): [number, number][] {
  if (!geometry) return [];

  if (geometry.type === "Point") return [geometry.coordinates as [number, number]];
  if (geometry.type === "MultiPoint" || geometry.type === "LineString") {
    return geometry.coordinates as [number, number][];
  }
  if (geometry.type === "MultiLineString" || geometry.type === "Polygon") {
    return (geometry.coordinates as [number, number][][]).flat();
  }
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as [number, number][][][]).flat(2);
  }
  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.flatMap((item: PdokGeometry) => getGeometryCoordinates(item));
  }

  return [];
}

function featureIntersectsBounds(feature: PdokFeature, bounds: google.maps.LatLngBounds): boolean {
  const coordinates = getGeometryCoordinates(feature.geometry);
  for (const [lng, lat] of coordinates) {
    if (bounds.contains(new google.maps.LatLng(lat, lng))) return true;
  }
  return false;
}

function filterFeaturesByQuery(features: PdokFeature[], query: string): PdokFeature[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return features;

  return features.filter((feature) => {
    const properties = feature.properties || {};
    return Object.values(properties).some((value) => String(value).toLowerCase().includes(normalized));
  });
}

interface FeatureInfoProps {
  feature: google.maps.Data.Feature | null;
  onClose: () => void;
}

type LayerRenderMode = "tiles" | "features" | "loading" | "error" | "inactive";
interface LayerRenderStatus {
  mode: LayerRenderMode;
  detail?: string;
}

function FeatureInfoPanel({ feature, onClose }: FeatureInfoProps) {
  if (!feature) return null;

  const props: Record<string, string> = {};
  feature.forEachProperty((value, key) => {
    if (value !== null && value !== undefined && key !== "geometry") {
      props[key] = String(value);
    }
  });

  const skipKeys = new Set(["etl_bron", "etl_name", "etl_run", "id", "gid", "ogc_fid"]);
  const displayProps = Object.entries(props).filter(([k]) => !skipKeys.has(k));

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-2xl border border-gray-200 max-w-md w-[calc(100%-2rem)] z-30 max-h-[50vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#D52B1E]" />
          <span className="font-semibold text-sm text-[#1E293B]">Object informatie</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded transition-colors">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <div className="overflow-y-auto max-h-[calc(50vh-48px)] p-4">
        {displayProps.length === 0 ? (
          <p className="text-sm text-gray-500">Geen informatie beschikbaar</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {displayProps.map(([key, value]) => (
                <tr key={key} className="border-b border-gray-50 last:border-0">
                  <td className="py-1.5 pr-3 font-medium text-[#475569] whitespace-nowrap align-top capitalize">
                    {key.replace(/_/g, " ")}
                  </td>
                  <td className="py-1.5 text-[#1E293B] break-words">
                    {value.startsWith("http") ? (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-[#D52B1E] underline">
                        Link
                      </a>
                    ) : (
                      value
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function Twin() {
  const params = useParams<{ theme?: string }>();
  const mapRef = useRef<google.maps.Map | null>(null);
  const dataLayersRef = useRef<Map<string, google.maps.Data>>(new Map());
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement[]>>(new Map());
  const tileLayersRef = useRef<Map<string, google.maps.ImageMapType>>(new Map());
  const rawFeaturesRef = useRef<Map<string, PdokFeature[]>>(new Map());
  const visibleFeaturesRef = useRef<Map<string, PdokFeature[]>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [viewportTick, setViewportTick] = useState(0);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(
    new Set(params.theme ? [params.theme] : [])
  );
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [loadingLayers, setLoadingLayers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [pdokFilter, setPdokFilter] = useState("");
  const [pdokUseViewportBbox, setPdokUseViewportBbox] = useState(true);
  const [pdokCatalogLoading, setPdokCatalogLoading] = useState(false);
  const [pdokCatalogLayers, setPdokCatalogLayers] = useState<LayerConfig[]>([]);
  const [layerRenderStatus, setLayerRenderStatus] = useState<Record<string, LayerRenderStatus>>({});
  const [vectorFillOpacity, setVectorFillOpacity] = useState(0.25);
  const [vectorStrokeWeight, setVectorStrokeWeight] = useState(2);
  const [selectedFeature, setSelectedFeature] = useState<google.maps.Data.Feature | null>(null);
  const [addressSearch, setAddressSearch] = useState("");

  const allThemes = useMemo(() => {
    if (pdokCatalogLayers.length === 0) return themes;
    return [
      ...themes,
      {
        id: "pdok_catalogus",
        name: "PDOK Catalogus",
        icon: "map-pin",
        description: "Automatisch ingeladen PDOK OGC collections",
        color: "#0EA5E9",
        layers: pdokCatalogLayers,
      },
    ];
  }, [pdokCatalogLayers]);

  const layerById = useMemo(
    () => new Map(allThemes.flatMap((theme) => theme.layers.map((layer) => [layer.id, layer] as const))),
    [allThemes]
  );
  const loadBulkPdokCatalogLayers = useCallback(async () => {
    setPdokCatalogLoading(true);
    try {
      const catalog = await loadPdokCatalog();
      const colorPalette = ["#0EA5E9", "#4F46E5", "#10B981", "#F59E0B", "#EC4899", "#6366F1"];
      const layers: LayerConfig[] = catalog.map((entry, index) => {
        const normalizedItems = entry.itemsUrl.replace(/\/+$/, "");
        const collectionSegment = normalizedItems.match(/\/collections\/([^/]+)\/items$/)?.[1];
        const apiRoot = collectionSegment
          ? normalizedItems.replace(new RegExp(`/collections/${collectionSegment}/items$`), "")
          : undefined;
        const safeId = `${entry.apiTitle}-${entry.id}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        return {
          id: `pdok_auto_${safeId}`,
          name: entry.title,
          source: "pdok-ogc-features",
          pdokApiRoot: apiRoot,
          pdokCollectionId: collectionSegment || entry.id,
          pdokDescription: entry.description,
          pdokCollectionUrl: entry.itemsUrl,
          pdokTilesUrl:
            apiRoot && (collectionSegment || entry.id)
              ? `${apiRoot}/collections/${collectionSegment || entry.id}/tiles`
              : undefined,
          pdokIdField: "id",
          color: colorPalette[index % colorPalette.length],
          visible: false,
          category: "pdok-catalog",
        };
      });
      setPdokCatalogLayers(layers);
      setExpandedThemes((prev) => new Set([...Array.from(prev), "pdok_catalogus"]));
    } catch (error) {
      console.error("Failed to load PDOK catalog", error);
      window.alert("PDOK catalogus laden is mislukt.");
    } finally {
      setPdokCatalogLoading(false);
    }
  }, []);


  const toggleTheme = useCallback((themeId: string) => {
    setExpandedThemes((prev) => {
      const next = new Set(prev);
      if (next.has(themeId)) next.delete(themeId);
      else next.add(themeId);
      return next;
    });
  }, []);

  const clearLayer = useCallback((layerId: string) => {
    const dataLayer = dataLayersRef.current.get(layerId);
    if (dataLayer) {
      dataLayer.setMap(null);
      dataLayersRef.current.delete(layerId);
    }
    const markers = markersRef.current.get(layerId);
    if (markers) {
      markers.forEach((m) => (m.map = null));
      markersRef.current.delete(layerId);
    }
    const tileLayer = tileLayersRef.current.get(layerId);
    if (tileLayer && mapRef.current) {
      const overlays = mapRef.current.overlayMapTypes;
      for (let i = overlays.getLength() - 1; i >= 0; i--) {
        if (overlays.getAt(i) === tileLayer) {
          overlays.removeAt(i);
        }
      }
      tileLayersRef.current.delete(layerId);
    }
    visibleFeaturesRef.current.delete(layerId);
    setLayerRenderStatus((prev) => ({ ...prev, [layerId]: { mode: "inactive" } }));
  }, []);

  const renderLayerFeatures = useCallback((layer: LayerConfig, features: PdokFeature[]) => {
    if (!mapRef.current || features.length === 0) return;

    const firstGeomType = features[0]?.geometry?.type || "";
    const isPoint = firstGeomType === "Point" || firstGeomType === "MultiPoint";

    if (isPoint) {
      const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
      const markerIcon = createMarkerSvg(layer.color);

      for (const feature of features) {
        const geometry = feature.geometry;
        if (!geometry || (geometry.type !== "Point" && geometry.type !== "MultiPoint")) continue;

        let lat: number, lng: number;
        if (geometry.type === "MultiPoint") {
          [lng, lat] = geometry.coordinates[0];
        } else {
          [lng, lat] = geometry.coordinates;
        }

        if (isNaN(lat) || isNaN(lng)) continue;

        const img = document.createElement("img");
        img.src = markerIcon;
        img.style.width = "24px";
        img.style.height = "32px";

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current,
          position: { lat, lng },
          content: img,
          title: String((feature.properties as Record<string, unknown>)?.naam ?? (feature.properties as Record<string, unknown>)?.name ?? layer.name),
        });

        marker.addListener("click", () => {
          const fakeFeature = {
            forEachProperty: (cb: (value: unknown, key: string) => void) => {
              Object.entries(feature.properties || {}).forEach(([k, v]) => cb(v, k));
            },
          } as google.maps.Data.Feature;
          setSelectedFeature(fakeFeature);
        });

        newMarkers.push(marker);
      }

      markersRef.current.set(layer.id, newMarkers);
    } else {
      const dataLayer = new google.maps.Data({ map: mapRef.current });
      const { r, g, b } = hexToRgb(layer.color);

      dataLayer.setStyle({
        fillColor: `rgb(${r},${g},${b})`,
        fillOpacity: vectorFillOpacity,
        strokeColor: `rgb(${r},${g},${b})`,
        strokeWeight: vectorStrokeWeight,
        strokeOpacity: 0.8,
      });

      dataLayer.addGeoJson({
        type: "FeatureCollection",
        features,
      } as never);

      dataLayer.addListener("click", (event: google.maps.Data.MouseEvent) => {
        setSelectedFeature(event.feature);
      });

      dataLayersRef.current.set(layer.id, dataLayer);
    }
    setLayerRenderStatus((prev) => ({ ...prev, [layer.id]: { mode: "features" } }));
  }, [vectorFillOpacity, vectorStrokeWeight]);

  const tryRenderPdokTiles = useCallback(async (layer: LayerConfig): Promise<boolean> => {
    if (!mapRef.current || !layer.pdokTilesUrl) return false;
    const tileSource = await fetchPdokTileSource(layer.pdokTilesUrl);
    if (!tileSource) return false;

    const tileLayer = new google.maps.ImageMapType({
      tileSize: new google.maps.Size(tileSource.tileSize, tileSource.tileSize),
      name: layer.name,
      minZoom: tileSource.minZoom,
      maxZoom: tileSource.maxZoom,
      getTileUrl: (coord, zoom) =>
        tileSource.templateUrl
          .replace(/\{z\}/g, String(zoom))
          .replace(/\{x\}/g, String(coord.x))
          .replace(/\{y\}/g, String(coord.y)),
    });

    mapRef.current.overlayMapTypes.push(tileLayer);
    tileLayersRef.current.set(layer.id, tileLayer);
    setLayerRenderStatus((prev) => ({ ...prev, [layer.id]: { mode: "tiles" } }));
    return true;
  }, []);

  const addLayerToMap = useCallback(async (layer: LayerConfig) => {
    if (!mapRef.current) return;

    setLayerRenderStatus((prev) => ({ ...prev, [layer.id]: { mode: "loading" } }));
    setLoadingLayers((prev) => new Set(prev).add(layer.id));

    try {
      let features: PdokFeature[] = [];

      if (layer.source === "haarlem-wfs") {
        if (!layer.wfsLayer) throw new Error(`Missing wfsLayer for ${layer.id}`);
        const url = buildWfsUrl(layer.wfsLayer, 800);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const geojson = await response.json();
        features = (geojson.features || []) as PdokFeature[];
      } else {
        const renderedTiles = await tryRenderPdokTiles(layer);
        if (renderedTiles) return;

        if (!layer.pdokCollectionUrl) throw new Error(`Missing pdokCollectionUrl for ${layer.id}`);
        const bbox = pdokUseViewportBbox ? getMapBbox(mapRef.current) : null;
        const pdok = await fetchPdokFeatures(layer.pdokCollectionUrl, {
          limit: 800,
          bbox: bbox ?? undefined,
        });
        features = pdok.features;
      }

      rawFeaturesRef.current.set(layer.id, features);
      const visibleFeatures =
        layer.source === "pdok-ogc-features" ? filterFeaturesByQuery(features, pdokFilter) : features;
      visibleFeaturesRef.current.set(layer.id, visibleFeatures);

      if (visibleFeatures.length > 0) {
        renderLayerFeatures(layer, visibleFeatures);
      }
    } catch (err) {
      console.error(`Failed to load layer ${layer.id}:`, err);
      setLayerRenderStatus((prev) => ({
        ...prev,
        [layer.id]: {
          mode: "error",
          detail: err instanceof Error ? err.message : "Onbekende fout",
        },
      }));
    } finally {
      setLoadingLayers((prev) => {
        const next = new Set(prev);
        next.delete(layer.id);
        return next;
      });
    }
  }, [pdokFilter, pdokUseViewportBbox, renderLayerFeatures, tryRenderPdokTiles]);

  const activeRenderStatuses = useMemo(() => {
    return Array.from(activeLayers)
      .map((layerId) => {
        const layer = layerById.get(layerId);
        if (!layer) return null;
        return {
          id: layerId,
          name: layer.name,
          status: layerRenderStatus[layerId] || { mode: "inactive" as LayerRenderMode },
        };
      })
      .filter((item): item is { id: string; name: string; status: LayerRenderStatus } => Boolean(item));
  }, [activeLayers, layerById, layerRenderStatus]);

  useEffect(() => {
    for (const [layerId, dataLayer] of Array.from(dataLayersRef.current.entries())) {
      const layer = layerById.get(layerId);
      if (!layer) continue;
      const { r, g, b } = hexToRgb(layer.color);
      dataLayer.setStyle({
        fillColor: `rgb(${r},${g},${b})`,
        fillOpacity: vectorFillOpacity,
        strokeColor: `rgb(${r},${g},${b})`,
        strokeWeight: vectorStrokeWeight,
        strokeOpacity: 0.8,
      });
    }
  }, [layerById, vectorFillOpacity, vectorStrokeWeight]);

  const toggleLayer = useCallback(
    (layer: LayerConfig) => {
      setActiveLayers((prev) => {
        const next = new Set(prev);
        if (next.has(layer.id)) {
          next.delete(layer.id);
          clearLayer(layer.id);
        } else {
          next.add(layer.id);
          addLayerToMap(layer);
        }
        return next;
      });
    },
    [addLayerToMap, clearLayer]
  );

  const handleAddressSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!mapRef.current || !addressSearch.trim()) return;

      const geocoder = new google.maps.Geocoder();
      geocoder.geocode(
        { address: `${addressSearch}, Haarlem, Nederland` },
        (results, status) => {
          if (status === "OK" && results?.[0]) {
            mapRef.current?.setCenter(results[0].geometry.location);
            mapRef.current?.setZoom(17);
          }
        }
      );
    },
    [addressSearch]
  );

  // Auto-activate theme layers from URL param
  useEffect(() => {
    if (params.theme && mapReady) {
      const theme = themes.find((t) => t.id === params.theme);
      if (theme) {
        setExpandedThemes(new Set([theme.id]));
        if (theme.layers.length > 0 && !activeLayers.has(theme.layers[0].id)) {
          toggleLayer(theme.layers[0]);
        }
      }
    }
  }, [params.theme, mapReady]);

  useEffect(() => {
    if (!mapReady) return;

    for (const layerId of Array.from(activeLayers)) {
      const layer = layerById.get(layerId);
      if (!layer || layer.source !== "pdok-ogc-features") continue;

      const raw = rawFeaturesRef.current.get(layerId);
      if (!raw) continue;

      clearLayer(layerId);
      const filtered = filterFeaturesByQuery(raw, pdokFilter);
      visibleFeaturesRef.current.set(layerId, filtered);
      if (filtered.length > 0) {
        renderLayerFeatures(layer, filtered);
      }
    }
  }, [activeLayers, clearLayer, layerById, mapReady, pdokFilter, renderLayerFeatures]);

  // Filter themes/layers by search
  const filteredThemes = useMemo(
    () =>
      allThemes
        .map((theme) => ({
          ...theme,
          layers: theme.layers.filter(
            (l) =>
              !searchQuery ||
              l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              theme.name.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((theme) => theme.layers.length > 0 || !searchQuery),
    [allThemes, searchQuery]
  );

  // Get active layer info for legend
  const activeLayerInfo = useMemo(() => {
    const result: { name: string; color: string }[] = [];
    for (const theme of allThemes) {
      for (const layer of theme.layers) {
        if (activeLayers.has(layer.id)) {
          result.push({ name: layer.name, color: layer.color });
        }
      }
    }
    return result;
  }, [activeLayers, allThemes]);

  const activePdokStats = useMemo(() => {
    const stats: { id: string; name: string; visible: number; inViewport: number }[] = [];
    const bounds = mapRef.current?.getBounds() ?? null;

    for (const layerId of Array.from(activeLayers)) {
      const layer = layerById.get(layerId);
      if (!layer || layer.source !== "pdok-ogc-features") continue;

      const features = visibleFeaturesRef.current.get(layerId) ?? [];
      const inViewport = bounds
        ? features.filter((feature) => featureIntersectsBounds(feature, bounds)).length
        : features.length;
      stats.push({
        id: layerId,
        name: layer.name,
        visible: features.length,
        inViewport,
      });
    }

    return stats;
  }, [activeLayers, layerById, pdokFilter, viewportTick]);

  const exportActivePdokAsGeoJson = useCallback(() => {
    const exportFeatures: PdokFeature[] = [];

    for (const layerId of Array.from(activeLayers)) {
      const layer = layerById.get(layerId);
      if (!layer || layer.source !== "pdok-ogc-features") continue;
      const layerFeatures = visibleFeaturesRef.current.get(layerId) ?? [];
      exportFeatures.push(...layerFeatures);
    }

    if (exportFeatures.length === 0) {
      window.alert("Geen PDOK data beschikbaar om te exporteren.");
      return;
    }

    const payload = {
      type: "FeatureCollection",
      features: exportFeatures,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/geo+json" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `pdok-export-${Date.now()}.geojson`;
    link.click();
    URL.revokeObjectURL(objectUrl);
  }, [activeLayers, layerById]);

  const refreshActivePdokLayers = useCallback(async () => {
    const activePdokLayers = Array.from(activeLayers)
      .map((id) => layerById.get(id))
      .filter((layer): layer is LayerConfig => Boolean(layer && layer.source === "pdok-ogc-features"));

    for (const layer of activePdokLayers) {
      clearLayer(layer.id);
      await addLayerToMap(layer);
    }
  }, [activeLayers, addLayerToMap, clearLayer, layerById]);

  const activePdokLinks = useMemo(() => {
    return Array.from(activeLayers)
      .map((id) => layerById.get(id))
      .filter((layer): layer is LayerConfig => Boolean(layer && layer.source === "pdok-ogc-features"))
      .map((layer) => {
        const root = layer.pdokApiRoot?.replace(/\/+$/, "");
        const collectionId = layer.pdokCollectionId;
        const links = {
          items: layer.pdokCollectionUrl || "",
          collection: root && collectionId ? `${root}/collections/${collectionId}` : "",
          tiles: root && collectionId ? `${root}/collections/${collectionId}/tiles` : "",
          styles: root && collectionId ? `${root}/collections/${collectionId}/styles` : "",
          api: root ? `${root}/api` : "",
          conformance: root ? `${root}/conformance` : "",
        };
        return { layer, links };
      });
  }, [activeLayers, layerById]);

  return (
    <div className="h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex relative overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? "w-80 lg:w-[360px]" : "w-0"
          } transition-all duration-300 ease-in-out bg-white border-r border-gray-200 flex flex-col overflow-hidden z-20 absolute lg:relative h-full shadow-lg lg:shadow-none`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-5 h-5 text-[#D52B1E]" />
              <h2 className="font-bold text-[#1E293B] text-base">Kaartlagen</h2>
              {activeLayers.size > 0 && (
                <span className="ml-auto bg-[#D52B1E] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {activeLayers.size}
                </span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Zoek kaartlaag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D52B1E]/30 focus:border-[#D52B1E] transition-colors"
              />
            </div>
            <div className="mt-3 space-y-2">
              <div className="rounded-md border border-gray-200 bg-white p-2 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <SlidersHorizontal className="w-3 h-3" />
                  Vector stijl
                </div>
                <label className="block text-xs text-gray-600">
                  Vlak transparantie: {vectorFillOpacity.toFixed(2)}
                  <input
                    className="w-full"
                    type="range"
                    min="0.05"
                    max="0.9"
                    step="0.05"
                    value={vectorFillOpacity}
                    onChange={(e) => setVectorFillOpacity(Number(e.target.value))}
                  />
                </label>
                <label className="block text-xs text-gray-600">
                  Lijnbreedte: {vectorStrokeWeight}
                  <input
                    className="w-full"
                    type="range"
                    min="1"
                    max="6"
                    step="1"
                    value={vectorStrokeWeight}
                    onChange={(e) => setVectorStrokeWeight(Number(e.target.value))}
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={loadBulkPdokCatalogLayers}
                disabled={pdokCatalogLoading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {pdokCatalogLoading ? "PDOK catalogus laden..." : `Laad volledige PDOK catalogus (${pdokCatalogLayers.length})`}
              </button>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  id="pdok-bbox-toggle"
                  type="checkbox"
                  checked={pdokUseViewportBbox}
                  onChange={(e) => setPdokUseViewportBbox(e.target.checked)}
                />
                <label htmlFor="pdok-bbox-toggle">Gebruik viewport bbox voor PDOK requests</label>
              </div>
              <input
                type="text"
                placeholder="Filter actieve PDOK eigenschappen..."
                value={pdokFilter}
                onChange={(e) => setPdokFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D52B1E]/30 focus:border-[#D52B1E] transition-colors"
              />
              <button
                type="button"
                onClick={refreshActivePdokLayers}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Herlaad actieve PDOK lagen
              </button>
              <button
                type="button"
                onClick={exportActivePdokAsGeoJson}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exporteer actieve PDOK (GeoJSON)
              </button>
            </div>
          </div>

          {/* Layer List */}
          <div className="flex-1 overflow-y-auto">
            {filteredThemes.map((theme) => (
              <div key={theme.id} className="border-b border-gray-100">
                <button
                  onClick={() => toggleTheme(theme.id)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="text-[#D52B1E]">{iconMap[theme.icon]}</span>
                  {expandedThemes.has(theme.id) ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="font-semibold text-sm text-[#1E293B] flex-1">
                    {theme.name}
                  </span>
                  <span className="text-xs text-gray-400">{theme.layers.length}</span>
                </button>

                {expandedThemes.has(theme.id) && (
                  <div className="pb-1 bg-gray-50/50">
                    {theme.layers.map((layer) => (
                      <label
                        key={layer.id}
                        className="flex items-center gap-3 px-4 pl-12 py-2.5 hover:bg-gray-100/80 cursor-pointer transition-colors"
                      >
                        <div className="relative shrink-0">
                          <input
                            type="checkbox"
                            checked={activeLayers.has(layer.id)}
                            onChange={() => toggleLayer(layer)}
                            className="sr-only"
                          />
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              activeLayers.has(layer.id)
                                ? "border-[#D52B1E] bg-[#D52B1E] scale-105"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {activeLayers.has(layer.id) && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div
                          className="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/10"
                          style={{ backgroundColor: layer.color }}
                        />
                        <span className="text-sm text-[#374151] flex-1">{layer.name}</span>
                        {loadingLayers.has(layer.id) && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D52B1E] ml-auto shrink-0" />
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 shrink-0 space-y-2">
            {activePdokStats.length > 0 && (
              <div className="space-y-1">
                <div className="font-semibold text-gray-700">PDOK viewport samenvatting</div>
                {activePdokStats.map((item) => (
                  <div key={item.id}>
                    {item.name}: {item.inViewport}/{item.visible}
                  </div>
                ))}
              </div>
            )}
            {activeRenderStatuses.length > 0 && (
              <div className="space-y-1">
                <div className="font-semibold text-gray-700">Renderstatus</div>
                {activeRenderStatuses.map((item) => (
                  <div key={item.id}>
                    {item.name}: {item.status.mode}
                    {item.status.detail ? ` (${item.status.detail})` : ""}
                  </div>
                ))}
              </div>
            )}
            {activePdokLinks.length > 0 && (
              <div className="space-y-1">
                <div className="font-semibold text-gray-700">PDOK service-links</div>
                {activePdokLinks.slice(0, 5).map(({ layer, links }) => (
                  <div key={layer.id} className="space-y-1">
                    <div className="text-gray-700">{layer.name}</div>
                    <div className="flex flex-wrap gap-2">
                      {links.collection && (
                        <a href={links.collection} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                          Collection <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {links.items && (
                        <a href={links.items} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                          Items <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {links.tiles && (
                        <a href={links.tiles} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                          Tiles <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {links.styles && (
                        <a href={links.styles} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                          Styles <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {links.api && (
                        <a href={links.api} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                          OpenAPI <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div>
              Data:{" "}
              <a href="https://data.haarlem.nl" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
                data.haarlem.nl
              </a>{" "}
              +{" "}
              <a href="https://api.pdok.nl" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
                api.pdok.nl
              </a>
            </div>
          </div>
        </div>

        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`absolute z-30 bg-white shadow-lg rounded-r-lg p-2.5 hover:bg-gray-50 transition-all duration-300 ease-in-out border border-l-0 border-gray-200 top-3 ${
            sidebarOpen ? "left-80 lg:left-[360px]" : "left-0"
          }`}
          aria-label={sidebarOpen ? "Paneel sluiten" : "Paneel openen"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-5 h-5 text-gray-600" />
          ) : (
            <PanelLeftOpen className="w-5 h-5 text-gray-600" />
          )}
        </button>

        {/* Map Area */}
        <div className="flex-1 relative">
          {/* Address Search */}
          <form
            onSubmit={handleAddressSearch}
            className="absolute top-3 right-3 z-20 w-72 sm:w-80"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Zoek adres in Haarlem..."
                value={addressSearch}
                onChange={(e) => setAddressSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-[#D52B1E]/30 focus:border-[#D52B1E]"
              />
            </div>
          </form>

          <MapView
            className="w-full h-full"
            initialCenter={HAARLEM_CENTER}
            initialZoom={DEFAULT_ZOOM}
            onMapReady={(map) => {
              mapRef.current = map;
              setMapReady(true);
              map.addListener("idle", () => setViewportTick((tick) => tick + 1));
              map.setOptions({
                mapTypeControl: true,
                mapTypeControlOptions: {
                  position: google.maps.ControlPosition.TOP_RIGHT,
                  style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                },
                fullscreenControl: true,
                fullscreenControlOptions: {
                  position: google.maps.ControlPosition.RIGHT_TOP,
                },
                streetViewControl: true,
                zoomControl: true,
                zoomControlOptions: {
                  position: google.maps.ControlPosition.RIGHT_BOTTOM,
                },
              });
            }}
          />

          {/* Feature Info Panel */}
          <FeatureInfoPanel
            feature={selectedFeature}
            onClose={() => setSelectedFeature(null)}
          />

          {/* Legend */}
          {activeLayerInfo.length > 0 && (
            <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-3 max-w-[200px]">
              <div className="text-xs font-bold text-[#1E293B] mb-2">Legenda</div>
              <div className="space-y-1.5">
                {activeLayerInfo.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0 ring-1 ring-black/10"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-[#475569] leading-tight">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
