import { useEffect, useState } from "react";
import logoSprout from "../assets/images/buttons/logo.webp";

interface Bubble {
  id: number;
  cx: number;
  cy: number;
  r: number;
  speed: number;
  delay: number;
}

export default function GlassRing() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  // Generate dynamic bubbles that float within the liquid range
  useEffect(() => {
    // Generate bubbles that exist along the bottom and right arc of the tube
    // Liquid path generally spans from angles ~120 degrees (bottom-left) around to ~30 degrees (top-right)
    const newBubbles: Bubble[] = Array.from({ length: 18 }).map((_, i) => {
      // Angle inside the progress arc where bubble resides
      const angleRad = (100 + Math.random() * 240) * (Math.PI / 180);
      const radius = 95 + (Math.random() - 0.5) * 16; // average radius of tube is 95
      
      return {
        id: i,
        cx: 125 + radius * Math.cos(angleRad),
        cy: 125 + radius * Math.sin(angleRad),
        r: 1.5 + Math.random() * 2.5,
        speed: 2 + Math.random() * 4,
        delay: Math.random() * -5, // Negative delay for smooth initialization
      };
    });
    setBubbles(newBubbles);
  }, []);

  return (
    <div className="relative w-72 h-72 sm:w-80 sm:h-80 mx-auto flex items-center justify-center select-none" id="glass-ring">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial from-brand-green-pure/10 to-transparent blur-[40px] pointer-events-none rounded-full" />
      
      {/* Main Glass Ring SVG Renderer */}
      <svg
        viewBox="0 0 250 250"
        className="w-full h-full drop-shadow-[0_16px_36px_rgba(13,177,75,0.09)]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Liquid Green Gradient */}
          <linearGradient id="liquid-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22C55E" />
            <stop offset="35%" stopColor="#16B551" />
            <stop offset="70%" stopColor="#109F44" />
            <stop offset="100%" stopColor="#0C7E35" />
          </linearGradient>

          {/* Liquid Secondary Highlight to make it glow interiorly */}
          <linearGradient id="liquid-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ADD75" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#22C55E" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#085B24" stopOpacity="0.9" />
          </linearGradient>

          {/* Glass Specular & Outline Gradient */}
          <linearGradient id="glass-rim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#FAFAFA" stopOpacity="0.1" />
            <stop offset="80%" stopColor="#DDE2E5" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.7" />
          </linearGradient>

          <radialGradient id="specular-glow" cx="30%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Underlying shadow for depth */}
        <circle
          cx="125"
          cy="125"
          r="95"
          fill="none"
          stroke="#E8ECEF"
          strokeWidth="20"
          className="opacity-40"
        />

        {/* 2. Glass Tube empty backplate (the translucent channel) */}
        <circle
          cx="125"
          cy="125"
          r="95"
          fill="none"
          stroke="url(#glass-rim)"
          strokeWidth="22"
          className="opacity-90"
        />

        {/* Inner shadow overlay for empty tube */}
        <circle
          cx="125"
          cy="125"
          r="105"
          fill="none"
          stroke="#000000"
          strokeWidth="0.8"
          strokeOpacity="0.08"
        />
        <circle
          cx="125"
          cy="125"
          r="85"
          fill="none"
          stroke="#000000"
          strokeWidth="0.8"
          strokeOpacity="0.08"
        />

        {/* 3. Volumetric Glowing Green Liquid (Filled arc) */}
        {/* Arc starts around bottom-left (angle 130 deg) and curves to top-right (angle 350 deg) */}
        <path
          d="M 52.3 186.4 A 95 95 0 1 0 192.3 58 A 95 95 0 0 0 120.5 30"
          fill="none"
          stroke="url(#liquid-gradient)"
          strokeWidth="19"
          strokeLinecap="round"
          className="drop-shadow-[0_0_12px_rgba(22,197,94,0.55)]"
        />

        {/* Internal glossy liquid layer for volumetric shininess */}
        <path
          d="M 52.3 186.4 A 95 95 0 1 0 192.3 58 A 95 95 0 0 0 120.5 30"
          fill="none"
          stroke="url(#liquid-glow)"
          strokeWidth="12"
          strokeLinecap="round"
          className="mix-blend-overlay opacity-90"
        />

        {/* Highlight inner line to represent a solid liquid substance inside glass */}
        <path
          d="M 55.3 183.4 A 93 93 0 1 0 189.3 61 A 93 93 0 0 0 120.5 32"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.5"
        />

        {/* 4. Moving "Пузырьки полезности" (Bubbles of health) inside the liquid tube */}
        {bubbles.map((bubble) => (
          <circle
            key={bubble.id}
            cx={bubble.cx}
            cy={bubble.cy}
            r={bubble.r}
            fill="#FFFFFF"
            fillOpacity="0.85"
            filter="drop-shadow(0 1px 2px rgba(9, 102, 43, 0.4))"
            style={{
              transformOrigin: `${bubble.cx}px ${bubble.cy}px`,
              animation: `bubble-rise ${bubble.speed}s infinite ease-in-out`,
              animationDelay: `${bubble.delay}s`,
            }}
          />
        ))}

        {/* 5. Realistic Glass Specular Sheen (top reflection) */}
        {/* Gives real circular glass reflection with high curvature specular highlight */}
        <path
          d="M 55 125 A 70 70 0 0 1 195 125"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeOpacity="0.6"
          filter="blur(1px)"
        />
        
        {/* Soft external highlights on the outer glass edge */}
        <path
          d="M 40 125 A 85 85 0 0 1 210 125"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.4"
        />

        {/* SPECULAR SHINE DYNAMIC CIRCLE (at the top ridge to indicate lighting direction) */}
        <ellipse
          cx="125"
          cy="42"
          rx="25"
          ry="3.5"
          fill="url(#specular-glow)"
          opacity="0.8"
        />

        {/* Right edge gloss highlight */}
        <path
          d="M 215 110 A 90 90 0 0 1 195 185"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          strokeOpacity="0.45"
        />

        {/* Left deep curve shadow overlay */}
        <path
          d="M 35 125 A 90 90 0 0 0 80 205"
          fill="none"
          stroke="#000000"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.05"
        />
      </svg>

      {/* 6. Centered Project Leaf Logo - Symbol of health */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center pointer-events-none select-none">
        <div className="flex flex-col items-center justify-center scale-100 sm:scale-105 transform transition-transform duration-300">
          <img
            src={logoSprout}
            alt="лого"
            className="w-[115px] h-[115px] sm:w-[134px] sm:h-[134px] object-contain drop-shadow-[0_12px_24px_rgba(16,181,81,0.2)]"
          />
        </div>
      </div>
    </div>
  );
}
