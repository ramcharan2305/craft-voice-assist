import { useCallback, useEffect, useRef, useState } from "react";

import { aiApi, type VoiceLanguage } from "@/api/aiApi";

const MAX_RECORDING_MS = 25_000;

function getVoiceLanguage(language: string): VoiceLanguage {
  return language === "te" ? "te" : "en";
}

function microphoneError(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Microphone access was denied. Allow microphone access in your browser settings, then try again.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "No microphone was found. Connect a microphone or type your request instead.";
  }
  if (error instanceof DOMException && error.name === "NotReadableError") {
    return "The microphone is busy in another app. Close that app and try again.";
  }
  return error instanceof Error
    ? error.message
    : "The microphone could not be started. Please try again.";
}

export function useSpeech(language = "en") {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const operationRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const voiceOperationRef = useRef(0);
  const playbackResolveRef = useRef<(() => void) | null>(null);
  const playbackRejectRef = useRef<((error: Error) => void) | null>(null);

  const stopPlayback = useCallback(() => {
    voiceOperationRef.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    playbackResolveRef.current?.();
    playbackResolveRef.current = null;
    playbackRejectRef.current = null;
    setSpeaking(false);
  }, []);

  const cancel = useCallback(() => {
    operationRef.current += 1;
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    chunksRef.current = [];
    setListening(false);
    setTranscribing(false);
    stopPlayback();
  }, [stopPlayback]);

  useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" &&
        typeof MediaRecorder !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia),
    );
    return cancel;
  }, [cancel]);

  const start = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setSupported(false);
      setError("Voice recording is unavailable in this browser. Type your request instead.");
      return;
    }

    cancel();
    setSupported(true);
    setTranscript("");
    setError(null);
    setTranscribing(false);
    const operation = operationRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (operation !== operationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(
        (type) => MediaRecorder.isTypeSupported(type),
      );
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        if (operation !== operationRef.current) return;
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setListening(false);
        setError("The microphone recording failed. Please try again.");
      };
      recorder.onstop = async () => {
        if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setListening(false);
        if (operation !== operationRef.current) return;

        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        if (!audio.size) {
          setError("No audio was recorded. Please speak after starting the microphone.");
          return;
        }

        setTranscribing(true);
        try {
          const result = await aiApi.transcribe(audio, getVoiceLanguage(language));
          if (operation === operationRef.current) setTranscript(result.transcript);
        } catch (transcriptionError) {
          if (operation === operationRef.current) {
            setError(
              transcriptionError instanceof Error
                ? transcriptionError.message
                : "Speech recognition failed. Please try again.",
            );
          }
        } finally {
          if (operation === operationRef.current) setTranscribing(false);
        }
      };

      recorder.start(250);
      setListening(true);
      timeoutRef.current = window.setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, MAX_RECORDING_MS);
    } catch (permissionError) {
      if (operation === operationRef.current) {
        setListening(false);
        setError(microphoneError(permissionError));
      }
    }
  }, [cancel, language]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const reset = useCallback(() => {
    cancel();
    setTranscript("");
    setError(null);
  }, [cancel]);

  const speak = useCallback(
    async (text: string, preferredLanguage: VoiceLanguage = getVoiceLanguage(language)) => {
      const phrase = text.trim().slice(0, 2500);
      if (!phrase || typeof window === "undefined") return;
      stopPlayback();
      setError(null);
      setSpeaking(true);
      const operation = voiceOperationRef.current;

      try {
        const audio = await aiApi.speak(phrase, preferredLanguage);
        if (operation !== voiceOperationRef.current) return;
        const url = URL.createObjectURL(audio);
        const player = new Audio(url);
        audioUrlRef.current = url;
        audioRef.current = player;
        await new Promise<void>((resolve, reject) => {
          playbackResolveRef.current = resolve;
          playbackRejectRef.current = reject;
          player.onended = () => {
            if (operation === voiceOperationRef.current) stopPlayback();
          };
          player.onerror = () => {
            if (operation === voiceOperationRef.current) {
              playbackRejectRef.current?.(new Error("Sarvam audio could not be played."));
            }
          };
          void player.play().catch((playError: unknown) => {
            reject(
              playError instanceof Error ? playError : new Error("Audio playback was blocked."),
            );
          });
        });
      } catch (voiceError) {
        if (operation !== voiceOperationRef.current) return;
        stopPlayback();
        const fallbackOperation = voiceOperationRef.current;
        if ("speechSynthesis" in window) {
          const reason =
            voiceError instanceof Error ? ` ${voiceError.message}` : " Please check your setup.";
          setError(`Sarvam voice is unavailable.${reason} Using your device's voice instead.`);
          const utterance = new SpeechSynthesisUtterance(phrase);
          utterance.lang = preferredLanguage === "te" ? "te-IN" : "en-IN";
          utterance.rate = 0.95;
          await new Promise<void>((resolve) => {
            playbackResolveRef.current = resolve;
            utterance.onend = () => {
              if (fallbackOperation === voiceOperationRef.current) stopPlayback();
            };
            utterance.onerror = () => {
              if (fallbackOperation === voiceOperationRef.current) {
                setSpeaking(false);
                playbackResolveRef.current?.();
                playbackResolveRef.current = null;
              }
            };
            window.speechSynthesis.speak(utterance);
          });
        } else {
          setSpeaking(false);
          setError(
            voiceError instanceof Error
              ? `Voice playback failed: ${voiceError.message}`
              : "Voice playback is unavailable. You can still read the response above.",
          );
        }
      }
    },
    [language, stopPlayback],
  );

  return {
    listening,
    transcribing,
    transcript,
    setTranscript,
    error,
    supported,
    speaking,
    start,
    stop,
    cancel,
    reset,
    speak,
  };
}
