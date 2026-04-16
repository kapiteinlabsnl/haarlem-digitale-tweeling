/*
 * Haarlem Twin map page
 * - Haarlem WFS vector layers
 * - AHN WMS overlays (height/footage style layers)
 */

import { Header } from "@/components/Header";
import { MapView } from "@/components/Map";
import { themes, HAARLEM_CENTER, DEFAULT_ZOOM, buildWfsUrl } from "@/lib/layers";
import type { LayerConfig } from "@/lib/layers";
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
  Satellite,
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

function tileToBboxEPSG3857(x: number, y: number, z: number): string {
  const earthRadius = 6378137;
  const originShift = (2 * Math.PI * earthRadius) / 2;
  const resolution = (2 * Math.PI * earthRadius) / (256 * Math.pow(2, z));
  const minx = x * 256 * resolution - originShift;
  const maxx = (x + 1) * 256 * resolution - originShift;
  const maxy = originShift - y * 256 * resolution;
  const miny = originShift - (y + 1) * 256 * resolution;
  return `${minx},${miny},${maxx},${maxy}`;
}

interface ParsedWmsCapabilities {
  layerNames: string[];
}

interface AhnInfoResult {
  layerId: string;
  layerName: string;
  sourceLayerName: string;
  value: string;
  raw: string;
}

type SentinelLayerMode = "S2_TRUE_COLOR" | "S2_NDVI";

const SENTINEL_PROXY_BASE_URL =
  (import.meta.env.VITE_SENTINEL_PROXY_BASE_URL || "https://haarlem-sentinel-proxy.carl-6ae.workers.dev").replace(/\/+$/, "");
const HAARLEM_KAART_URL = "https://kaart.haarlem.nl";
const HAARLEM_GEOSERVER_URL = "https://data.haarlem.nl/geoserver/";
const HAARLEM_WFS_CAPABILITIES_URL = "https://data.haarlem.nl/geoserver/wfs?request=getcapabilities";
const HAARLEM_WMS_CAPABILITIES_URL = "https://data.haarlem.nl/geoserver/ows?service=WMS&request=GetCapabilities";

function toIsoDate(value: string, endOfDay = false): string {
  return `${value}T${endOfDay ? "23:59:59" : "00:00:00"}Z`;
}

function getSentinelEvalscript(mode: SentinelLayerMode): string {
  if (mode === "S2_NDVI") {
    return `//VERSION=3
function setup() {
  return { input: ["B04", "B08"], output: { bands: 3 } };
}
function evaluatePixel(sample) {
  const ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04 + 1e-6);
  if (ndvi < 0) return [0.7, 0.2, 0.2];
  if (ndvi < 0.2) return [0.9, 0.8, 0.2];
  if (ndvi < 0.4) return [0.5, 0.8, 0.2];
  if (ndvi < 0.6) return [0.2, 0.7, 0.2];
  return [0.0, 0.45, 0.0];
}`;
  }
  return `//VERSION=3
function setup() {
  return { input: ["B04", "B03", "B02"], output: { bands: 3 } };
}
function evaluatePixel(sample) {
  return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
}`;
}

function getSentinelCollections(mode: SentinelLayerMode): string[] {
  return ["sentinel-2-l2a"];
}

function parseWmsCapabilities(xmlText: string): ParsedWmsCapabilities {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "text/xml");
  const names = Array.from(xml.getElementsByTagName("Name"))
    .map((node) => node.textContent?.trim() || "")
    .filter((name) => name.length > 0);
  return { layerNames: Array.from(new Set(names)) };
}

function pickAhnLayerName(layer: LayerConfig, candidates: string[]): string | null {
  if (layer.ahnWmsLayer && candidates.includes(layer.ahnWmsLayer)) return layer.ahnWmsLayer;

  const hints = `${layer.id} ${layer.name}`.toLowerCase();
  const preferDtm = hints.includes("dtm") || hints.includes("terrain") || hints.includes("terreinhoogte");
  const preferDsm = hints.includes("dsm") || hints.includes("footage") || hints.includes("beeld");

  if (preferDtm) {
    const hit = candidates.find((name) => name.toLowerCase().includes("dtm"));
    if (hit) return hit;
  }
  if (preferDsm) {
    const hit = candidates.find((name) => name.toLowerCase().includes("dsm"));
    if (hit) return hit;
  }

  return candidates[0] || null;
}

