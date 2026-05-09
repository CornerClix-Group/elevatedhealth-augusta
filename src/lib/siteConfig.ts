export const SITE_CONFIG = {
  clinicName: "Elevated Health Augusta",
  tagline: "Wellness, the way it should have always been.",
  website: "elevatedhealthaugusta.com",
  address: {
    line1: "7013 Evans Town Center Blvd, Suite 203",
    cityStateZip: "Evans, GA 30809",
    full: "7013 Evans Town Center Blvd, Suite 203, Evans, GA 30809"
  },
  phone: "(706) 760-3470",
  phoneRaw: "7067603470",
  // bookingUrl removed: legacy Google Calendar iframe is no longer the
  // booking surface. All booking now flows through native SlotPicker
  // backed by book-iv-appointment / book-consult-appointment.
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
    // Legacy route aliases — kept so any in-flight outbound link from a
    // pre-rebrand email or print piece bounces home rather than 404.
    ketamine: "/",
    ivKetamineLegacy: "/",
    spravato: "/",
    hormoneReplacement: "/hormones",
    weightLoss: "/weightloss"
  }
} as const;
