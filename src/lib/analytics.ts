declare global {
  interface Window {
    umami?: {
      track: (eventName: string, data?: Record<string, unknown>) => void;
    };
  }
}

export const initAnalytics = (): void => {
  const scriptUrl = import.meta.env.VITE_UMAMI_SCRIPT_URL as string | undefined;
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined;

  if (!scriptUrl || !websiteId) return;

  const script = document.createElement('script');
  script.defer = true;
  script.src = scriptUrl;
  script.dataset.websiteId = websiteId;
  document.head.appendChild(script);
};

export const trackEvent = (
  eventName: string,
  data?: Record<string, unknown>,
): void => {
  window.umami?.track(eventName, data);
};
