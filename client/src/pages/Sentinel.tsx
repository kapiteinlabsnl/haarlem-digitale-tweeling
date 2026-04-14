import { Header } from "@/components/Header";
import { MapView } from "@/components/Map";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SentinelLayerMode = "S2_TRUE_COLOR" | "S2_NDVI" | "S5P_NO2";

const SENTINEL_TOKEN_URL = "https://services.sentinel-hub.com/oauth/token";
const SENTINEL_PROCESS_URL = "https://services.sentinel-hub.com/api/v1/process";
const SENTINEL_CATALOG_URL = "https://services.sentinel-hub.com/api/v1/catalog/1.0.0/search";

const SENTINEL_CLIENT_ID = (import.meta.env.VITE_SENTINEL_CLIENT_ID ?? "").trim();
const SENTINEL_CLIENT_SECRET = (import.meta.env.VITE_SENTINEL_CLIENT_SECRET ?? "").trim();

function toIsoDate(value: string, endOfDay = false): string {
  return `${value}T${endOfDay ? "23:59:59" : "00:00:00"}Z`;
}

function getEvalscript(mode: SentinelLayerMode): string {
  if (mode === "S2_NDVI") {
    return `//VERSION=3
function setup() {
  return {
    input: ["B04", "B08"],
    output: { bands: 3 }
  };
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
  if (mode === "S5P_NO2") {
    return `//VERSION=3
function setup() {
  return {
    input: ["NO2"],
    output: { bands: 3 }
  };
}

function evaluatePixel(sample) {
  const v = Math.max(0, Math.min(1, sample.NO2 * 8000.0));
  return [v, Math.max(0, 1.0 - v), Math.max(0, 1.0 - 2.0 * v)];
}`;
  }
  return `//VERSION=3
function setup() {
  return {
    input: ["B04", "B03", "B02"],
    output: { bands: 3 }
  };
}

function evaluatePixel(sample) {
  return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02];
}`;
}

function getDataCollection(mode: SentinelLayerMode): string {
  return mode === "S5P_NO2" ? "sentinel-5p-l2" : "sentinel-2-l2a";
}

export default function Sentinel() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlayRef = useRef<google.maps.GroundOverlay | null>(null);
  const overlayUrlRef = useRef<string | null>(null);
  const tokenRef = useRef<{ token: string; expiresAt: number } | null>(null);

  const [mode, setMode] = useState<SentinelLayerMode>("S2_TRUE_COLOR");
  const [fromDate, setFromDate] = useState("2023-06-01");
  const [toDate, setToDate] = useState("2023-06-30");
  const [maxCloud, setMaxCloud] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogDates, setCatalogDates] = useState<string[]>([]);

  const canQuery = useMemo(
    () => SENTINEL_CLIENT_ID.length > 0 && SENTINEL_CLIENT_SECRET.length > 0,
    []
  );

  const getAccessToken = useCallback(async () => {
    const now = Date.now();
    if (tokenRef.current && tokenRef.current.expiresAt - now > 30_000) {
      return tokenRef.current.token;
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: SENTINEL_CLIENT_ID,
      client_secret: SENTINEL_CLIENT_SECRET,
    });
    const response = await fetch(SENTINEL_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) {
      throw new Error(`Token request failed (${response.status})`);
    }
    const json = (await response.json()) as { access_token: string; expires_in: number };
    tokenRef.current = {
      token: json.access_token,
      expiresAt: Date.now() + json.expires_in * 1000,
    };
    return json.access_token;
  }, []);

  const clearOverlay = useCallback(() => {
    if (overlayRef.current) {
      overlayRef.current.setMap(null);
      overlayRef.current = null;
    }
    if (overlayUrlRef.current) {
      URL.revokeObjectURL(overlayUrlRef.current);
      overlayUrlRef.current = null;
    }
  }, []);

  const renderProcessLayer = useCallback(async () => {
    if (!mapRef.current) return;
    if (!canQuery) {
      setError("Missing Sentinel credentials. Set VITE_SENTINEL_CLIENT_ID and VITE_SENTINEL_CLIENT_SECRET.");
      return;
    }

    const bounds = mapRef.current.getBounds();
    if (!bounds) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const bbox: [number, number, number, number] = [sw.lng(), sw.lat(), ne.lng(), ne.lat()];

      const dataFilter: Record<string, unknown> = {
        timeRange: {
          from: toIsoDate(fromDate),
          to: toIsoDate(toDate, true),
        },
      };
      if (mode !== "S5P_NO2") {
        dataFilter.maxCloudCoverage = maxCloud;
      }

      const payload = {
        input: {
          bounds: { bbox },
          data: [
            {
              type: getDataCollection(mode),
              dataFilter,
            },
          ],
        },
        output: {
          width: 1024,
          height: 1024,
          responses: [{ identifier: "default", format: { type: "image/png" } }],
        },
        evalscript: getEvalscript(mode),
      };

      const response = await fetch(SENTINEL_PROCESS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Process API failed (${response.status}): ${text.slice(0, 140)}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      clearOverlay();
      overlayUrlRef.current = objectUrl;

      const overlay = new google.maps.GroundOverlay(objectUrl, {
        north: ne.lat(),
        south: sw.lat(),
        east: ne.lng(),
        west: sw.lng(),
      });
      overlay.setMap(mapRef.current);
      overlayRef.current = overlay;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sentinel request failed");
    } finally {
      setLoading(false);
    }
  }, [canQuery, clearOverlay, fromDate, getAccessToken, maxCloud, mode, toDate]);

  const loadCatalogDates = useCallback(async () => {
    if (!mapRef.current || !canQuery) return;
    const bounds = mapRef.current.getBounds();
    if (!bounds) return;
    setError(null);

    try {
      const token = await getAccessToken();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();

      const body = {
        bbox: [sw.lng(), sw.lat(), ne.lng(), ne.lat()],
        datetime: `${toIsoDate(fromDate)}/${toIsoDate(toDate, true)}`,
        collections: [getDataCollection(mode)],
        limit: 10,
      };

      const response = await fetch(SENTINEL_CATALOG_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`Catalog API failed (${response.status})`);
      const json = (await response.json()) as { features?: Array<{ properties?: { datetime?: string } }> };
      const dates = (json.features || [])
        .map((f) => f.properties?.datetime || "")
        .filter(Boolean)
        .slice(0, 10);
      setCatalogDates(dates);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Catalog query failed");
    }
  }, [canQuery, fromDate, getAccessToken, mode, toDate]);

  useEffect(() => {
    return () => clearOverlay();
  }, [clearOverlay]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <h1 className="text-2xl font-bold text-[#1E293B]">Sentinel Historical Viewer</h1>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-600">Layer mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as SentinelLayerMode)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
            >
              <option value="S2_TRUE_COLOR">Sentinel-2 True Color</option>
              <option value="S2_NDVI">Sentinel-2 NDVI</option>
              <option value="S5P_NO2">Sentinel-5P NO2</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Max cloud %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={maxCloud}
              onChange={(e) => setMaxCloud(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
              disabled={mode === "S5P_NO2"}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={renderProcessLayer}
              disabled={loading}
              className="flex-1 bg-[#D52B1E] hover:bg-[#B91C1C] text-white rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Loading..." : "Render"}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadCatalogDates}
            className="bg-white border border-gray-200 hover:bg-gray-50 rounded-md px-3 py-2 text-sm"
          >
            Find acquisitions
          </button>
          <button
            onClick={clearOverlay}
            className="bg-white border border-gray-200 hover:bg-gray-50 rounded-md px-3 py-2 text-sm"
          >
            Clear overlay
          </button>
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</div>}

        {catalogDates.length > 0 && (
          <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md p-2">
            <div className="font-semibold text-gray-700 mb-1">Catalog dates (latest 10)</div>
            <div className="flex flex-wrap gap-2">
              {catalogDates.map((d) => (
                <span key={d} className="px-2 py-1 bg-white rounded border border-gray-200">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        <MapView
          className="w-full h-[70vh] rounded-lg border border-gray-200"
          initialCenter={{ lat: 52.45, lng: 4.75 }}
          initialZoom={10}
          onMapReady={(map) => {
            mapRef.current = map;
          }}
        />

        <p className="text-xs text-gray-500">
          Test mode: credentials are read from front-end env vars. For production, move OAuth and Process/Catalog calls to a backend proxy.
        </p>
      </div>
    </div>
  );
}

