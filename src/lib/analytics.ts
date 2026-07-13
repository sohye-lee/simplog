// Google Analytics 4 (gtag.js). One GA4 property covers web + the
// iOS/Android WebViews; each hit is tagged with the Capacitor platform
// (web / ios / android) so you can segment by app in GA.
//
// Privacy: off unless VITE_GA_ID is set, off in dev, and off when the
// browser sends Do Not Track. Disclosed in the privacy policy.
import { Capacitor } from '@capacitor/core';

const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function doNotTrack(): boolean {
  const v = navigator.doNotTrack || (window as unknown as { doNotTrack?: string }).doNotTrack;
  return v === '1' || v === 'yes';
}

export function initAnalytics(): void {
  if (!GA_ID || import.meta.env.DEV || doNotTrack()) return;

  const platform = Capacitor.getPlatform(); // 'web' | 'ios' | 'android'

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer!.push(arguments); };
  window.gtag('js', new Date());
  // IP anonymization on; tag every event with the platform.
  window.gtag('config', GA_ID, { anonymize_ip: true, app_platform: platform });
  window.gtag('set', 'user_properties', { platform });

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

// Fire a custom event (e.g. track('add_entry', { kind: 'expense' })).
export function track(event: string, params?: Record<string, unknown>): void {
  if (window.gtag) window.gtag('event', event, params);
}
