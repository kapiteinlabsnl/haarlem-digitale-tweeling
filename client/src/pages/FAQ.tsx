/*
 * Design: "Haarlem Rood" — FAQ page
 */

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Wat is de digitale tweeling?",
    answer:
      "De digitale tweeling is een digitale kopie van de fysieke stad Haarlem. Het is een interactieve kaart waarop je allerlei data over de stad kunt bekijken, zoals informatie over bomen, monumenten, parkeergarages, energiedata en meer. De data wordt live opgehaald uit de open data van de gemeente Haarlem.",
  },
  {
    question: "Welke data is beschikbaar?",
    answer:
      "De digitale tweeling bevat data over diverse thema's: klimaat en bodem, energie en duurzaamheid, natuur en recreatie, wonen en leefomgeving, topografie en grenzen, infrastructuur en verkeer, en historie en cultuur. De data komt uit de GeoServer van de gemeente Haarlem en wordt regelmatig bijgewerkt.",
  },
  {
    question: "Hoe gebruik ik de kaart?",
    answer:
      "Ga naar de pagina 'Digitale Tweeling' via het menu. Aan de linkerkant zie je een paneel met kaartlagen, gegroepeerd per thema. Klik op een thema om het uit te klappen en vink de kaartlagen aan die je wilt zien. Je kunt ook zoeken op adres via de zoekbalk bovenin de kaart.",
  },
  {
    question: "Waar komt de data vandaan?",
    answer:
      "Alle data wordt opgehaald uit de open data services van de gemeente Haarlem. De geografische data is beschikbaar via een WFS (Web Feature Service) API op data.haarlem.nl. Statistieken en cijfers zijn beschikbaar via haarlem.incijfers.nl.",
  },
  {
    question: "Is de data actueel?",
    answer:
      "De data wordt regelmatig bijgewerkt door de gemeente Haarlem. De meeste datasets worden dagelijks of wekelijks vernieuwd. Bij elke dataset kun je in de eigenschappen zien wanneer de laatste update was (etl_run datum).",
  },
  {
    question: "Kan ik de data downloaden?",
    answer:
      "Ja, de onderliggende data is vrij beschikbaar als open data. Je kunt de data benaderen via de WFS API van de gemeente Haarlem (data.haarlem.nl/geoserver) of via de databank op haarlem.incijfers.nl.",
  },
  {
    question: "Ik heb een vraag of suggestie, waar kan ik terecht?",
    answer:
      "Voor vragen over de data kun je contact opnemen met de gemeente Haarlem via opendata@haarlem.nl of bel 14 023. Heb je suggesties voor nieuwe datasets of verbeteringen? Laat het ons weten via de contactpagina.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1E293B]">
            Veelgestelde vragen
          </h1>
          <p className="mt-4 text-[#475569] text-base leading-relaxed">
            Hier vind je antwoorden op de meest gestelde vragen over de digitale tweeling van Haarlem.
          </p>

          <div className="mt-10 space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-[#1E293B] text-[15px] pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${
                      openIndex === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openIndex === index && (
                  <div className="px-5 pb-4 text-[#475569] text-sm leading-relaxed border-t border-gray-100 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
