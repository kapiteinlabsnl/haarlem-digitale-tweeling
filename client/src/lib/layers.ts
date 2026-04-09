export interface LayerConfig {
  id: string;
  name: string;
  wfsLayer: string;
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
      { id: "bodemkwaliteit", name: "Bodemkwaliteitskaart", wfsLayer: "bodemkwaliteitskaart_2023", color: "#8B5CF6", visible: false, category: "klimaat" },
      { id: "waterbeleid", name: "Ambitie beleid water", wfsLayer: "ambitie_beleid_water", color: "#3B82F6", visible: false, category: "klimaat" },
      { id: "groen_potentie", name: "Groen potentie", wfsLayer: "groen_potentie", color: "#10B981", visible: false, category: "klimaat" },
    ],
  },
  {
    id: "energie",
    name: "Energie",
    icon: "zap",
    description: "Zonnepanelen, laadpalen en duurzame energie",
    color: "#F59E0B",
    layers: [
      { id: "zonnekansenkaart", name: "Zonnekansenkaart", wfsLayer: "zonnekansenkaart", color: "#F59E0B", visible: false, category: "energie" },
      { id: "laadpalen", name: "Laadpalen", wfsLayer: "laadpalen", color: "#10B981", visible: false, category: "energie" },
    ],
  },
  {
    id: "natuur",
    name: "Natuur en recreatie",
    icon: "trees",
    description: "Bomen, groenvoorzieningen, speeltoestellen en hondenuitlaatgebieden",
    color: "#16A34A",
    layers: [
      { id: "bomen", name: "Bomen", wfsLayer: "bor_bomen", color: "#16A34A", visible: false, category: "natuur" },
      { id: "speeltoestellen", name: "Speeltoestellen", wfsLayer: "speeltoestellen", color: "#8B5CF6", visible: false, category: "natuur" },
      { id: "hondlosloop", name: "Hondenuitlaatgebieden", wfsLayer: "hondlosloop", color: "#D97706", visible: false, category: "natuur" },
      { id: "openbaar_groen", name: "Openbaar groen", wfsLayer: "openbaar_groen", color: "#059669", visible: false, category: "natuur" },
    ],
  },
  {
    id: "wonen",
    name: "Wonen en leefomgeving",
    icon: "building",
    description: "Wijken, buurten, kinderopvang en onderwijsinstellingen",
    color: "#EC4899",
    layers: [
      { id: "wijken", name: "Wijken", wfsLayer: "wijk", color: "#EC4899", visible: false, category: "wonen" },
      { id: "buurten", name: "Buurten", wfsLayer: "buurt", color: "#F472B6", visible: false, category: "wonen" },
      { id: "kinderopvang", name: "Kinderopvanglocaties", wfsLayer: "kinderopvanglocaties", color: "#A855F7", visible: false, category: "wonen" },
      { id: "onderwijs", name: "Onderwijsinstellingen", wfsLayer: "onderwijsinstellingen", color: "#6366F1", visible: false, category: "wonen" },
    ],
  },
  {
    id: "topografie",
    name: "Topografie en grenzen",
    icon: "map-pin",
    description: "Gemeentegrenzen, stadsdelen en postcodegebieden",
    color: "#6366F1",
    layers: [
      { id: "gemeente_grenzen", name: "Gemeentegrenzen", wfsLayer: "gemeente_grenzen", color: "#6366F1", visible: false, category: "topografie" },
      { id: "stadsdelen", name: "Stadsdelen", wfsLayer: "stadsdeel", color: "#8B5CF6", visible: false, category: "topografie" },
      { id: "postcode4", name: "Postcode 4 posities", wfsLayer: "postcode4", color: "#A78BFA", visible: false, category: "topografie" },
    ],
  },
  {
    id: "infrastructuur",
    name: "Infrastructuur en verkeer",
    icon: "road",
    description: "Parkeergarages, parkeerzones, lichtmasten en riolering",
    color: "#64748B",
    layers: [
      { id: "parkeergarages", name: "Parkeergarages", wfsLayer: "parkeergarages", color: "#3B82F6", visible: false, category: "infrastructuur" },
      { id: "parkeerzones", name: "Parkeerzones", wfsLayer: "parkeerzones", color: "#64748B", visible: false, category: "infrastructuur" },
      { id: "lichtmasten", name: "Lichtmasten", wfsLayer: "bor_lichtmasten", color: "#EAB308", visible: false, category: "infrastructuur" },
      { id: "afvalinzamel", name: "Afvalinzamelpunten", wfsLayer: "bor_afvalinzamel", color: "#84CC16", visible: false, category: "infrastructuur" },
    ],
  },
  {
    id: "cultuur",
    name: "Historie en cultuur",
    icon: "landmark",
    description: "Rijksmonumenten, beschermde stadsgezichten en cultureel erfgoed",
    color: "#B45309",
    layers: [
      { id: "monumenten", name: "Rijksmonumenten", wfsLayer: "rce_rijksmonumenten", color: "#B45309", visible: false, category: "cultuur" },
      { id: "beschermd_stadsgezicht", name: "Beschermd stadsgezicht", wfsLayer: "beschermd_stadsgezicht", color: "#92400E", visible: false, category: "cultuur" },
    ],
  },
];
