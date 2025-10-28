export const SITE_CONFIG = {
  clinicName: "Elevated Health Augusta",
  address: {
    line1: "7013 Evans Town Center Blvd, Suite 203",
    cityStateZip: "Evans, GA 30809",
    full: "7013 Evans Town Center Blvd, Suite 203, Evans, GA 30809"
  },
  phone: "(706) 550-9202",
  phoneRaw: "7065509202",
  services: {
    primary: "IV Ketamine (infusion), SPRAVATO® (esketamine) nasal spray"
  },
  routes: {
    militaryVeteran: "/military-veteran",
    ivKetamine: "/iv-ketamine",
    spravato: "/spravato"
  }
} as const;
