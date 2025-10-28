// Google Analytics 4 tracking utilities

declare global {
  interface Window {
    gtag?: (
      command: string,
      ...args: any[]
    ) => void;
  }
}

/**
 * Tracks a custom event to GA4
 * @param eventName - Name of the event
 * @param eventParams - Optional parameters for the event
 */
export const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  } else {
    // Fallback for development/testing
    console.log('GA4 Event:', eventName, eventParams);
  }
};

/**
 * Tracks modal open events
 */
export const trackModalOpen = (modalName: string) => {
  trackEvent('modal_open', {
    modal_name: modalName,
  });
};

/**
 * Tracks form submission events
 */
export const trackFormSubmit = (formName: string, success: boolean) => {
  trackEvent('form_submit', {
    form_name: formName,
    success,
  });
};

/**
 * Tracks quiz completion events
 */
export const trackQuizComplete = (quizName: string, result: string) => {
  trackEvent('quiz_complete', {
    quiz_name: quizName,
    result,
  });
};

/**
 * Tracks CTA button clicks
 */
export const trackCTAClick = (ctaName: string, destination?: string) => {
  trackEvent('cta_click', {
    cta_name: ctaName,
    destination,
  });
};
