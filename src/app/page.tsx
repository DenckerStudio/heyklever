import { SmoothScrollProvider } from "@/components/landing/smooth-scroll-provider";
import { LandingHomeContent } from "@/components/landing/landing-home-content";

export default function Home() {
  return (
    <SmoothScrollProvider>
      <LandingHomeContent />
    </SmoothScrollProvider>
  );
}
