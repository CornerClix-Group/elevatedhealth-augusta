export const SITE_CONFIG = {
  clinicName: "Réveil",
  tagline: "Restore. Repair. Réveil.",
  website: "reveil.health",
  address: {
    line1: "7013 Evans Town Center Blvd, Suite 203",
    cityStateZip: "Evans, GA 30809",
    full: "7013 Evans Town Center Blvd, Suite 203, Evans, GA 30809"
  },
  phone: "(706) 760-3470",
  phoneRaw: "7067603470",
  bookingUrl: "https://calendar.google.com/calendar/appointments/schedules/AcZssZ0Bvq4ZKUeVHmDYS8aU45o_2Z0oi4uHvILuZr2wqv6tKLPC71WABKyOSrbCwIjzKPqReipYFqST?gv=true",
  services: {
    primary: "Hormone Optimization, IV Therapy, Peptide Medicine, Medical Weight Loss"
  },
  routes: {
    whatToExpect: "/what-to-expect",
    militaryVeteran: "/military-veteran",
    hormones: "/hormones",
    hormonesWomen: "/hormones-women",
    hormonesMen: "/hormones-men",
    ivLounge: "/iv-lounge",
    peptides: "/peptides",
    pricing: "/pricing",
    weightloss: "/weightloss",
    membership: "/membership",
    about: "/about",
    // Legacy routes
    ketamine: "/",
    ivKetamine: "/",
    spravato: "/",
    hormoneReplacement: "/hormones",
    weightLoss: "/weightloss"
  }
} as const;