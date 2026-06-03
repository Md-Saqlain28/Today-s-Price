import { ASSET_SECTIONS } from "../constants/assets.js";
import { fetchCryptoPrices } from "./cryptoService.js";
import { fetchMetalsPrices } from "./metalsService.js";
import { fetchEnergyPrices } from "./oilService.js";

const serviceBySection = {
  crypto: fetchCryptoPrices,
  metals: fetchMetalsPrices,
  energy: fetchEnergyPrices,
};

export async function fetchSectionPrices(sectionId) {
  const section = ASSET_SECTIONS.find((item) => item.id === sectionId);
  const service = serviceBySection[sectionId];

  if (!section || !service) {
    return [];
  }

  return service(section.assets);
}
