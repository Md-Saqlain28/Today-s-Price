export const STATE_STORAGE_KEY = "tp_selected_state_v1";
export const ONBOARDING_STORAGE_KEY = "tp_state_onboarded_v1";

export const STATES_AND_UTS = [
  { id: "andhra-pradesh", name: "Andhra Pradesh", tavilyName: "Andhra Pradesh" },
  { id: "arunachal-pradesh", name: "Arunachal Pradesh", tavilyName: "Arunachal Pradesh" },
  { id: "assam", name: "Assam", tavilyName: "Assam" },
  { id: "bihar", name: "Bihar", tavilyName: "Bihar" },
  { id: "chhattisgarh", name: "Chhattisgarh", tavilyName: "Chhattisgarh" },
  { id: "goa", name: "Goa", tavilyName: "Goa" },
  { id: "gujarat", name: "Gujarat", tavilyName: "Gujarat" },
  { id: "haryana", name: "Haryana", tavilyName: "Haryana" },
  { id: "himachal-pradesh", name: "Himachal Pradesh", tavilyName: "Himachal Pradesh" },
  { id: "jharkhand", name: "Jharkhand", tavilyName: "Jharkhand" },
  { id: "karnataka", name: "Karnataka", tavilyName: "Karnataka" },
  { id: "kerala", name: "Kerala", tavilyName: "Kerala" },
  { id: "madhya-pradesh", name: "Madhya Pradesh", tavilyName: "Madhya Pradesh" },
  { id: "maharashtra", name: "Maharashtra", tavilyName: "Maharashtra" },
  { id: "manipur", name: "Manipur", tavilyName: "Manipur" },
  { id: "meghalaya", name: "Meghalaya", tavilyName: "Meghalaya" },
  { id: "mizoram", name: "Mizoram", tavilyName: "Mizoram" },
  { id: "nagaland", name: "Nagaland", tavilyName: "Nagaland" },
  { id: "odisha", name: "Odisha", tavilyName: "Odisha" },
  { id: "punjab", name: "Punjab", tavilyName: "Punjab" },
  { id: "rajasthan", name: "Rajasthan", tavilyName: "Rajasthan" },
  { id: "sikkim", name: "Sikkim", tavilyName: "Sikkim" },
  { id: "tamil-nadu", name: "Tamil Nadu", tavilyName: "Tamil Nadu" },
  { id: "telangana", name: "Telangana", tavilyName: "Telangana" },
  { id: "tripura", name: "Tripura", tavilyName: "Tripura" },
  { id: "uttar-pradesh", name: "Uttar Pradesh", tavilyName: "Uttar Pradesh" },
  { id: "uttarakhand", name: "Uttarakhand", tavilyName: "Uttarakhand" },
  { id: "west-bengal", name: "West Bengal", tavilyName: "West Bengal" },
  { id: "andaman-and-nicobar-islands", name: "Andaman and Nicobar Islands", tavilyName: "Andaman and Nicobar Islands" },
  { id: "chandigarh", name: "Chandigarh", tavilyName: "Chandigarh" },
  { id: "dadra-and-nagar-haveli-and-daman-and-diu", name: "Dadra and Nagar Haveli and Daman and Diu", tavilyName: "Dadra and Nagar Haveli and Daman and Diu" },
  { id: "delhi", name: "Delhi", tavilyName: "Delhi" },
  { id: "jammu-and-kashmir", name: "Jammu and Kashmir", tavilyName: "Jammu and Kashmir" },
  { id: "ladakh", name: "Ladakh", tavilyName: "Ladakh" },
  { id: "lakshadweep", name: "Lakshadweep", tavilyName: "Lakshadweep" },
  { id: "puducherry", name: "Puducherry", tavilyName: "Puducherry" },
];

export const DEFAULT_STATE = STATES_AND_UTS.find((state) => state.id === "delhi") || STATES_AND_UTS[0];

export function getStateById(id) {
  return STATES_AND_UTS.find((state) => state.id === id) || null;
}

