"use client";

import Link from "next/link";
import Image from "next/image";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Benefits", href: "#benefits" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Documentation", href: "/docs" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Contact", href: "#contact" },
    { label: "Resources", href: "#" },
  ],
};

export function LandingFooter() {
  return (
    <footer className="border-t border-white/5 px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/logo-icon.png"
                alt="Klever AI"
                width={24}
                height={24}
              />
              <span className="text-sm font-semibold text-white">
                Klever AI
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/40">
              AI-native technology that turns scattered knowledge into connected
              workflows. From documents to decisions.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <Link
                href="/signup"
                className="text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
              >
                Ready for the future of team intelligence?
              </Link>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="mb-4 text-xs font-medium uppercase tracking-[0.15em] text-white/30">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/50 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-white/30 md:flex-row">
          <span>&copy; {new Date().getFullYear()} Klever AI. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="transition hover:text-white/50">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition hover:text-white/50">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
