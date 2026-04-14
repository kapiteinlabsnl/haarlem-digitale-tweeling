import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Digitale Tweeling", href: "/twin" },
  { label: "Sentinel", href: "/sentinel" },
  { label: "Veelgestelde vragen", href: "/veelgestelde-vragen" },
  { label: "Contact", href: "/contact" },
];

export function Header() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#D52B1E] rounded-sm flex items-center justify-center">
              <svg viewBox="0 0 40 40" className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="currentColor">
                <path d="M20 4L8 12v16l12 8 12-8V12L20 4zm0 4l8 5.3v10.7L20 29.3 12 24V13.3L20 8z" />
                <circle cx="20" cy="20" r="4" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-bold text-[#D52B1E] leading-tight tracking-tight">Gemeente</div>
              <div className="text-lg font-bold text-[#1E293B] leading-tight tracking-tight">Haarlem</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href === "/twin" && location.startsWith("/twin"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 text-[15px] font-medium rounded-md transition-colors ${
                    isActive
                      ? "text-[#D52B1E] bg-red-50"
                      : "text-[#1E293B] hover:text-[#D52B1E] hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-[#1E293B] hover:bg-gray-100 rounded-md"
            aria-label="Menu openen"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href === "/twin" && location.startsWith("/twin"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-4 py-3 text-[15px] font-medium rounded-md transition-colors ${
                    isActive
                      ? "text-[#D52B1E] bg-red-50"
                      : "text-[#1E293B] hover:text-[#D52B1E] hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
