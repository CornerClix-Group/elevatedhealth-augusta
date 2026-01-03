/**
 * Service Feature Flag Configuration
 * 
 * This file controls which services are visible across the entire application.
 * To sunset a service, set its value to `false`.
 * To re-enable a service, set its value to `true`.
 * 
 * IMPORTANT: Changes here affect navigation, pricing, booking modals, 
 * chat functions, provider dashboard, and patient portal.
 */

export const ACTIVE_SERVICES = {
  // ACTIVE SERVICES - Core revenue drivers
  ketamine: true,      // Neural Restoration / Mental Wellness
  weightLoss: true,    // Metabolic Reset / GLP-1 Therapy  
  hormones: true,      // Biological Reset / HRT
  
  // SUNSETTED SERVICES - Set to false to hide across app
  ivLounge: false,        // IV Hydration Therapy
  peptides: false,        // Peptide Therapy
  hairRestoration: false, // Hair Restoration
  sexualWellness: false,  // Sexual Wellness
} as const;

// Type for service keys
export type ServiceKey = keyof typeof ACTIVE_SERVICES;

// Helper function to check if a service is active
export const isServiceActive = (service: ServiceKey): boolean => 
  ACTIVE_SERVICES[service];

// Get all active service keys
export const getActiveServices = (): ServiceKey[] =>
  (Object.keys(ACTIVE_SERVICES) as ServiceKey[]).filter(key => ACTIVE_SERVICES[key]);

// Get all sunsetted service keys
export const getSunsettedServices = (): ServiceKey[] =>
  (Object.keys(ACTIVE_SERVICES) as ServiceKey[]).filter(key => !ACTIVE_SERVICES[key]);
