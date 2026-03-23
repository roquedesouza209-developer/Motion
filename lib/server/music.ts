export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  duration: number;
  url: string;
};

export const MUSIC_LIBRARY: MusicTrack[] = [
  {
    id: "motion-ambient-drift",
    title: "Ambient Drift",
    artist: "Motion Lab",
    duration: 4.2,
    url: "/audio/ambient-drift.wav",
  },
  {
    id: "motion-golden-hour",
    title: "Golden Hour",
    artist: "Motion Lab",
    duration: 4.0,
    url: "/audio/golden-hour.wav",
  },
  {
    id: "motion-neon-pulse",
    title: "Neon Pulse",
    artist: "Motion Lab",
    duration: 3.8,
    url: "/audio/neon-pulse.wav",
  },
  {
    id: "motion-ocean-bloom",
    title: "Ocean Bloom",
    artist: "Motion Lab",
    duration: 4.3,
    url: "/audio/ocean-bloom.wav",
  },
  {
    id: "motion-skyline-drive",
    title: "Skyline Drive",
    artist: "Motion Lab",
    duration: 4.1,
    url: "/audio/skyline-drive.wav",
  },
];
