/**
 * Gemini Neural Text-to-Speech Engine
 * Generates and plays ultra-realistic, natural voice audio using Google Gemini models
 * (Puck, Charon, Kore, Fenrir, Aoede) directly through the Web Audio API.
 */

export class GeminiNeuralTTS {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private isPlayingAudio = false;

  constructor(private apiKey: string) {}

  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  private initAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  /**
   * Generates Gemini Neural Audio for the given text and persona voice,
   * then streams playback through Web Audio API with real-time level monitoring.
   */
  public async speak(
    text: string,
    voiceName: string,
    onAudioLevel?: (level: number) => void,
    onEnded?: () => void
  ): Promise<void> {
    this.stop();

    if (!text || text.trim().length === 0) {
      onEnded?.();
      return;
    }

    if (!this.apiKey) {
      throw new Error('Gemini API key is required for neural voice generation.');
    }

    // Sanitize voice name to valid Gemini Live prebuilt voices
    const validVoices = ['Fenrir', 'Charon', 'Kore', 'Puck', 'Aoede'];
    const selectedVoice = validVoices.includes(voiceName) ? voiceName : 'Fenrir';

    // Fetch neural audio buffer from Gemini API
    const audioBuffer = await this.fetchNeuralAudio(text.trim(), selectedVoice);

    const ctx = this.initAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    const gain = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    source.connect(gain);
    gain.connect(analyser);
    analyser.connect(ctx.destination);

    this.currentSource = source;
    this.analyserNode = analyser;
    this.isPlayingAudio = true;

    // Monitor live audio level for the visualizer
    const pcmData = new Uint8Array(analyser.frequencyBinCount);
    const monitorLevel = () => {
      if (!this.isPlayingAudio || !this.analyserNode) return;
      this.analyserNode.getByteFrequencyData(pcmData);
      let sum = 0;
      for (let i = 0; i < pcmData.length; i++) {
        sum += pcmData[i];
      }
      const avg = sum / pcmData.length / 255;
      onAudioLevel?.(Math.min(1, avg * 2.5));
      this.animFrameId = requestAnimationFrame(monitorLevel);
    };
    monitorLevel();

    source.onended = () => {
      this.isPlayingAudio = false;
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
      onAudioLevel?.(0);
      onEnded?.();
    };

    source.start(0);
  }

  public stop(): void {
    this.isPlayingAudio = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // Disconnect gracefully
      }
      this.currentSource = null;
    }
  }

  /**
   * Fetches natural audio from Gemini using available TTS and Audio models
   */
  private async fetchNeuralAudio(text: string, voiceName: string): Promise<AudioBuffer> {
    const candidateModels = [
      'gemini-3.8-flash-tts',
      'gemini-3.8-flash-lite-tts',
      'gemini-2.5-flash-native-audio-latest',
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash',
    ];

    let lastError: Error | null = null;

    for (const model of candidateModels) {
      try {
        const audioBase64 = await this.tryGenerateContentAudio(model, text, voiceName);
        if (audioBase64) {
          return await this.decodeAudio(audioBase64);
        }
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        console.warn(`[GeminiNeuralTTS] Model ${model} audio attempt failed:`, e);
      }
    }

    throw lastError || new Error('All Gemini neural voice generation endpoints failed.');
  }

  private async tryGenerateContentAudio(
    model: string,
    text: string,
    voiceName: string
  ): Promise<string | null> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Say the following dialogue naturally with expressive conversational tone: "${text}"`,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName,
              },
            },
          },
        },
      }),
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts;
    if (Array.isArray(parts)) {
      for (const p of parts) {
        if (p.inlineData && p.inlineData.data) {
          return p.inlineData.data;
        }
      }
    }
    return null;
  }

  /**
   * Decodes RIFF WAV, MP3, or raw PCM into a playable AudioBuffer
   */
  private async decodeAudio(base64Data: string): Promise<AudioBuffer> {
    const ctx = this.initAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    const binary = atob(base64Data);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // 1. Try decoding directly (works for WAV, MP3, AAC, OGG containers)
    try {
      const directBuffer = bytes.buffer.slice(0);
      return await ctx.decodeAudioData(directBuffer);
    } catch {
      // Direct decode failed, might be raw Linear PCM
    }

    // 2. Try wrapping as 24kHz 16-bit mono PCM (standard Gemini Live rate)
    try {
      const pcm24kBuffer = this.wrapPcmWithWavHeader(bytes, 24000, 1);
      return await ctx.decodeAudioData(pcm24kBuffer);
    } catch {
      // Direct decode failed, try 16kHz
    }

    // 3. Try wrapping as 16kHz 16-bit mono PCM
    try {
      const pcm16kBuffer = this.wrapPcmWithWavHeader(bytes, 16000, 1);
      return await ctx.decodeAudioData(pcm16kBuffer);
    } catch (err) {
      throw new Error(`Failed to decode Gemini audio stream: ${err}`);
    }
  }

  private wrapPcmWithWavHeader(
    pcmBytes: Uint8Array,
    sampleRate: number = 24000,
    channels: number = 1
  ): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + pcmBytes.length);
    const view = new DataView(buffer);

    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    // RIFF chunk descriptor
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + pcmBytes.length, true);
    writeStr(8, 'WAVE');

    // fmt sub-chunk
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, channels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * channels * 2, true); // ByteRate
    view.setUint16(32, channels * 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample

    // data sub-chunk
    writeStr(36, 'data');
    view.setUint32(40, pcmBytes.length, true);

    // Copy raw PCM bytes
    new Uint8Array(buffer, 44).set(pcmBytes);
    return buffer;
  }
}
