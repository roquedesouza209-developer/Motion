export const RANDOM_CHAT_COUNTRIES = [
  { id: "tz", label: "Tanzania" },
  { id: "ke", label: "Kenya" },
  { id: "ug", label: "Uganda" },
  { id: "rw", label: "Rwanda" },
  { id: "za", label: "South Africa" },
  { id: "ng", label: "Nigeria" },
  { id: "gh", label: "Ghana" },
  { id: "eg", label: "Egypt" },
  { id: "us", label: "United States" },
  { id: "ca", label: "Canada" },
  { id: "gb", label: "United Kingdom" },
  { id: "fr", label: "France" },
  { id: "de", label: "Germany" },
  { id: "in", label: "India" },
  { id: "ae", label: "United Arab Emirates" },
  { id: "jp", label: "Japan" },
  { id: "br", label: "Brazil" },
] as const;

const COUNTRY_LOOKUP = new Map<string, string>(
  RANDOM_CHAT_COUNTRIES.map((country) => [country.id, country.label]),
);

export function normalizeRandomChatCountry(input: unknown): string | undefined {
  if (typeof input !== "string") {
    return undefined;
  }

  const normalized = input.trim().toLowerCase();
  return COUNTRY_LOOKUP.has(normalized) ? normalized : undefined;
}

export function getRandomChatCountryLabel(country?: string): string {
  if (!country) {
    return "Anywhere";
  }

  return COUNTRY_LOOKUP.get(country) ?? "Anywhere";
}
