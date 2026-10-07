/**
 * Low-latency PCM Player for streaming 24kHz 16-bit Mono PCM audio chunks
 * received from the Gemini Live Multimodal API.
 */
export class PCMPlayer {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;
  private scheduledSources: AudioBufferSourceNode[] = [];
  public onAudioLevel?: (level: number) => void;
  private levelInterval?: number;

  constructor(private sampleRate: number = 24000) {}

  public async init(): Promise<void> {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: this.sampleRate });
      this.gainNode = this.audioContext.createGain();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;

      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);

      this.startLevelMonitor();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Feed base64-encoded PCM or ArrayBuffer/Int16Array into audio playback queue
   */
  public feed(chunk: ArrayBuffer | Uint8Array | string): void {
    if (!this.audioContext || !this.gainNode) {
      this.init().catch(() => {});
      if (!this.audioContext || !this.gainNode) return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    let int16Data: Int16Array;
    if (typeof chunk === 'string') {
      const binaryString = atob(chunk);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      int16Data = new Int16Array(bytes.buffer);
    } else if (chunk instanceof Uint8Array) {
      int16Data = new Int16Array(chunk.buffer, chunk.byteOffset, chunk.byteLength / 2);
    } else {
      int16Data = new Int16Array(chunk);
    }

    if (int16Data.length === 0) return;

    // Convert Int16 [-32768, 32767] to Float32 [-1.0, 1.0]
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 32768.0;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);

    const currentTime = this.audioContext.currentTime;
    // Maintain smooth continuous queue with minimum buffer ahead
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime + 0.03; // 30ms lead
    }

    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
    this.isPlaying = true;

    this.scheduledSources.push(source);
    source.onended = () => {
      const idx = this.scheduledSources.indexOf(source);
      if (idx > -1) {
        this.scheduledSources.splice(idx, 1);
      }
      if (this.scheduledSources.length === 0) {
        this.isPlaying = false;
      }
    };
  }

  /**
   * Immediately stops all currently playing and queued audio (crucial for user interruption)
   */
  public flush(): void {
    for (const src of this.scheduledSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // Source may have ended already
      }
    }
    this.scheduledSources = [];
    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime;
    }
    this.isPlaying = false;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private startLevelMonitor(): void {
    if (this.levelInterval) return;
    const dataArray = new Uint8Array(this.analyserNode?.frequencyBinCount || 128);

    this.levelInterval = window.setInterval(() => {
      if (!this.analyserNode || !this.isPlaying) {
        this.onAudioLevel?.(0);
        return;
      }
      this.analyserNode.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalized = Math.min(1, avg / 128);
      this.onAudioLevel?.(normalized);
    }, 40);
  }

  public close(): void {
    if (this.levelInterval) {
      clearInterval(this.levelInterval);
      this.levelInterval = undefined;
    }
    this.flush();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
