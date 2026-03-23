export const INTEREST_OPTIONS = [
  {
    id: "tech",
    label: "Tech",
    keywords: [
      "tech",
      "technology",
      "app",
      "apps",
      "ai",
      "code",
      "coding",
      "software",
      "startup",
      "device",
      "gadget",
      "camera",
      "edit",
      "editing",
      "gear",
    ],
  },
  {
    id: "sports",
    label: "Sports",
    keywords: [
      "sport",
      "sports",
      "football",
      "soccer",
      "basketball",
      "match",
      "training",
      "workout",
      "gym",
      "run",
      "running",
      "athlete",
      "fitness",
    ],
  },
  {
    id: "fashion",
    label: "Fashion",
    keywords: [
      "fashion",
      "style",
      "outfit",
      "look",
      "streetwear",
      "wardrobe",
      "model",
      "beauty",
      "editorial",
    ],
  },
  {
    id: "travel",
    label: "Travel",
    keywords: [
      "travel",
      "trip",
      "journey",
      "flight",
      "beach",
      "mountain",
      "city",
      "hotel",
      "passport",
      "rooftop",
      "downtown",
      "station",
      "seattle",
      "brooklyn",
      "austin",
      "los angeles",
    ],
  },
  {
    id: "gaming",
    label: "Gaming",
    keywords: [
      "gaming",
      "gamer",
      "game",
      "esports",
      "stream",
      "playstation",
      "xbox",
      "nintendo",
      "pc build",
      "console",
    ],
  },
] as const;

export type InterestKey = (typeof INTEREST_OPTIONS)[number]["id"];

const INTEREST_LOOKUP = new Map<string, (typeof INTEREST_OPTIONS)[number]>(
  INTEREST_OPTIONS.map((option) => [option.id, option]),
);

export function normalizeInterest(input: string): InterestKey | null {
  const normalized = input.trim().toLowerCase();
  return INTEREST_LOOKUP.has(normalized) ? (normalized as InterestKey) : null;
}

export function normalizeInterests(input: unknown): InterestKey[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const seen = new Set<InterestKey>();

  input.forEach((value) => {
    if (typeof value !== "string") {
      return;
    }

    const normalized = normalizeInterest(value);
    if (normalized) {
      seen.add(normalized);
    }
  });

  return [...seen];
}

export function getInterestLabel(interest: InterestKey): string {
  return INTEREST_LOOKUP.get(interest)?.label ?? interest;
}

export function detectInterestsFromText(text: string): InterestKey[] {
  const haystack = text.trim().toLowerCase();

  if (!haystack) {
    return [];
  }

  return INTEREST_OPTIONS.filter(
    (option) =>
      haystack.includes(`#${option.id}`) ||
      option.keywords.some((keyword) => haystack.includes(keyword)),
  ).map((option) => option.id);
}

export function mergeInterestSets(...groups: Array<InterestKey[] | undefined>): InterestKey[] {
  const seen = new Set<InterestKey>();

  groups.forEach((group) => {
    group?.forEach((interest) => seen.add(interest));
  });

  return [...seen];
}

export function resolvePostInterests(post: {
  interests?: InterestKey[];
  caption?: string;
  location?: string;
}): InterestKey[] {
  return mergeInterestSets(
    post.interests,
    detectInterestsFromText(`${post.caption ?? ""} ${post.location ?? ""}`),
  );
}
