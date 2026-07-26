import React from "react";
import { getTelegramInitData } from "./telegramClient";

let micStream: MediaStream | null = null;

export async function ensureMicPermission(): Promise<boolean> {
  if (micStream?.active) return true;
  try {
    releaseMic();
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return true;
  } catch {
    return false;
  }
}

export function releaseMic() {
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
}

function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = samples.length * blockAlign;
  const bufferSize = 44 + dataSize;
  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, val, true);
    offset += 2;
  }

  return buffer;
}

function downsample(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number,
): Float32Array {
  if (inputSampleRate === outputSampleRate) return buffer;
  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.round(buffer.length / ratio);
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const srcIdx = i * ratio;
    const srcIdxFloor = Math.floor(srcIdx);
    const frac = srcIdx - srcIdxFloor;
    const srcIdxCeil = Math.min(srcIdxFloor + 1, buffer.length - 1);
    output[i] =
      buffer[srcIdxFloor] * (1 - frac) + buffer[srcIdxCeil] * frac;
  }
  return output;
}

export interface SpeechToTextOptions {
  lang?: string;
  audioContext?: AudioContext;
  onTranscript: (fullText: string, isFinalState: boolean) => void;
  onStateChange?: (state: "idle" | "listening" | "error") => void;
  onError?: (errorCode: string) => void;
  isHoldingRef: React.MutableRefObject<boolean>;
}

export class SpeechToTextSession {
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  private scriptProcessor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private pcmBuffer: Float32Array[] = [];

  private useFallback = false;
  private processingDone = false;

  private isHoldingRef: React.MutableRefObject<boolean>;
  private onTranscript: (fullText: string, isFinalState: boolean) => void;
  private onStateChange?: (state: "idle" | "listening" | "error") => void;
  private onError?: (errorCode: string) => void;
  private accumulatedText = "";

  constructor(options: SpeechToTextOptions) {
    this.isHoldingRef = options.isHoldingRef;
    this.onTranscript = options.onTranscript;
    this.onStateChange = options.onStateChange;
    this.onError = options.onError;
    this.audioContext = options.audioContext || null;
  }

  public getAccumulatedText(): string {
    return this.accumulatedText || "";
  }

  public start() {
    if (!micStream) {
      if (this.onError) this.onError("no-mic-permission");
      if (this.onStateChange) this.onStateChange("error");
      return;
    }

    try {
      this.audioContext = this.audioContext || new AudioContext();

      if (!this.useFallback && typeof MediaRecorder !== "undefined") {
        try {
          this.recordedChunks = [];
          this.mediaRecorder = new MediaRecorder(micStream);

          this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              this.recordedChunks.push(e.data);
            }
          };

          this.mediaRecorder.onstop = () => {
            this.processMediaRecorderData();
          };

          this.mediaRecorder.onerror = () => {
            this.useFallback = true;
            this.startScriptProcessorFallback();
          };

          this.mediaRecorder.start();
          if (this.onStateChange) this.onStateChange("listening");
          return;
        } catch {
          // MediaRecorder not supported, fall through
        }
      }

