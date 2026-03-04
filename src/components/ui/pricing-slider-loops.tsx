import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils"; // Optional utility if using clsx or cn for class merging

const PRICING_BREAKPOINTS = [
  { maxSubscribers: 1000, price: 0 },
  { maxSubscribers: 5000, price: 49 },
  { maxSubscribers: 10000, price: 99 },
  { maxSubscribers: 15000, price: 149 },
  { maxSubscribers: 25000, price: 199 },
  { maxSubscribers: 50000, price: 249 },
  { maxSubscribers: 100000, price: 399 },
  { maxSubscribers: 150000, price: 599 },
  { maxSubscribers: 200000, price: 799 },
];

const BREAKPOINT_SUB_VALUES = [
  ...Array.from({ length: 11 }, (_, i) => i * 100),
  5000, 10000, 15000, 25000, 50000, 100000, 150000, 200000,
  300000, 400000, 500000, 600000, 700000, 800000, 900000, 1000000,
];

const getPriceForSubscribers = (subs: number): { price: number | null; label: string } => {
  if (subs === 1000000) return { price: null, label: ">1M Subscribers" };

  const breakpoint = PRICING_BREAKPOINTS.find((tier) => subs <= tier.maxSubscribers);
  if (breakpoint) return { price: breakpoint.price, label: `${subs.toLocaleString()} subscribers` };

  // After 200k, add $400 for every additional 100k up to 1M
  const basePrice = 799;
  const extraSubs = subs - 200000;
  const extraUnits = Math.ceil(extraSubs / 100000);
  const price = basePrice + extraUnits * 400;
  return { price, label: `${subs.toLocaleString()} subscribers` };
};

export const LoopsPricingSlider: React.FC = () => {
  const [sliderIndex, setSliderIndex] = useState(0);

  const subscribers = BREAKPOINT_SUB_VALUES[sliderIndex];
  const { price, label } = getPriceForSubscribers(subscribers);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderIndex(Number(e.target.value));
  };

  return (
    <section className="max-w-3xl mx-auto p-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Card */}
        <div className="flex-1 rounded-xl border border-gray-200 p-8 relative">
          <h2 className="text-sm font-semibold text-neutral-800 mb-4">Calculate your pricing</h2>
          <div className="text-3xl font-bold text-black mb-8">{label}</div>
          <input
            type="range"
            min={0}
            max={BREAKPOINT_SUB_VALUES.length - 1}
            step={1}
            value={sliderIndex}
            onChange={handleSliderChange}
            className="w-full appearance-none h-3 rounded bg-gray-200 mb-12"
            style={{
              background: `linear-gradient(to right, #F97316 0%, #F97316 ${
                (sliderIndex / (BREAKPOINT_SUB_VALUES.length - 1)) * 100
              }%, #E5E7EB ${(sliderIndex / (BREAKPOINT_SUB_VALUES.length - 1)) * 100}%, #E5E7EB 100%)`,
            }}
          />

          <style>{`
            input[type='range']::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 28px;
              height: 28px;
              background: #ffffff;
              border: 2px solid #E5E7EB;
              border-radius: 50%;
              cursor: pointer;
              margin-top: -1px;
              box-shadow: 0 1px 5px rgba(192, 192, 192, 0.5);
              position: relative;
            }
            input[type='range']::-moz-range-thumb {
              width: 26px;
              height: 26px;
              background: #ffffff;
              border: 2px solid #E5E7EB;
              border-radius: 50%;
              cursor: pointer;
              box-shadow: 0 1px 5px rgba(192, 192, 192, 0.5);
            }
          `}</style>

          <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between text-sm text-neutral-500">
            <span>Need a custom solution?</span>
            <a
              href="mailto:chris@loops.so?subject=Enterprise%20pricing"
              className="text-black font-medium flex items-center"
            >
              Contact us <span className="ml-1">→</span>
            </a>
          </div>
        </div>

        {/* Right Card */}
        <div className="flex-1 rounded-xl border border-gray-200 p-8 bg-neutral-50">
          <h2 className="text-sm font-semibold text-neutral-800 mb-4">Your plan</h2>
          <div className="mb-2">
            <h3 className="text-3xl font-bold text-black mb-6">
              {price === 0 ? "Free" : price === null ? "Contact us" : `$${price} / mo`}
            </h3>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed mt-8">
            {price === 0
              ? "Our free plan allows up to 4,000 sends a month, enough to email your audience every week. All features are included. A small 'Powered by Loops' footer will be attached."
              : price === null
              ? "Need custom support for >1M subscribers? Contact us for enterprise pricing."
              : "Enjoy unlimited email sending to your subscribers and free transactional sending to those not stored in your audience. All features are included."}
          </p>
          <a
            href="https://app.loops.so/register"
            className="mt-8 inline-block bg-black text-white px-6 py-3 rounded-md font-semibold text-sm"
          >
            {price === null ? "Contact us" : "Get started"}
          </a>
        </div>
      </div>
    </section>
  );
};