function extractAhnValue(rawText: string): string {
  const text = rawText.replace(/\s+/g, " ").trim();

  // Prefer structured JSON values from raster info when available.
  try {
    const parsed = JSON.parse(rawText) as unknown;
    const jsonValue = extractNumericFromJson(parsed);
    if (jsonValue !== null) return `${jsonValue.toFixed(2)} m`;
  } catch {
    // Not JSON, continue with plain-text parsing.
  }

  // Prefer key-value patterns from text/plain responses.
  const keyValueMatch = text.match(
    /(gray_index|value|pixel|band\d*|elevation|hoogte)\s*[:=]\s*(-?\d+(?:[.,]\d+)?)/i
  );
  if (keyValueMatch) {
    const numeric = Number(keyValueMatch[2].replace(",", "."));
    if (Number.isFinite(numeric)) return `${numeric.toFixed(2)} m`;
  }

  return "";
}

function isNoResultResponse(rawText: string): boolean {
  const normalized = rawText.toLowerCase();
  return (
    normalized.includes("search returned no results") ||
    normalized.includes("no results") ||
    normalized.includes("none found") ||
    normalized.includes("nan") ||
    normalized.trim() === ""
  );
}

function extractNumericFromJson(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;

  const candidates: number[] = [];
  const targetKeys = /(gray|value|pixel|band|elev|height|hoogte|z)/i;

  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value) && targetKeys.test(key)) {
        candidates.push(value);
      } else if (typeof value === "string" && targetKeys.test(key)) {
        const parsed = Number(value.replace(",", "."));
        if (Number.isFinite(parsed)) candidates.push(parsed);
      } else if (typeof value === "object") {
        walk(value);
      }
    }
  };

  walk(payload);
  return candidates.length > 0 ? candidates[0] : null;
}