      this.useFallback = true;
      this.startScriptProcessorFallback();
    } catch (err) {
      console.warn("Audio capture start error:", err);
      if (this.onError) this.onError("audio-context-error");
      if (this.onStateChange) this.onStateChange("error");
    }
  }

  private startScriptProcessorFallback() {
    try {
      this.source = this.audioContext!.createMediaStreamSource(micStream!);
      this.scriptProcessor = this.audioContext!.createScriptProcessor(2048, 1, 1);

      this.gainNode = this.audioContext!.createGain();
      this.gainNode.gain.value = 0;

      this.pcmBuffer = [];

      this.scriptProcessor.onaudioprocess = (e) => {
        this.pcmBuffer.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };

      this.source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.gainNode);
      this.gainNode.connect(this.audioContext!.destination);

      if (this.onStateChange) this.onStateChange("listening");
    } catch (err) {
      console.warn("ScriptProcessorNode fallback error:", err);
      if (this.onError) this.onError("audio-context-error");
      if (this.onStateChange) this.onStateChange("error");
    }
  }

  private async processMediaRecorderData() {
    if (this.processingDone) return;
    this.processingDone = true;

    const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder?.mimeType || "audio/webm" });

    if (blob.size === 0) {
      if (!this.useFallback) {
        this.useFallback = true;
        this.startScriptProcessorFallback();
        return;
      }
      this.accumulatedText = "";
      this.onTranscript("", true);
      if (this.onStateChange) this.onStateChange("idle");
      return;
    }

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      const pcmData = audioBuffer.getChannelData(0);

      const resampled = downsample(pcmData, audioBuffer.sampleRate, 16000);
      const wavBuffer = encodeWav(resampled, 16000);

      await this.sendForTranscription(wavBuffer);
    } catch (err) {
      console.warn("Audio decode/transcribe error:", err);
      this.accumulatedText = "";
      this.onTranscript("", true);
      if (this.onError) this.onError("transcription-failed");
      if (this.onStateChange) this.onStateChange("idle");
    }
  }

  private async sendForTranscription(wavBuffer: ArrayBuffer) {
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(new Blob([wavBuffer], { type: "audio/wav" }));
      });

      const res = await fetch("/api/transcribe-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": getTelegramInitData() },
        body: JSON.stringify({ audioBase64: base64, format: "wav" }),
      });

      if (!res.ok) throw new Error(`Transcription failed: ${res.status}`);

      const data = await res.json();
      this.accumulatedText = data.text || "";
      this.onTranscript(this.accumulatedText, true);
    } catch (err) {
      console.warn("Transcription error:", err);
      this.accumulatedText = "";
      this.onTranscript("", true);
      if (this.onError) this.onError("transcription-failed");
    }

    if (this.onStateChange) this.onStateChange("idle");
  }

  private processPcmData() {
    if (this.processingDone) return;
    this.processingDone = true;

    if (this.pcmBuffer.length === 0) {
      this.accumulatedText = "";
      this.onTranscript("", true);
      if (this.onStateChange) this.onStateChange("idle");
      return;
    }

    const inputSampleRate = this.audioContext?.sampleRate || 48000;

    let totalLength = 0;
    for (const chunk of this.pcmBuffer) {
      totalLength += chunk.length;
    }
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.pcmBuffer) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    this.pcmBuffer = [];

    const resampled = downsample(combined, inputSampleRate, 16000);
    const wavBuffer = encodeWav(resampled, 16000);

    this.sendForTranscription(wavBuffer);
  }

  public stop() {
    if (this.processingDone) return;

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }

    if (this.useFallback) {
      this.processPcmData();
    }

    this.cleanup();
  }

  private cleanup() {
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    this.mediaRecorder = null;
    this.pcmBuffer = [];
    this.recordedChunks = [];
    releaseMic();
  }

  public destroy() {
    this.cleanup();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}

export class NoteSpeechInputHelper {
  private session: SpeechToTextSession | null = null;

  public bindSession(
    isHoldingRef: React.MutableRefObject<boolean>,
    currentText: string,
    onUpdateText: (newVal: string) => void,
    onStateChange?: (state: "idle" | "listening" | "error") => void,
  ): SpeechToTextSession {
    const initialContent = currentText.trim();

    isHoldingRef.current = true;

    this.session = new SpeechToTextSession({
      isHoldingRef,
      onStateChange,
      onTranscript: (incomingTranscript, isFinal) => {
        if (incomingTranscript) {
          const separator = initialContent ? " " : "";
          onUpdateText(initialContent + separator + incomingTranscript);
        }
      },
      onError: (err) => {
        console.log("Speech integration helper caught state error:", err);
      }
    });

    this.session.start();
    return this.session;
  }

  public release() {
    if (this.session) {
      this.session.stop();
      this.session = null;
    }
    releaseMic();
  }
}
