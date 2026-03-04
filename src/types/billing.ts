/**
 * @deprecated VPS plans are no longer used. All teams use the same shared VPS with containers.
 * This interface is kept for backward compatibility only.
 */
export interface VPSPlan {
    id: string;
    name: string;
    slug: string;
  price: number;
  stripe_price_id: string;
  specs: {
    cpu?: string;
    ram?: string;
    storage?: string;
    [key: string]: any;
  };
}

export interface Addon {
    id: string;
    name: string;
    slug: string;
  description: string;
  price: number;
  stripe_price_id: string;
  type: 'recurring' | 'one_time';
}

export interface OnboardingState {
  step: number;
  teamName: string;
  teamSlug: string;
  selectedAddonIds: string[];
}