interface FeatureInfoProps {
  feature: google.maps.Data.Feature | null;
  onClose: () => void;
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
                        Openen
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
  const ahnTileLayersRef = useRef<Map<string, google.maps.ImageMapType>>(new Map());
  const ahnCapabilitiesRef = useRef<Map<string, ParsedWmsCapabilities>>(new Map());
  const ahnResolvedLayerRef = useRef<Map<string, string>>(new Map());
  const sentinelOverlayRef = useRef<google.maps.GroundOverlay | null>(null);
  const sentinelOverlayUrlRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(
    new Set(params.theme ? [params.theme] : [])
  );
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [loadingLayers, setLoadingLayers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFeature, setSelectedFeature] = useState<google.maps.Data.Feature | null>(null);
  const [selectedAhnInfo, setSelectedAhnInfo] = useState<AhnInfoResult | null>(null);
  const [addressSearch, setAddressSearch] = useState("");
  const [sentinelOpen, setSentinelOpen] = useState(false);
  const [sentinelMode, setSentinelMode] = useState<SentinelLayerMode>("S2_TRUE_COLOR");
  const [sentinelFromDate, setSentinelFromDate] = useState("2023-06-01");
  const [sentinelToDate, setSentinelToDate] = useState("2023-06-30");
  const [sentinelCloud, setSentinelCloud] = useState(20);
  const [sentinelLoading, setSentinelLoading] = useState(false);
  const [sentinelError, setSentinelError] = useState<string | null>(null);

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
    const ahnLayer = ahnTileLayersRef.current.get(layerId);
    if (ahnLayer && mapRef.current) {
      const overlays = mapRef.current.overlayMapTypes;
      for (let i = overlays.getLength() - 1; i >= 0; i--) {
        if (overlays.getAt(i) === ahnLayer) overlays.removeAt(i);
      }
      ahnTileLayersRef.current.delete(layerId);
    }
    ahnResolvedLayerRef.current.delete(layerId);
  }, []);

  const resolveAhnLayerName = useCallback(async (layer: LayerConfig): Promise<string | null> => {
    if (!layer.ahnWmsBaseUrl) return null;
    const cached = ahnCapabilitiesRef.current.get(layer.ahnWmsBaseUrl);
    if (cached) return pickAhnLayerName(layer, cached.layerNames);

    const capabilitiesUrl = `${layer.ahnWmsBaseUrl}?SERVICE=WMS&REQUEST=GetCapabilities`;
    const response = await fetch(capabilitiesUrl);
    if (!response.ok) return layer.ahnWmsLayer || null;
    const text = await response.text();
    const parsed = parseWmsCapabilities(text);
    ahnCapabilitiesRef.current.set(layer.ahnWmsBaseUrl, parsed);
    return pickAhnLayerName(layer, parsed.layerNames);
  }, []);

  const addAhnWmsLayer = useCallback(async (layer: LayerConfig) => {
    if (!mapRef.current || !layer.ahnWmsBaseUrl) return;
    const resolvedLayerName = await resolveAhnLayerName(layer);
    if (!resolvedLayerName) return;
    ahnResolvedLayerRef.current.set(layer.id, resolvedLayerName);

    const tileLayer = new google.maps.ImageMapType({
      tileSize: new google.maps.Size(256, 256),
      name: layer.name,
      maxZoom: 22,
      getTileUrl: (coord, zoom) => {
        const bbox = tileToBboxEPSG3857(coord.x, coord.y, zoom);
        const params = new URLSearchParams({
          SERVICE: "WMS",
          REQUEST: "GetMap",
          VERSION: "1.3.0",
          CRS: "EPSG:3857",
          BBOX: bbox,
          WIDTH: "256",
          HEIGHT: "256",
          LAYERS: resolvedLayerName,
          STYLES: "",
          FORMAT: layer.ahnWmsFormat || "image/png",
          TRANSPARENT: String(layer.ahnTransparent ?? true),
        });
        return `${layer.ahnWmsBaseUrl}?${params.toString()}`;
      },
    });

    mapRef.current.overlayMapTypes.push(tileLayer);
    ahnTileLayersRef.current.set(layer.id, tileLayer);
  }, [resolveAhnLayerName]);

  const addLayerToMap = useCallback(async (layer: LayerConfig) => {
    if (!mapRef.current) return;

    setLoadingLayers((prev) => new Set(prev).add(layer.id));
    try {
      if (layer.source === "ahn-wms") {
        await addAhnWmsLayer(layer);
        return;
      }

      if (!layer.wfsLayer) return;
      const url = buildWfsUrl(layer.wfsLayer, 800);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const geojson = await response.json();
      const features = geojson.features || [];
      if (!features.length) return;

      const firstGeomType = features[0]?.geometry?.type || "";
      const isPoint = firstGeomType === "Point" || firstGeomType === "MultiPoint";

      if (isPoint) {
        const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
        const markerIcon = createMarkerSvg(layer.color);
        for (const feature of features) {
          const coords = feature.geometry?.coordinates;
          if (!coords) continue;
          let lat: number, lng: number;
          if (feature.geometry.type === "MultiPoint") {
            [lng, lat] = coords[0];
          } else {
            [lng, lat] = coords;
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
            title: feature.properties?.naam || feature.properties?.name || layer.name,
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
          fillOpacity: 0.25,
          strokeColor: `rgb(${r},${g},${b})`,
          strokeWeight: 2,
          strokeOpacity: 0.8,
        });
        dataLayer.addGeoJson(geojson);
        dataLayer.addListener("click", (event: google.maps.Data.MouseEvent) => {
          setSelectedFeature(event.feature);
        });
        dataLayersRef.current.set(layer.id, dataLayer);
      }
    } catch (error) {
      console.error(`Failed to load layer ${layer.id}:`, error);
    } finally {
      setLoadingLayers((prev) => {
        const next = new Set(prev);
        next.delete(layer.id);
        return next;
      });
    }
  }, [addAhnWmsLayer]);

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

  const clearSentinelOverlay = useCallback(() => {
    if (sentinelOverlayRef.current) {
      sentinelOverlayRef.current.setMap(null);
      sentinelOverlayRef.current = null;
    }
    if (sentinelOverlayUrlRef.current) {
      URL.revokeObjectURL(sentinelOverlayUrlRef.current);
      sentinelOverlayUrlRef.current = null;
    }
  }, []);

  const renderSentinelOverlay = useCallback(async () => {
    if (!mapRef.current) return;
    const bounds = mapRef.current.getBounds();
    if (!bounds) return;

    setSentinelLoading(true);
    setSentinelError(null);
    try {
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const dataFilter: Record<string, unknown> = {
        timeRange: {
          from: toIsoDate(sentinelFromDate),
          to: toIsoDate(sentinelToDate, true),
        },
      };
      dataFilter.maxCloudCoverage = sentinelCloud;

      const collectionCandidates = getSentinelCollections(sentinelMode);
      let blob: Blob | null = null;
      let lastError = "";

      for (const collectionType of collectionCandidates) {
        const payload = {
          input: {
            bounds: { bbox: [sw.lng(), sw.lat(), ne.lng(), ne.lat()] },
            data: [{ type: collectionType, dataFilter }],
          },
          output: {
            width: 1024,
            height: 1024,
            responses: [{ identifier: "default", format: { type: "image/png" } }],
          },
          evalscript: getSentinelEvalscript(sentinelMode),
        };

        const response = await fetch(`${SENTINEL_PROXY_BASE_URL}/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          blob = await response.blob();
          break;
        }

        const text = await response.text();
        lastError = text;

        // For non-collection errors, stop immediately.
        if (!(response.status === 400 && text.toLowerCase().includes("collection"))) {
          throw new Error(`Sentinel render mislukt (${response.status}): ${text.slice(0, 220)}`);
        }
      }

      if (!blob) {
        throw new Error(`Sentinel render mislukt (400): ${lastError.slice(0, 220)}`);
      }

      const objectUrl = URL.createObjectURL(blob);
      clearSentinelOverlay();
      sentinelOverlayUrlRef.current = objectUrl;
      const overlay = new google.maps.GroundOverlay(objectUrl, {
        north: ne.lat(),
        south: sw.lat(),
        east: ne.lng(),
        west: sw.lng(),
      });
      overlay.setMap(mapRef.current);
      sentinelOverlayRef.current = overlay;
    } catch (error) {
      setSentinelError(error instanceof Error ? error.message : "Sentinel render mislukt");
    } finally {
      setSentinelLoading(false);
    }
  }, [clearSentinelOverlay, sentinelCloud, sentinelFromDate, sentinelMode, sentinelToDate]);

  const queryAhnFeatureInfo = useCallback(async (layer: LayerConfig, latLng: google.maps.LatLng): Promise<AhnInfoResult | null> => {
    if (!layer.ahnWmsBaseUrl) return null;
    const sourceLayerName = ahnResolvedLayerRef.current.get(layer.id);
    if (!sourceLayerName) return null;

    const lat = latLng.lat();
    const lng = latLng.lng();
    const width = 256;
    const height = 256;
    const i = Math.floor(width / 2);
    const j = Math.floor(height / 2);

    const attempts: Array<{ version: "1.1.1" | "1.3.0"; delta: number; infoFormat: string }> = [
      { version: "1.1.1", delta: 0.0005, infoFormat: "application/json" },
      { version: "1.3.0", delta: 0.0005, infoFormat: "application/json" },
      { version: "1.1.1", delta: 0.0005, infoFormat: "text/plain" },
      { version: "1.3.0", delta: 0.0005, infoFormat: "text/plain" },
      { version: "1.1.1", delta: 0.001, infoFormat: "text/plain" },
      { version: "1.3.0", delta: 0.001, infoFormat: "text/plain" },
      { version: "1.1.1", delta: 0.002, infoFormat: "text/html" },
    ];

    for (const attempt of attempts) {
      const bbox = `${lng - attempt.delta},${lat - attempt.delta},${lng + attempt.delta},${lat + attempt.delta}`;
      const params = new URLSearchParams({
        SERVICE: "WMS",
        VERSION: attempt.version,
        REQUEST: "GetFeatureInfo",
        BBOX: bbox,
        WIDTH: String(width),
        HEIGHT: String(height),
        LAYERS: sourceLayerName,
        QUERY_LAYERS: sourceLayerName,
        INFO_FORMAT: attempt.infoFormat,
        FEATURE_COUNT: "1",
      });

      if (attempt.version === "1.3.0") {
        params.set("CRS", "EPSG:4326");
        params.set("I", String(i));
        params.set("J", String(j));
      } else {
        params.set("SRS", "EPSG:4326");
        params.set("X", String(i));
        params.set("Y", String(j));
      }

      try {
        const response = await fetch(`${layer.ahnWmsBaseUrl}?${params.toString()}`);
        if (!response.ok) continue;
        const raw = await response.text();
        if (isNoResultResponse(raw)) continue;

        const value = extractAhnValue(raw);
        if (!value) continue;
        return {
          layerId: layer.id,
          layerName: layer.name,
          sourceLayerName,
          value,
          raw,
        };
      } catch {
        continue;
      }
    }

    return null;
  }, []);

  useEffect(() => {
    if (params.theme && mapReady) {
      const theme = themes.find((t) => t.id === params.theme);
      if (theme && theme.layers.length > 0 && !activeLayers.has(theme.layers[0].id)) {
        setExpandedThemes(new Set([theme.id]));
        toggleLayer(theme.layers[0]);
      }
    }
  }, [params.theme, mapReady, activeLayers, toggleLayer]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const listener = map.addListener("click", async (event: google.maps.MapMouseEvent) => {
      const latLng = event.latLng;
      if (!latLng) return;

      const activeAhnLayers = themes
        .flatMap((theme) => theme.layers)
        .filter((layer) => activeLayers.has(layer.id) && layer.source === "ahn-wms");
      if (activeAhnLayers.length === 0) {
        setSelectedAhnInfo(null);
        return;
      }

      for (const layer of activeAhnLayers) {
        const info = await queryAhnFeatureInfo(layer, latLng);
        if (info) {
          setSelectedAhnInfo(info);
          return;
        }
      }
      // No feature info found at this click location; keep UI quiet.
      setSelectedAhnInfo(null);
    });

    return () => listener.remove();
  }, [activeLayers, queryAhnFeatureInfo]);

  useEffect(() => {
    return () => clearSentinelOverlay();
  }, [clearSentinelOverlay]);

  const filteredThemes = useMemo(
    () =>
      themes
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
    [searchQuery]
  );

  const activeLayerInfo = useMemo(() => {
    const result: { name: string; color: string }[] = [];
    for (const theme of themes) {
      for (const layer of theme.layers) {
        if (activeLayers.has(layer.id)) {
          result.push({ name: layer.name, color: layer.color });
        }
      }
    }
    return result;
  }, [activeLayers]);

  const activeAhnDebug = useMemo(() => {
    return themes
      .flatMap((theme) => theme.layers)
      .filter((layer) => activeLayers.has(layer.id) && layer.source === "ahn-wms")
      .map((layer) => ({
        layerId: layer.id,
        layerName: layer.name,
        sourceLayer: ahnResolvedLayerRef.current.get(layer.id) || "resolving...",
      }));
  }, [activeLayers, loadingLayers]);

  return (
    <div className="h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex relative overflow-hidden">
        <div
          className={`${
            sidebarOpen ? "w-80 lg:w-[360px]" : "w-0"
          } transition-all duration-300 ease-in-out bg-white border-r border-gray-200 flex flex-col overflow-hidden z-20 absolute lg:relative h-full shadow-lg lg:shadow-none`}
        >
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
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="border-b border-gray-100 bg-gray-50/40">
              <div className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#D52B1E]" />
                  <span className="font-semibold text-sm text-[#1E293B]">Geo-services</span>
                </div>
                <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                  Officiele ingangen naar de kaartomgeving en geo-services van Haarlem voor kaartgebruik en GIS-toepassingen.
                </p>
                <div className="mt-3 space-y-2">
                  {[
                    {
                      title: "Officiele kaart",
                      description: "Open de publieke kaartomgeving van Haarlem.",
                      href: HAARLEM_KAART_URL,
                      primary: true,
                    },
                    {
                      title: "GeoServer",
                      description: "Technische ingang voor de kaartservices en datasets.",
                      href: HAARLEM_GEOSERVER_URL,
                    },
                    {
                      title: "WFS GetCapabilities",
                      description: "Overzicht van beschikbare feature-lagen en WFS-operaties.",
                      href: HAARLEM_WFS_CAPABILITIES_URL,
                    },
                    {
                      title: "WMS GetCapabilities",
                      description: "Overzicht van beschikbare kaartlagen en WMS-operaties.",
                      href: HAARLEM_WMS_CAPABILITIES_URL,
                    },
                  ].map((service) => (
                    <a
                      key={service.title}
                      href={service.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block rounded-md border px-3 py-2 transition-colors ${
                        service.primary
                          ? "border-[#D52B1E] bg-[#D52B1E] text-white hover:bg-[#B91C1C]"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className={`text-xs font-semibold ${service.primary ? "text-white" : "text-[#1E293B]"}`}>
                        {service.title}
                      </div>
                      <div className={`mt-1 text-[11px] leading-relaxed ${service.primary ? "text-white/85" : "text-gray-500"}`}>
                        {service.description}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-b border-gray-100">
              <button
                onClick={() => setSentinelOpen((prev) => !prev)}
                className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-[#D52B1E]">
                  <Satellite className="w-4 h-4" />
                </span>
                {sentinelOpen ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
                <span className="font-semibold text-sm text-[#1E293B] flex-1">Sentinel satelliet</span>
              </button>

              {sentinelOpen && (
                <div className="px-4 pb-3 space-y-2 bg-gray-50/50">
                  <select
                    value={sentinelMode}
                    onChange={(e) => setSentinelMode(e.target.value as SentinelLayerMode)}
                    className="w-full border border-gray-200 rounded-md px-2.5 py-2 text-sm bg-white"
                  >
                    <option value="S2_TRUE_COLOR">Sentinel-2 natuurlijke kleuren</option>
                    <option value="S2_NDVI">Sentinel-2 NDVI</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={sentinelFromDate}
                      onChange={(e) => setSentinelFromDate(e.target.value)}
                      className="border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white"
                    />
                    <input
                      type="date"
                      value={sentinelToDate}
                      onChange={(e) => setSentinelToDate(e.target.value)}
                      className="border border-gray-200 rounded-md px-2 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-gray-600">
                      Maximale bewolkingsgraad (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={sentinelCloud}
                      onChange={(e) => setSentinelCloud(Number(e.target.value))}
                      disabled={false}
                      className="w-full border border-gray-200 rounded-md px-2.5 py-2 text-sm bg-white disabled:bg-gray-100"
                      placeholder="Bijv. 20"
                    />
                    <p className="text-[11px] text-gray-500">
                      Lager percentage = minder wolken, maar minder beschikbare beelden.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={renderSentinelOverlay}
                      disabled={sentinelLoading}
                      className="flex-1 bg-[#D52B1E] hover:bg-[#B91C1C] text-white rounded-md px-2.5 py-2 text-xs font-semibold disabled:opacity-60"
                    >
                      {sentinelLoading ? "Laden..." : "Toon satellietlaag"}
                    </button>
                    <button
                      onClick={clearSentinelOverlay}
                      className="border border-gray-200 bg-white hover:bg-gray-100 rounded-md px-2.5 py-2 text-xs font-medium"
                    >
                      Wissen
                    </button>
                  </div>
                  {sentinelError && <div className="text-[11px] text-red-600">{sentinelError}</div>}
                </div>
              )}
            </div>

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
                  <span className="font-semibold text-sm text-[#1E293B] flex-1">{theme.name}</span>
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
                        <div className="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/10" style={{ backgroundColor: layer.color }} />
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

          <div className="p-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 shrink-0">
            {activeAhnDebug.length > 0 && (
              <div className="mb-2 space-y-1">
                <div className="font-semibold text-gray-700">AHN actieve bronlagen</div>
                {activeAhnDebug.map((item) => (
                  <div key={item.layerId}>
                    {item.layerName}: {item.sourceLayer}
                  </div>
                ))}
              </div>
            )}
              Bronnen:{" "}
            <a href="https://data.haarlem.nl" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
              data.haarlem.nl
            </a>{" "}
            +{" "}
            <a href="https://www.ahn.nl" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
              ahn.nl
            </a>
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`absolute z-30 bg-white shadow-lg rounded-r-lg p-2.5 hover:bg-gray-50 transition-all duration-300 ease-in-out border border-l-0 border-gray-200 top-3 ${
            sidebarOpen ? "left-80 lg:left-[360px]" : "left-0"
          }`}
          aria-label={sidebarOpen ? "Paneel sluiten" : "Paneel openen"}
        >
          {sidebarOpen ? <PanelLeftClose className="w-5 h-5 text-gray-600" /> : <PanelLeftOpen className="w-5 h-5 text-gray-600" />}
        </button>

        <div className="flex-1 relative">
          <form onSubmit={handleAddressSearch} className="absolute top-3 right-3 z-20 w-72 sm:w-80">
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

          <FeatureInfoPanel feature={selectedFeature} onClose={() => setSelectedFeature(null)} />

          {selectedAhnInfo && (
            <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-3 max-w-sm">
              <div className="text-xs font-bold text-[#1E293B] mb-1">AHN meetwaarde</div>
              <div className="text-xs text-[#334155]">{selectedAhnInfo.layerName}</div>
              <div className="text-sm font-semibold text-[#0F172A] mt-1">{selectedAhnInfo.value}</div>
              <div className="text-[11px] text-gray-500 mt-1">Bronlaag: {selectedAhnInfo.sourceLayerName}</div>
            </div>
          )}

          {activeLayerInfo.length > 0 && (
            <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-4 py-3 max-w-[220px]">
              <div className="text-xs font-bold text-[#1E293B] mb-2">Legenda</div>
              <div className="space-y-1.5">
                {activeLayerInfo.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm shrink-0 ring-1 ring-black/10" style={{ backgroundColor: item.color }} />
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
