// Shared client registry. Add new clients here only
const CLIENTS = [
  {
    serials: ["SWI001", "SWI002"],
    nameMatch: "Changi",
    logoPng: "/client_logos/changi_airport/ChangiAirport_Logo.png",
    logoSvg: "/client_logos/changi_airport/ChangiAirport_Logo(White).svg",
  },
  {
    serials: ["SWI003"],
    nameMatch: "Milford Haven",
    logoPng: "/client_logos/port_of_milford_haven/PortOfMilfordHaven_Logo.png",
    logoSvg: "/client_logos/port_of_milford_haven/PortOfMilfordHaven_Logo(White).svg",
  },
  {
    serials: ["SWI010", "SWI011"],
    nameMatch: "Hatloy",
    logoPng: "/client_logos/hatloy_maritime/HatloyMaritime_Logo.png",
    logoSvg: "/client_logos/hatloy_maritime/HatloyMaritime_Logo(White).svg",
  },
];

const BASE_URL = "https://maintenance.exuma.co.uk";

const findClient = (companyName, serialNumber) =>
  CLIENTS.find(c => c.serials.includes(serialNumber) || companyName?.includes(c.nameMatch)) ?? null;

/**
 * Get the company logo URL for emails based on company name or serial number
 * Returns the PNG version of the logo (not the white SVG version)
 */
export const getCompanyLogoUrl = (companyName, serialNumber) => {
  const client = findClient(companyName, serialNumber);
  return client ? `${BASE_URL}${client.logoPng}` : null;
};

/**
 * Get the client logo for the form UI (white SVG version, for display on dark backgrounds)
 */
export const getClientLogo = (companyName, serialNumber) => {
  const client = findClient(companyName, serialNumber);
  return client ? { src: client.logoSvg, alt: `${companyName} Logo` } : null;
};

/**
 * Get just the logo path (if you're already constructing the base URL elsewhere)
 */
export const getCompanyLogoPath = (companyName, serialNumber) => {
  const client = findClient(companyName, serialNumber);
  return client ? client.logoPng : null;
};
