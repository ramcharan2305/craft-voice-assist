const SARVAM_API_URL = "https://api.sarvam.ai";
const SPEECH_MODEL = "saaras:v4";
const TRANSLATION_MODEL = "mayura:v1";
const SPEAKER = "shubh";

function serviceError(message, status = 502) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getApiKey() {
  const apiKey = process.env.SARVAM_API_KEY?.trim();
  if (!apiKey) {
    throw serviceError(
      "Voice services are not configured. Add SARVAM_API_KEY to backend/.env and restart the backend.",
      503,
    );
  }
  return apiKey;
}

async function fetchSarvam(path, options, serviceName) {
  let response;
  try {
    response = await fetch(`${SARVAM_API_URL}${path}`, {
      ...options,
      headers: {
        "api-subscription-key": getApiKey(),
        ...options.headers,
      },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    if (error.status) throw error;
    throw serviceError(`Could not connect to Sarvam ${serviceName}. Please try again.`);
  }

  if (!response.ok) {
    const status = response.status === 401 || response.status === 403 ? 503 : 502;
    throw serviceError(
      `Sarvam ${serviceName} failed (HTTP ${response.status}). Check the API key, account limits, and try again.`,
      status,
    );
  }
  return response;
}

const LANGUAGE_CODES = {
  en: "en-IN",
  te: "te-IN",
};

const AUDIO_FORMATS = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp4": "mp4",
  "audio/aac": "aac",
  "audio/flac": "flac",
};

export async function transcribeAudio(audio, contentType, language) {
  if (!Buffer.isBuffer(audio) || audio.length === 0) {
    throw serviceError("No audio was recorded. Please try again.", 400);
  }
  if (audio.length > 10 * 1024 * 1024) {
    throw serviceError("That recording is too large. Please record a shorter phrase.", 413);
  }
  if (!Object.hasOwn(LANGUAGE_CODES, language)) {
    throw serviceError("Choose Telugu or English before recording.", 400);
  }

  const mimeType = String(contentType ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const extension = AUDIO_FORMATS[mimeType];
  if (!extension) {
    throw serviceError("This audio format is not supported. Please try another browser.", 415);
  }

  const form = new FormData();
  form.append("model", SPEECH_MODEL);
  form.append("mode", "transcribe");
  form.append("language_code", LANGUAGE_CODES[language]);
  form.append("file", new Blob([audio], { type: mimeType }), `recording.${extension}`);

  const response = await fetchSarvam(
    "/speech-to-text",
    { method: "POST", body: form },
    "speech recognition",
  );
  const payload = await response.json();
  const transcript = typeof payload?.transcript === "string" ? payload.transcript.trim() : "";
  if (!transcript) {
    throw serviceError("Sarvam could not recognize that recording. Please try again.", 422);
  }
  return transcript;
}

export async function translateText(text, sourceLanguage, targetLanguage) {
  if (typeof text !== "string" || !text.trim() || text.length > 2500) {
    throw serviceError("Text to translate must be between 1 and 2,500 characters.", 400);
  }
  if (
    !Object.hasOwn(LANGUAGE_CODES, sourceLanguage) ||
    !Object.hasOwn(LANGUAGE_CODES, targetLanguage)
  ) {
    throw serviceError("Choose Telugu or English for translation.", 400);
  }
  if (sourceLanguage === targetLanguage) return text.trim();

  const response = await fetchSarvam(
    "/translate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: text.trim(),
        source_language_code: LANGUAGE_CODES[sourceLanguage],
        target_language_code: LANGUAGE_CODES[targetLanguage],
        model: TRANSLATION_MODEL,
        mode: "modern-colloquial",
      }),
    },
    "translation",
  );
  const payload = await response.json();
  const translated =
    typeof payload?.translated_text === "string" ? payload.translated_text.trim() : "";
  if (!translated) throw serviceError("Sarvam returned an empty translation. Please try again.");
  return translated;
}

export async function synthesizeSpeech(text, language) {
  if (typeof text !== "string" || !text.trim() || text.length > 2500) {
    throw serviceError("Spoken responses must be between 1 and 2,500 characters.", 400);
  }
  if (!Object.hasOwn(LANGUAGE_CODES, language)) {
    throw serviceError("Choose Telugu or English for voice playback.", 400);
  }

  const response = await fetchSarvam(
    "/text-to-speech",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text.trim(),
        model: "bulbul:v3",
        speaker: SPEAKER,
        language_code: LANGUAGE_CODES[language],
      }),
    },
    "voice generation",
  );
  const payload = await response.json();
  const audio = Array.isArray(payload?.audios) ? payload.audios[0] : null;
  if (typeof audio !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio)) {
    throw serviceError("Sarvam did not return playable speech. Please try again.");
  }
  return Buffer.from(audio, "base64");
}
