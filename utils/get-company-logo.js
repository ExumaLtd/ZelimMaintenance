/**
 * Get the company logo URL for emails based on company name or serial number
 * Returns the PNG version of the logo (not the white SVG version)
 * 
 * @param {string} companyName - The company name from Airtable
 * @param {string} serialNumber - The unit serial number (e.g., "SWI001")
 * @returns {string|null} - The full URL to the company logo PNG, or null if no match
 */
export const getCompanyLogoUrl = (companyName, serialNumber) => {
  const baseUrl = "https://maintenance.exuma.co.uk";
  
  const logoMap = {
    changi: {
      serials: ["SWI001", "SWI002"],
      nameMatch: "Changi",
      path: "/client_logos/changi_airport/ChangiAirport_Logo.png",
    },
    milford: {
      serials: ["SWI003"],
      nameMatch: "Port of Milford Haven",
      path: "/client_logos/port_of_milford_haven/PortOfMilfordHaven_Logo.png",
    },
    hatloy: {
      serials: ["SWI010", "SWI011"],
      nameMatch: "Hatloy",
      path: "/client_logos/hatloy_maritime/HatloyMaritime_Logo.png",
    },
  };

  // Find matching logo
  for (const client of Object.values(logoMap)) {
    if (
      client.serials.includes(serialNumber) || 
      companyName?.includes(client.nameMatch)
    ) {
      return `${baseUrl}${client.path}`;
    }
  }

  // Default to no logo if no match found
  return null;
};

/**
 * Alternative: Get just the path (if you're already constructing the base URL elsewhere)
 */
export const getCompanyLogoPath = (companyName, serialNumber) => {
  const logoMap = {
    changi: {
      serials: ["SWI001", "SWI002"],
      nameMatch: "Changi",
      path: "/client_logos/changi_airport/ChangiAirport_Logo.png",
    },
    milford: {
      serials: ["SWI003"],
      nameMatch: "Port of Milford Haven",
      path: "/client_logos/port_of_milford_haven/PortOfMilfordHaven_Logo.png",
    },
    hatloy: {
      serials: ["SWI010", "SWI011"],
      nameMatch: "Hatloy",
      path: "/client_logos/hatloy_maritime/HatloyMaritime_Logo.png",
    },
  };

  for (const client of Object.values(logoMap)) {
    if (
      client.serials.includes(serialNumber) || 
      companyName?.includes(client.nameMatch)
    ) {
      return client.path;
    }
  }

  return null;
};