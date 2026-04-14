export interface LayerConfig {
  id: string;
  name: string;
  source: "haarlem-wfs" | "ahn-wms";
  wfsLayer?: string;
  ahnWmsBaseUrl?: string;
  ahnWmsLayer?: string;
  ahnWmsFormat?: string;
  ahnTransparent?: boolean;
  icon?: string;
  color: string;
  visible: boolean;
  category: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  layers: LayerConfig[];
}

export const HAARLEM_CENTER = { lat: 52.3812, lng: 4.6369 };
export const DEFAULT_ZOOM = 14;

export const WFS_BASE = "https://data.haarlem.nl/geoserver/wfs";

export function buildWfsUrl(typeName: string, maxFeatures = 500, srsName = "EPSG:4326") {
  return `${WFS_BASE}?service=WFS&version=2.0.0&request=GetFeature&typeName=gemeentehaarlem:${typeName}&outputFormat=application/json&count=${maxFeatures}&srsName=${srsName}`;
}

export const themes: ThemeConfig[] = [
  {
    id: "klimaat",
    name: "Klimaat",
    icon: "cloud-sun",
    description: "Klimaatdata, bodemkwaliteit en waterbeleid",
    color: "#2563EB",
    layers: [
      { id: "bodemkwaliteit", name: "Bodemkwaliteitskaart", source: "haarlem-wfs", wfsLayer: "bodemkwaliteitskaart_2023", color: "#8B5CF6", visible: false, category: "klimaat" },
      { id: "waterbeleid", name: "Ambitie beleid water", source: "haarlem-wfs", wfsLayer: "ambitie_beleid_water", color: "#3B82F6", visible: false, category: "klimaat" },
      { id: "groen_potentie", name: "Groen potentie", source: "haarlem-wfs", wfsLayer: "groen_potentie", color: "#10B981", visible: false, category: "klimaat" },
    ],
  },
  {
    id: "energie",
    name: "Energie",
    icon: "zap",
    description: "Zonnepanelen, laadpalen en duurzame energie",
    color: "#F59E0B",
    layers: [
      { id: "zonnekansenkaart", name: "Zonnekansenkaart", source: "haarlem-wfs", wfsLayer: "zonnekansenkaart", color: "#F59E0B", visible: false, category: "energie" },
      { id: "laadpalen", name: "Laadpalen", source: "haarlem-wfs", wfsLayer: "laadpalen", color: "#10B981", visible: false, category: "energie" },
    ],
  },
  {
    id: "natuur",
    name: "Natuur en recreatie",
    icon: "trees",
    description: "Bomen, groenvoorzieningen, speeltoestellen en hondenuitlaatgebieden",
    color: "#16A34A",
    layers: [
      { id: "bomen", name: "Bomen", source: "haarlem-wfs", wfsLayer: "bor_bomen", color: "#16A34A", visible: false, category: "natuur" },
      { id: "speeltoestellen", name: "Speeltoestellen", source: "haarlem-wfs", wfsLayer: "speeltoestellen", color: "#8B5CF6", visible: false, category: "natuur" },
      { id: "hondlosloop", name: "Hondenuitlaatgebieden", source: "haarlem-wfs", wfsLayer: "hondlosloop", color: "#D97706", visible: false, category: "natuur" },
      { id: "openbaar_groen", name: "Openbaar groen", source: "haarlem-wfs", wfsLayer: "openbaar_groen", color: "#059669", visible: false, category: "natuur" },
    ],
  },
  {
    id: "wonen",
    name: "Wonen en leefomgeving",
    icon: "building",
    description: "Wijken, buurten, kinderopvang en onderwijsinstellingen",
    color: "#EC4899",
    layers: [
      { id: "wijken", name: "Wijken", source: "haarlem-wfs", wfsLayer: "wijk", color: "#EC4899", visible: false, category: "wonen" },
      { id: "buurten", name: "Buurten", source: "haarlem-wfs", wfsLayer: "buurt", color: "#F472B6", visible: false, category: "wonen" },
      { id: "kinderopvang", name: "Kinderopvanglocaties", source: "haarlem-wfs", wfsLayer: "kinderopvanglocaties", color: "#A855F7", visible: false, category: "wonen" },
      { id: "onderwijs", name: "Onderwijsinstellingen", source: "haarlem-wfs", wfsLayer: "onderwijsinstellingen", color: "#6366F1", visible: false, category: "wonen" },
    ],
  },
  {
    id: "topografie",
    name: "Topografie en grenzen",
    icon: "map-pin",
    description: "Gemeentegrenzen, stadsdelen en postcodegebieden",
    color: "#6366F1",
    layers: [
      { id: "gemeente_grenzen", name: "Gemeentegrenzen", source: "haarlem-wfs", wfsLayer: "gemeente_grenzen", color: "#6366F1", visible: false, category: "topografie" },
      { id: "stadsdelen", name: "Stadsdelen", source: "haarlem-wfs", wfsLayer: "stadsdeel", color: "#8B5CF6", visible: false, category: "topografie" },
      { id: "postcode4", name: "Postcode 4 posities", source: "haarlem-wfs", wfsLayer: "postcode4", color: "#A78BFA", visible: false, category: "topografie" },
      {
        id: "ahn_dsm",
        name: "AHN Hoogtemodel (DSM 0.5m)",
        source: "ahn-wms",
        ahnWmsBaseUrl: "https://service.pdok.nl/rws/ahn/wms/v1_0",
        ahnWmsLayer: "ahn3_05m_dsm",
        ahnWmsFormat: "image/png",
        ahnTransparent: true,
        color: "#06B6D4",
        visible: false,
        category: "topografie",
      },
      {
        id: "ahn_dtm",
        name: "AHN Terreinhoogte (DTM 0.5m)",
        source: "ahn-wms",
        ahnWmsBaseUrl: "https://service.pdok.nl/rws/ahn/wms/v1_0",
        ahnWmsLayer: "ahn3_05m_dtm",
        ahnWmsFormat: "image/png",
        ahnTransparent: true,
        color: "#0EA5E9",
        visible: false,
        category: "topografie",
      },
      {
        id: "ahn_footage",
        name: "AHN Footage / Beeldmateriaal",
        source: "ahn-wms",
        ahnWmsBaseUrl: "https://service.pdok.nl/rws/ahn/wms/v1_0",
        ahnWmsLayer: "ahn3_05m_dsm",
        ahnWmsFormat: "image/jpeg",
        ahnTransparent: false,
        color: "#2563EB",
        visible: false,
        category: "topografie",
      },
    ],
  },
  {
    id: "infrastructuur",
    name: "Infrastructuur en verkeer",
    icon: "road",
    description: "Parkeergarages, parkeerzones, lichtmasten en riolering",
    color: "#64748B",
    layers: [
      { id: "parkeergarages", name: "Parkeergarages", source: "haarlem-wfs", wfsLayer: "parkeergarages", color: "#3B82F6", visible: false, category: "infrastructuur" },
      { id: "parkeerzones", name: "Parkeerzones", source: "haarlem-wfs", wfsLayer: "parkeerzones", color: "#64748B", visible: false, category: "infrastructuur" },
      { id: "lichtmasten", name: "Lichtmasten", source: "haarlem-wfs", wfsLayer: "bor_lichtmasten", color: "#EAB308", visible: false, category: "infrastructuur" },
      { id: "afvalinzamel", name: "Afvalinzamelpunten", source: "haarlem-wfs", wfsLayer: "bor_afvalinzamel", color: "#84CC16", visible: false, category: "infrastructuur" },
    ],
  },
  {
    id: "cultuur",
    name: "Historie en cultuur",
    icon: "landmark",
    description: "Rijksmonumenten, beschermde stadsgezichten en cultureel erfgoed",
    color: "#B45309",
    layers: [
      { id: "monumenten", name: "Rijksmonumenten", source: "haarlem-wfs", wfsLayer: "rce_rijksmonumenten", color: "#B45309", visible: false, category: "cultuur" },
      { id: "beschermd_stadsgezicht", name: "Beschermd stadsgezicht", source: "haarlem-wfs", wfsLayer: "beschermd_stadsgezicht", color: "#92400E", visible: false, category: "cultuur" },
    ],
  },
];
