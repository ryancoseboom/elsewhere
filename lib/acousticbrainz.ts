const MUSICBRAINZ_BASE_URL = "https://musicbrainz.org/ws/2";
const ACOUSTICBRAINZ_BASE_URL = "https://acousticbrainz.org/api/v1";

type MusicBrainzRecording = {
  id: string;
  score?: number;
  title: string;
};

type AcousticBrainzClassifier = {
  probability: number;
  value: string;
};

type AcousticBrainzHighLevel = {
  highlevel?: Record<string, AcousticBrainzClassifier>;
};

export type MoodSuggestion = {
  recordingId: string;
  recordingTitle: string;
  tags: {
    name: string;
    probability: number;
  }[];
};

const MOOD_CLASSIFIERS: Record<string, Record<string, string>> = {
  mood_acoustic: { acoustic: "acoustic" },
  mood_aggressive: { aggressive: "aggressive" },
  mood_electronic: { electronic: "electronic" },
  mood_happy: { happy: "happy" },
  mood_party: { party: "party" },
  mood_relaxed: { relaxed: "relaxed" },
  mood_sad: { sad: "sad" },
};

function musicBrainzHeaders() {
  const contact = process.env.MUSICBRAINZ_CONTACT || "local Backroom importer";

  return {
    Accept: "application/json",
    "User-Agent": `ElsewhereArchive/0.1 (${contact})`,
  };
}

async function findMusicBrainzRecordings(title: string) {
  const query = `recording:"${title}" AND artist:"Halou"`;
  const response = await fetch(
    `${MUSICBRAINZ_BASE_URL}/recording/?query=${encodeURIComponent(
      query
    )}&fmt=json&limit=5`,
    {
      headers: musicBrainzHeaders(),
      cache: "no-store",
    }
  );

  if (!response.ok) return [];

  const data = (await response.json()) as {
    recordings?: MusicBrainzRecording[];
  };

  return data.recordings || [];
}

async function getAcousticBrainzHighLevel(recordingId: string) {
  const response = await fetch(
    `${ACOUSTICBRAINZ_BASE_URL}/${encodeURIComponent(recordingId)}/high-level`,
    { cache: "no-store" }
  );

  if (!response.ok) return null;

  return (await response.json()) as AcousticBrainzHighLevel;
}

function extractMoodTags(data: AcousticBrainzHighLevel) {
  const tags: MoodSuggestion["tags"] = [];

  for (const [classifier, values] of Object.entries(MOOD_CLASSIFIERS)) {
    const result = data.highlevel?.[classifier];
    const tag = result ? values[result.value] : undefined;

    if (result && tag && result.probability >= 0.65) {
      tags.push({ name: tag, probability: result.probability });
    }
  }

  return tags.sort((a, b) => b.probability - a.probability);
}

export async function getAcousticBrainzMoodSuggestion(title: string) {
  const recordings = await findMusicBrainzRecordings(title);

  for (const recording of recordings) {
    const data = await getAcousticBrainzHighLevel(recording.id);

    if (!data) continue;

    const tags = extractMoodTags(data);

    if (tags.length > 0) {
      return {
        recordingId: recording.id,
        recordingTitle: recording.title,
        tags,
      } satisfies MoodSuggestion;
    }
  }

  return null;
}

export async function getAcousticBrainzMoodSuggestions(
  songs: { id: string; title: string }[]
) {
  const suggestions: (MoodSuggestion & {
    songId: string;
    songTitle: string;
  })[] = [];

  for (let index = 0; index < songs.length; index++) {
    const song = songs[index];
    const suggestion = await getAcousticBrainzMoodSuggestion(song.title);

    if (suggestion) {
      suggestions.push({
        songId: song.id,
        songTitle: song.title,
        ...suggestion,
      });
    }

    if (index < songs.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }

  return suggestions;
}
