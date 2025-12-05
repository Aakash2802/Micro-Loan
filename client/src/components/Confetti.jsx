// client/src/components/Confetti.jsx
import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

const Confetti = ({
  active = false,
  duration = 3000,
  particleCount = 100,
  spread = 70,
  colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
  onComplete,
}) => {
  const [particles, setParticles] = useState([]);
  const [isActive, setIsActive] = useState(false);

  const createParticle = useCallback((index) => {
    const angle = (Math.random() * spread - spread / 2) * (Math.PI / 180);
    const velocity = 30 + Math.random() * 20;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 8 + Math.random() * 8;
    const shape = Math.random() > 0.5 ? 'square' : 'circle';

    return {
      id: index,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      vx: Math.sin(angle) * velocity * (Math.random() > 0.5 ? 1 : -1),
      vy: -Math.cos(angle) * velocity - Math.random() * 10,
      color,
      size,
      shape,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 20,
      opacity: 1,
    };
  }, [colors, spread]);

  const triggerConfetti = useCallback(() => {
    const newParticles = Array.from({ length: particleCount }, (_, i) => createParticle(i));
    setParticles(newParticles);
    setIsActive(true);

    // Animation loop
    let frame = 0;
    const maxFrames = duration / 16; // ~60fps
    const gravity = 0.5;
    const friction = 0.99;

    const animate = () => {
      frame++;

      setParticles(prevParticles =>
        prevParticles.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vx: p.vx * friction,
          vy: p.vy + gravity,
          rotation: p.rotation + p.rotationSpeed,
          opacity: Math.max(0, 1 - frame / maxFrames),
        })).filter(p => p.opacity > 0 && p.y < window.innerHeight + 50)
      );

      if (frame < maxFrames) {
        requestAnimationFrame(animate);
      } else {
        setIsActive(false);
        setParticles([]);
        onComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }, [particleCount, duration, createParticle, onComplete]);

  useEffect(() => {
    if (active && !isActive) {
      triggerConfetti();
    }
  }, [active, isActive, triggerConfetti]);

  if (!isActive || particles.length === 0) return null;

  return createPortal(
    <div
      className="fixed inset-0 pointer-events-none z-[9999]"
      aria-hidden="true"
    >
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.shape === 'circle' ? particle.size : particle.size * 0.6,
            backgroundColor: particle.color,
            borderRadius: particle.shape === 'circle' ? '50%' : '2px',
            transform: `rotate(${particle.rotation}deg)`,
            opacity: particle.opacity,
            transition: 'none',
          }}
        />
      ))}
    </div>,
    document.body
  );
};

// Success celebration with checkmark
export const SuccessConfetti = ({ show, onComplete }) => {
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    if (show) {
      setShowCheck(true);
      const timer = setTimeout(() => setShowCheck(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  return (
    <>
      <Confetti
        active={show}
        particleCount={80}
        duration={2500}
        onComplete={onComplete}
      />
      {showCheck && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[9998]">
          <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center animate-bounce-in shadow-2xl">
            <svg
              className="w-14 h-14 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{
                strokeDasharray: 50,
                strokeDashoffset: 50,
                animation: 'checkDraw 0.5s ease-out 0.3s forwards',
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
      )}
      <style>{`
        @keyframes checkDraw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </>
  );
};

// Money rain effect for payments
export const MoneyRain = ({ active, duration = 4000, onComplete }) => {
  const [bills, setBills] = useState([]);

  useEffect(() => {
    if (!active) {
      setBills([]);
      return;
    }

    const newBills = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      delay: Math.random() * 2000,
      duration: 2000 + Math.random() * 1000,
      rotation: Math.random() * 30 - 15,
      scale: 0.7 + Math.random() * 0.5,
    }));

    setBills(newBills);

    const timer = setTimeout(() => {
      setBills([]);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [active, duration, onComplete]);

  if (bills.length === 0) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {bills.map((bill) => (
        <div
          key={bill.id}
          className="absolute text-4xl"
          style={{
            left: bill.x,
            top: -50,
            transform: `rotate(${bill.rotation}deg) scale(${bill.scale})`,
            animation: `fall ${bill.duration}ms linear ${bill.delay}ms forwards`,
          }}
        >
          💵
        </div>
      ))}
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(${window.innerHeight + 100}px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

// Sparkle burst effect
export const SparkleBurst = ({ active, x, y, onComplete }) => {
  const [sparkles, setSparkles] = useState([]);

  useEffect(() => {
    if (!active) {
      setSparkles([]);
      return;
    }

    const newSparkles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      angle: (i * 30) * (Math.PI / 180),
      distance: 30 + Math.random() * 20,
      size: 4 + Math.random() * 4,
      delay: Math.random() * 100,
    }));

    setSparkles(newSparkles);

    const timer = setTimeout(() => {
      setSparkles([]);
      onComplete?.();
    }, 600);

    return () => clearTimeout(timer);
  }, [active, onComplete]);

  if (sparkles.length === 0) return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute bg-amber-400 rounded-full"
          style={{
            left: x,
            top: y,
            width: sparkle.size,
            height: sparkle.size,
            animation: `sparkle 0.5s ease-out ${sparkle.delay}ms forwards`,
            '--tx': `${Math.cos(sparkle.angle) * sparkle.distance}px`,
            '--ty': `${Math.sin(sparkle.angle) * sparkle.distance}px`,
          }}
        />
      ))}
      <style>{`
        @keyframes sparkle {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx), var(--ty)) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default Confetti;
