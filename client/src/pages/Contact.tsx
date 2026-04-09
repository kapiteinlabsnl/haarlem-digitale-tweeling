/*
 * Design: "Haarlem Rood" — Contact page
 */

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Phone, Mail, ExternalLink, MapPin } from "lucide-react";

const GROTE_MARKT_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663036375401/AwVEdTzybPW8rJNgmsa5rZ/haarlem-grote-markt_7c6d2fd8.png";

export default function Contact() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <div className="relative h-48 sm:h-64 overflow-hidden">
          <img
            src={GROTE_MARKT_IMAGE}
            alt="Grote Markt Haarlem"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B]/70 to-transparent" />
          <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Contact</h1>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <p className="text-[#475569] text-base leading-relaxed mb-10">
            Heb je vragen over de digitale tweeling van Haarlem, suggesties voor nieuwe
            datasets, of wil je meer informatie over de open data van de gemeente?
            Neem dan contact met ons op.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-[#F8FAFC] rounded-xl p-6 border border-gray-100">
              <div className="w-10 h-10 bg-[#D52B1E]/10 rounded-lg flex items-center justify-center mb-4">
                <Phone className="w-5 h-5 text-[#D52B1E]" />
              </div>
              <h3 className="font-bold text-[#1E293B] mb-1">Telefoon</h3>
              <a href="tel:14023" className="text-[#D52B1E] font-semibold text-lg hover:underline">
                14 023
              </a>
              <p className="text-sm text-[#64748B] mt-1">
                Maandag t/m vrijdag 08:30 - 17:00
              </p>
            </div>

            <div className="bg-[#F8FAFC] rounded-xl p-6 border border-gray-100">
              <div className="w-10 h-10 bg-[#D52B1E]/10 rounded-lg flex items-center justify-center mb-4">
                <Mail className="w-5 h-5 text-[#D52B1E]" />
              </div>
              <h3 className="font-bold text-[#1E293B] mb-1">E-mail</h3>
              <a href="mailto:opendata@haarlem.nl" className="text-[#D52B1E] font-semibold hover:underline">
                opendata@haarlem.nl
              </a>
              <p className="text-sm text-[#64748B] mt-1">
                Voor vragen over open data
              </p>
            </div>

            <div className="bg-[#F8FAFC] rounded-xl p-6 border border-gray-100">
              <div className="w-10 h-10 bg-[#D52B1E]/10 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="w-5 h-5 text-[#D52B1E]" />
              </div>
              <h3 className="font-bold text-[#1E293B] mb-1">Bezoekadres</h3>
              <p className="text-[#374151] text-sm">
                Gemeente Haarlem<br />
                Zijlvest 39<br />
                2011 VB Haarlem
              </p>
            </div>

            <div className="bg-[#F8FAFC] rounded-xl p-6 border border-gray-100">
              <div className="w-10 h-10 bg-[#D52B1E]/10 rounded-lg flex items-center justify-center mb-4">
                <ExternalLink className="w-5 h-5 text-[#D52B1E]" />
              </div>
              <h3 className="font-bold text-[#1E293B] mb-1">Online</h3>
              <a
                href="https://haarlem.nl/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D52B1E] font-semibold hover:underline text-sm"
              >
                haarlem.nl/contact
              </a>
              <p className="text-sm text-[#64748B] mt-1">
                Contactformulier gemeente
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
