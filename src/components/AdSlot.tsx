"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

const SLOT_IDS: Record<string, string | undefined> = {
  landing: process.env.NEXT_PUBLIC_ADSENSE_SLOT_LANDING,
  dashboard: process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD,
};

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

/** Drop into <head>/<body> once globally. Only renders if AdSense is configured. */
export function AdSenseHead() {
  if (!CLIENT_ID) return null;
  return (
    <Script
      id="adsbygoogle-js"
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`}
      crossOrigin="anonymous"
    />
  );
}

type Props = {
  location: keyof typeof SLOT_IDS;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  className?: string;
  /** When true, lays out a thin banner-shaped slot instead of the responsive default. */
  banner?: boolean;
};

export default function AdSlot({
  location,
  format = "auto",
  className = "",
  banner = false,
}: Props) {
  const slot = SLOT_IDS[location];
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!CLIENT_ID || !slot) return;
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      /* ad blocker or AdSense not yet loaded — fail silently */
    }
  }, [slot]);

  if (!CLIENT_ID || !slot) {
    if (process.env.NODE_ENV === "development") {
      return (
        <div
          className={`rounded-md border-2 border-dashed border-black/10 bg-slate-50 ${
            banner ? "py-3" : "py-8"
          } text-center text-xs text-ink/40 ${className}`}
        >
          ad slot · <span className="font-mono">{location}</span>
          <div className="mt-1 text-[10px] text-ink/30">
            set NEXT_PUBLIC_ADSENSE_CLIENT and NEXT_PUBLIC_ADSENSE_SLOT_
            {location.toUpperCase()} to enable
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className={className}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
