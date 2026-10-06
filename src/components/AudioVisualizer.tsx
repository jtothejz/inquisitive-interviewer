import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  inputLevel: number; // 0 to 1
  outputLevel: number; // 0 to 1
  activeSpeaker: string | 'user' | null;
  activeColor?: string;
  isRecording: boolean;
  isPlaying: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  inputLevel,
  outputLevel,
  activeSpeaker,
  activeColor = '#f97316',
  isRecording,
  isPlaying,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      phaseRef.current += 0.05;
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Determine active amplitude based on who is speaking
      const isUserActive = activeSpeaker === 'user' || (isRecording && inputLevel > 0.08);
      const isAiActive = isPlaying || outputLevel > 0.05;
      const currentLevel = isAiActive ? outputLevel : isUserActive ? inputLevel : 0.04;
      const targetColor = isUserActive ? '#38bdf8' : activeColor;

      const numBars = 36;
      const barWidth = 4;
      const spacing = 6;
      const totalWidth = numBars * (barWidth + spacing);
      const startX = (width - totalWidth) / 2;
      const centerY = height / 2;

      // Draw subtle glow background
      const glowGradient = ctx.createRadialGradient(width / 2, centerY, 5, width / 2, centerY, 90);
      glowGradient.addColorStop(0, `${targetColor}33`);
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, width, height);

      // Render symmetric animated sound wave bars
      for (let i = 0; i < numBars; i++) {
        const x = startX + i * (barWidth + spacing);
        const distFromCenter = Math.abs(i - numBars / 2) / (numBars / 2);
        const envelope = Math.cos(distFromCenter * (Math.PI / 2));

        const wave = Math.sin(phaseRef.current * 2 + i * 0.35) * 0.3 + 0.7;
        const barHeight = Math.max(
          4,
          (currentLevel * 75 + 6) * envelope * wave
        );

        ctx.fillStyle = targetColor;
        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, 2);
        ctx.fill();
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [inputLevel, outputLevel, activeSpeaker, activeColor, isRecording, isPlaying]);

  return (
    <div className="relative flex flex-col items-center justify-center w-full py-4">
      <canvas
        ref={canvasRef}
        width={480}
        height={100}
        className="w-full max-w-lg h-24 pointer-events-none"
      />
    </div>
  );
};
