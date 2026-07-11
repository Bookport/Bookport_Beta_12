import React from "react";

export interface SpeechToTextOptions {
  lang?: string;
  onTranscript: (fullText: string, isFinalState: boolean) => void;
  onStateChange?: (state: "idle" | "listening" | "error") => void;
  onError?: (errorCode: string) => void;
  isHoldingRef: React.MutableRefObject<boolean>;
}

export class SpeechToTextSession {
  private recognition: any = null;
  private isHoldingRef: React.MutableRefObject<boolean>;
  private accumulatedText = "";
  private onTranscript: (fullText: string, isFinalState: boolean) => void;
  private onStateChange?: (state: "idle" | "listening" | "error") => void;
  private onError?: (errorCode: string) => void;
  private lang: string;

  constructor(options: SpeechToTextOptions) {
    this.isHoldingRef = options.isHoldingRef;
    this.onTranscript = options.onTranscript;
    this.onStateChange = options.onStateChange;
    this.onError = options.onError;
    this.lang = options.lang || "ru-RU";
  }

  public getAccumulatedText(): string {
    return this.accumulatedText || "";
  }

  public start() {
    this.accumulatedText = "";

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("SpeechRecognition not supported");
      if (this.onError) this.onError("not-supported");
      if (this.onStateChange) this.onStateChange("error");
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.lang;

      let localAccumulated = "";

      this.recognition.onstart = () => {
        if (this.onStateChange) this.onStateChange("listening");
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          localAccumulated += finalTranscript + " ";
        }

        const fullPendingText = (localAccumulated + interimTranscript).trim();
        this.accumulatedText = fullPendingText;

        this.onTranscript(fullPendingText, false);
      };

      this.recognition.onend = () => {
        if (this.isHoldingRef.current) {
          try {
            this.recognition.start();
          } catch (retryErr) {
            console.warn("Failed to auto-restart speech recognition:", retryErr);
          }
        } else {
          if (this.onStateChange) this.onStateChange("idle");
          this.onTranscript(this.accumulatedText.trim(), true);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn("Native Speech recognition session error:", event.error);
        if (this.onError) {
          try {
            this.onError(event.error);
          } catch (e) {
            console.error("Error in speech session error handler:", e);
          }
        }
        if (this.onStateChange) this.onStateChange("error");
      };

      this.recognition.start();
    } catch (err: any) {
      console.error("Failed to construct or start native SpeechRecognition:", err);
      if (this.onError) this.onError("start-failed");
      if (this.onStateChange) this.onStateChange("error");
    }
  }

  public stop() {
    this.isHoldingRef.current = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn("Failed to stop SpeechRecognition:", e);
      }
    }
    if (this.onStateChange) this.onStateChange("idle");
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
  }
}
