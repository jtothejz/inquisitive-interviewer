/**
 * Audio Recorder that captures microphone input, converts to 16kHz 16-bit mono PCM,
 * and passes base64-encoded chunks for Gemini Live WebSocket transmission.
 */
export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private isRecording: boolean = false;
  public onAudioData?: (base64Pcm16k: string) => void;
  public onInputLevel?: (level: number) => void;

  public async start(): Promise<void> {
    if (this.isRecording) return;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioContextClass({ sampleRate: 16000 });

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    // 4096 samples at 16kHz is ~256ms of audio
    this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.scriptProcessor.onaudioprocess = (event) => {
      if (!this.isRecording) return;

      const inputBuffer = event.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(inputBuffer.length);

      let sumSquares = 0;
      for (let i = 0; i < inputBuffer.length; i++) {
        const s = Math.max(-1, Math.min(1, inputBuffer[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        sumSquares += s * s;
      }

      // Compute RMS volume for the visualizer
      const rms = Math.sqrt(sumSquares / inputBuffer.length);
      const level = Math.min(1, rms * 5);
      this.onInputLevel?.(level);

      // Convert Int16Array buffer to Base64
      const bytes = new Uint8Array(pcm16.buffer);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      this.onAudioData?.(base64);
    };

    this.sourceNode.connect(this.scriptProcessor);
    // Connect to destination through a silent gain node to prevent mic loopback to speakers
    const muteNode = this.audioContext.createGain();
    muteNode.gain.value = 0;
    this.scriptProcessor.connect(muteNode);
    muteNode.connect(this.audioContext.destination);
    this.isRecording = true;
  }

  public stop(): void {
    this.isRecording = false;
    this.onInputLevel?.(0);

    if (this.scriptProcessor && this.sourceNode) {
      try {
        this.sourceNode.disconnect();
        this.scriptProcessor.disconnect();
      } catch {
        // Disconnect gracefully
      }
      this.scriptProcessor = null;
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }
}
