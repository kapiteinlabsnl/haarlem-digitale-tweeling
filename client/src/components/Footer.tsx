import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-[#1E293B] text-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Navigation */}
          <div>
            <h3 className="text-base font-bold mb-4 text-white/90">Ga naar</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-white/70 hover:text-white text-sm transition-colors">Home</Link></li>
              <li><Link href="/twin" className="text-white/70 hover:text-white text-sm transition-colors">Digitale Tweeling</Link></li>
              <li><Link href="/veelgestelde-vragen" className="text-white/70 hover:text-white text-sm transition-colors">Veelgestelde vragen</Link></li>
              <li><Link href="/contact" className="text-white/70 hover:text-white text-sm transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-base font-bold mb-4 text-white/90">Contact</h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li>T: <a href="tel:14023" className="hover:text-white transition-colors">14 023</a></li>
              <li>
                <a href="https://haarlem.nl/contact" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Contact info
                </a>
              </li>
            </ul>
          </div>

          {/* General */}
          <div>
            <h3 className="text-base font-bold mb-4 text-white/90">Algemeen</h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a href="https://haarlem.nl/open-data" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Open data
                </a>
              </li>
              <li>
                <a href="https://haarlem.incijfers.nl/databank" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Haarlem in cijfers
                </a>
              </li>
              <li>
                <a href="https://haarlem.nl/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  Privacyverklaring
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-center text-xs text-white/40">
          &copy; {new Date().getFullYear()} Gemeente Haarlem — Digitale Tweeling
        </div>
      </div>
    </footer>
  );
}
