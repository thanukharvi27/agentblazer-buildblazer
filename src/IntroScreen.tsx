import { useState, useRef, useEffect } from 'react';
import introVideo from './assets/intro.mp4';

export default function IntroScreen({ onEnter }: { onEnter: () => void }) {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay may be restricted in some browsers
      });
    }
  }, []);

  const handleContinue = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    setTimeout(() => {
      onEnter();
    }, 600);
  };

  return (
    <div
      onClick={handleContinue}
      onTouchStart={handleContinue}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        overflow: 'hidden',
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        touchAction: 'manipulation',
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          handleContinue();
        }
      }}
      aria-label="Click anywhere to continue"
    >
      {/* Background Video */}
      <video
        ref={videoRef}
        src={introVideo}
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
        }}
      />

      {/* Dark overlay for contrast and text clarity */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          pointerEvents: 'none',
        }}
      />

      {/* Centered "CLICK TO CONTINUE" */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '0 20px',
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: 'clamp(1.5rem, 4.5vw, 2.75rem)',
            fontWeight: 800,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            textShadow: '0 0 24px rgba(255, 255, 255, 0.6), 0 2px 10px rgba(0, 0, 0, 0.8)',
            animation: 'introPulse 2s ease-in-out infinite',
          }}
        >
          CLICK TO CONTINUE
        </span>
      </div>

      <style>{`
        @keyframes introPulse {
          0%, 100% {
            opacity: 0.9;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.04);
            text-shadow: 0 0 35px rgba(255, 255, 255, 0.9), 0 2px 12px rgba(0, 0, 0, 0.9);
          }
        }
      `}</style>
    </div>
  );
}
