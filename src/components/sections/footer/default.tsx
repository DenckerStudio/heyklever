import { ReactNode } from "react";

import { cn } from "@/lib/utils";

import Image from "next/image";
import {
  Footer,
  FooterBottom,
} from "../../ui/footer";
import { ModeToggle } from "../../ui/mode-toggle";
import { AnimatedThemeToggler } from "../../ui/animated-theme-toggler";

interface FooterLink {
  text: string;
  href: string;
}

interface FooterProps {
  logo?: ReactNode;
  name?: string;
  copyright?: string;
  policies?: FooterLink[];
  showModeToggle?: boolean;
  className?: string;
}

export default function FooterSection({
  logo = <Image src="/logo-icon.png" alt="Klever" width={100} height={100} />,
  name = "Klever AI",
  copyright = "© 2025 Klever. All rights reserved",
  policies = [
    { text: "Privacy Policy", href: "/privacy" },
    { text: "Terms of Service", href: "/terms" },
  ],
  showModeToggle = true,
  className,
}: FooterProps) {
  return (
    <footer className={cn("bg-background w-full px-4", className)}>
      <div className="max-w-container mx-auto">
        <Footer>
          <FooterBottom>
            <div>{copyright}</div>
            <div className="flex items-center gap-4">
              {policies.map((policy, index) => (
                <a key={index} href={policy.href}>
                  {policy.text}
                </a>
              ))}
              {showModeToggle && <AnimatedThemeToggler />}
            </div>
          </FooterBottom>
        </Footer>
      </div>
    </footer>
  );
}