// Generic, configurable pricing slider using the same UI
export type PricingSliderProps = {
  values: number[];
  getLabel: (value: number) => string;
  getPrice: (value: number) => { price: number | null; label?: string };
  leftTitle?: string;
  className?: string;
  renderRight?: (ctx: { value: number; price: number | null; label?: string }) => React.ReactNode;
  onValueChange?: (value: number, index: number) => void;
};

export const PricingSlider: React.FC<PricingSliderProps> = ({
  values,
  getLabel,
  getPrice,
  leftTitle = "Calculate your pricing",
  className,
  renderRight,
  onValueChange,
}) => {
  const [sliderIndex, setSliderIndex] = useState(0);
  const maxIndex = useMemo(() => Math.max(0, values.length - 1), [values.length]);
  const value = values[Math.min(sliderIndex, maxIndex)] ?? values[0] ?? 0;
  const { price, label } = getPrice(value);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextIndex = Number(e.target.value);
    setSliderIndex(nextIndex);
    const nextValue = values[Math.min(nextIndex, maxIndex)] ?? values[0] ?? 0;
    onValueChange?.(nextValue, nextIndex);
  };

  return (
    <section className={cn("max-w-5xl mx-auto p-6", className)}>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Card */}
        <div className="flex-1 rounded-xl border border-white/40 dark:border-white/20 bg-black/5 dark:bg-white/10 p-8 relative backdrop-blur-sm shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-4">{leftTitle}</h2>
          <div className="text-3xl font-bold text-black dark:text-white mb-8">{getLabel(value)}</div>
          <input
            type="range"
            min={0}
            max={maxIndex}
            step={1}
            value={sliderIndex}
            onChange={handleSliderChange}
            className="w-full appearance-none h-3 rounded bg-gray-200 mb-12"
            style={{
              background: `linear-gradient(to right, rgb(0,0,0) 0%, rgb(0,0,0) ${
                (sliderIndex / (maxIndex || 1)) * 100
              }%, #E5E7EB ${(sliderIndex / (maxIndex || 1)) * 100}%, #E5E7EB 100%)`,
            }}
          />

          <style>{`
            input[type='range']::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 28px;
              height: 28px;
              background: #ffffff;
              border: 2px solid #E5E7EB;
              border-radius: 50%;
              cursor: pointer;
              margin-top: -1px;
              box-shadow: 0 1px 5px rgba(192, 192, 192, 0.5);
              position: relative;
            }
            input[type='range']::-moz-range-thumb {
              width: 26px;
              height: 26px;
              background: #ffffff;
              border: 2px solid #E5E7EB;
              border-radius: 50%;
              cursor: pointer;
              box-shadow: 0 1px 5px rgba(192, 192, 192, 0.5);
            }
          `}</style>

          <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
            <span>{label ?? ""}</span>
          </div>
        </div>

        {/* Right Card */}
        <div className="flex-1 rounded-xl border border-gray-200 p-8 bg-neutral-50 dark:bg-neutral-900">
          {renderRight ? (
            renderRight({ value, price, label })
          ) : (
            <div>
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Your plan</h2>
              <div className="mb-2">
                <h3 className="text-3xl font-bold text-black dark:text-white mb-6">
                  {price === null ? "Contact us" : `$${price} / mo`}
                </h3>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
