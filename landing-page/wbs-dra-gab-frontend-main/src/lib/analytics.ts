// Google Tag Manager
// Expects: GTM-XXXXXX
export const GTM_ID = import.meta.env.VITE_GTM_ID;

// Google Analytics 4
// Expects: G-XXXXXXXXXX
export const GA4_ID = import.meta.env.VITE_GA4_ID;

// Meta Pixel
// Expects: XXXXXXXXXXXXXXX
export const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;

type EventParams = Record<string, any>;

/**
 * Generic event tracker that pushes to all active analytics services.
 * Safe to call even if no analytics are enabled.
 */
export function trackEvent(name: string, params?: EventParams) {
  // Google Analytics 4 (via gtag)
  if (GA4_ID && typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', name, params);
  }

  // Meta Pixel (via fbq)
  if (META_PIXEL_ID && typeof window !== 'undefined' && (window as any).fbq) {
    // Meta Pixel uses 'trackCustom' for generic named events, or 'track' for standard ones.
    // We'll default to 'trackCustom' for arbitrary names to be safe, 
    // unless it matches a standard event, but for simplicity here we use trackCustom for non-standard.
    // Standard events list is long, let's keep it simple:
    (window as any).fbq('trackCustom', name, params);
  }

  // Google Tag Manager (via dataLayer)
  if (GTM_ID && typeof window !== 'undefined') {
    const dataLayer = (window as any).dataLayer || [];
    dataLayer.push({
      event: name,
      ...params,
    });
  }
}

// Initializer function to inject scripts
export function initializeAnalytics() {
  if (typeof window === 'undefined') return;

  // Prevent double injection
  if ((window as any).__ANALYTICS_INITIALIZED__) return;
  (window as any).__ANALYTICS_INITIALIZED__ = true;

  // 1. Google Tag Manager
  if (GTM_ID) {
    const script = document.createElement('script');
    script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`;
    document.head.appendChild(script);
  }

  // 2. Google Analytics 4
  if (GA4_ID) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    document.head.appendChild(script);

    const configScript = document.createElement('script');
    configScript.innerHTML = `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_ID}');`;
    document.head.appendChild(configScript);
  }

  // 3. Meta Pixel
  if (META_PIXEL_ID) {
    const script = document.createElement('script');
    script.innerHTML = `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`;
    document.head.appendChild(script);

    const noscript = document.createElement('noscript');
    const img = document.createElement('img');
    img.height = 1;
    img.width = 1;
    img.style.display = 'none';
    img.src = `https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`;
    noscript.appendChild(img);
    document.body.appendChild(noscript);
  }
}
