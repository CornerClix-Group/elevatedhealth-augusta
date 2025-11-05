export const SITE_CONFIG = {
  clinicName: "Elevated Health Augusta",
  address: {
    line1: "7013 Evans Town Center Blvd, Suite 203",
    cityStateZip: "Evans, GA 30809",
    full: "7013 Evans Town Center Blvd, Suite 203, Evans, GA 30809"
  },
  phone: "(706) 760-3470",
  phoneRaw: "7067603470",
  services: {
    primary: "IV Ketamine (infusion), SPRAVATO® (esketamine) nasal spray"
  },
  routes: {
    militaryVeteran: "/military-veteran",
    ivKetamine: "/iv-ketamine",
    spravato: "/spravato",
    hormoneReplacement: "/hormone-replacement",
    weightLoss: "/weight-loss"
  }
} as const;
