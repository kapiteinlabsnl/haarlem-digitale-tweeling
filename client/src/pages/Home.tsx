/*
 * Design: "Haarlem Rood" — Municipal Digital Design
 * Primary: #D52B1E (Haarlem red), White background, Dark text
 * Font: Source Sans 3
 * Layout: Welcome banner → Theme grid (red tiles) → Map preview → Footer
 */

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { themes } from "@/lib/layers";
import { Link } from "wouter";
import {
  CloudSun,
  Zap,
  Trees,
  Building,
  MapPin,
  Route,
  Landmark,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

const HERO_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663036375401/AwVEdTzybPW8rJNgmsa5rZ/haarlem-hero-aerial_6de27899.png";
const MAP_PREVIEW = "https://d2xsxph8kpxj0f.cloudfront.net/310519663036375401/AwVEdTzybPW8rJNgmsa5rZ/haarlem-map-preview_f7aef422.png";
const SPAARNE_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663036375401/AwVEdTzybPW8rJNgmsa5rZ/haarlem-stadtsgezicht_1b112ae8.png";

const iconMap: Record<string, React.ReactNode> = {
  "cloud-sun": <CloudSun className="w-10 h-10 sm:w-12 sm:h-12" />,
  "zap": <Zap className="w-10 h-10 sm:w-12 sm:h-12" />,
  "trees": <Trees className="w-10 h-10 sm:w-12 sm:h-12" />,
  "building": <Building className="w-10 h-10 sm:w-12 sm:h-12" />,
  "map-pin": <MapPin className="w-10 h-10 sm:w-12 sm:h-12" />,
  "road": <Route className="w-10 h-10 sm:w-12 sm:h-12" />,
  "landmark": <Landmark className="w-10 h-10 sm:w-12 sm:h-12" />,
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE}
            alt="Luchtfoto Haarlem"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1E293B]/80 via-[#1E293B]/50 to-transparent" />
        </div>
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
              Welkom bij de digitale tweeling van de gemeente Haarlem
            </h1>
            <p className="mt-5 text-base sm:text-lg text-white/85 leading-relaxed max-w-xl">
              De digitale tweeling kun je zien als het digitale broertje van de stad.
              In deze digitale versie kun je de regio bekijken, plannen zien en in de
              toekomst ook zelf meedenken. Zo snap je beter wat er speelt in de regio
              en kun je makkelijker meepraten over de toekomst.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/twin"
                className="inline-flex items-center gap-2 bg-[#D52B1E] hover:bg-[#B91C1C] text-white px-6 py-3 rounded-md font-semibold text-sm transition-colors"
              >
                Bekijk de kaart
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="https://haarlem.incijfers.nl/databank"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white px-6 py-3 rounded-md font-semibold text-sm transition-colors backdrop-blur-sm border border-white/20"
              >
                Haarlem in cijfers
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Intro text */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <p className="text-[#1E293B] text-base sm:text-lg leading-relaxed max-w-3xl">
          Om te starten, selecteer het thema waar je meer over wilt weten:
        </p>
      </section>

      {/* Theme Grid */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {themes.map((theme) => (
            <Link
              key={theme.id}
              href={`/twin/${theme.id}`}
              className="group relative bg-[#D52B1E] rounded-lg overflow-hidden p-6 sm:p-8 flex flex-col justify-between min-h-[160px] hover:bg-[#B91C1C] transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            >
              <div className="absolute top-4 right-4 text-white/25 group-hover:text-white/35 transition-colors">
                {iconMap[theme.icon]}
              </div>
              <div className="mt-auto">
                <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">
                  {theme.name}
                </h3>
                <p className="mt-1 text-sm text-white/70 leading-snug">
                  {theme.description}
                </p>
              </div>
            </Link>
          ))}

          {/* "Bekijk alle kaartlagen" tile */}
          <Link
            href="/twin"
            className="group relative bg-[#FEF2F2] border-2 border-[#D52B1E] rounded-lg overflow-hidden p-6 sm:p-8 flex flex-col justify-center items-center min-h-[160px] hover:bg-[#FEE2E2] transition-all duration-200 hover:scale-[1.02]"
          >
            <MapPin className="w-8 h-8 text-[#D52B1E] mb-2" />
            <span className="text-[#D52B1E] font-bold text-base text-center">
              Of bekijk alle kaartlagen
            </span>
          </Link>
        </div>
      </section>

      {/* Map Preview Section */}
      <section className="bg-[#F8FAFC] py-12 sm:py-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1E293B]">
                Selecteer een thema
              </h2>
              <p className="mt-4 text-[#475569] text-base leading-relaxed">
                Klik op een thema hierboven om meer informatie te zien op de interactieve kaart.
                Je kunt ook direct naar de kaart gaan en zelf kaartlagen selecteren.
              </p>
              <p className="mt-3 text-[#475569] text-base leading-relaxed">
                De data wordt live opgehaald uit de open data van de gemeente Haarlem.
                Je ziet bijvoorbeeld waar bomen staan, waar monumenten zijn, of waar
                parkeergarages te vinden zijn.
              </p>
              <Link
                href="/twin"
                className="mt-6 inline-flex items-center gap-2 bg-[#D52B1E] hover:bg-[#B91C1C] text-white px-5 py-2.5 rounded-md font-semibold text-sm transition-colors"
              >
                Open de kaart
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="relative rounded-xl overflow-hidden shadow-xl">
              <img
                src={MAP_PREVIEW}
                alt="Kaart preview Haarlem"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* City Image Section */}
      <section className="relative h-[300px] sm:h-[400px] overflow-hidden">
        <img
          src={SPAARNE_IMAGE}
          alt="Het Spaarne, Haarlem"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B]/60 to-transparent" />
        <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8">
          <p className="text-white/80 text-sm">Het Spaarne, Haarlem</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
