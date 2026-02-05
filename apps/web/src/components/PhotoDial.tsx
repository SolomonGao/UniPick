import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | false | null | undefined)[]) {
  return twMerge(clsx(inputs));
}

type Item = {
  id: number;
  name: string;
  type: string;
  loc: string;
  src: string;
};

const items: Item[] = [
  { id: 1, name: "NEURAL_LINK", type: "Augment", loc: "CHIBA", src: "https://images.unsplash.com/photo-1531297461136-82lw8729124?q=80&w=800" },
  { id: 2, name: "GHOST_SHELL", type: "Chassis", loc: "NEW_PORT", src: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=800" },
  { id: 3, name: "RETRO_DECK", type: "Terminal", loc: "SPRAWL", src: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800" },
  { id: 4, name: "DATA_DISC", type: "Storage", loc: "ZION", src: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800" },
  { id: 5, name: "ISO_LENS", type: "Optic", loc: "GRID", src: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800" },
];

interface Props {
  mode?: "2D" | "3D";
}

export default function CyberRotary({ mode = "3D" }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const count = items.length;
  const angleStep = 360 / count;
  const radius = mode === "3D" ? 320 : 220;

  const rotation = -activeIndex * angleStep;

  const getDepth = (index: number) => {
    const diff = Math.abs(index - activeIndex);
    const wrapped = Math.min(diff, count - diff);
    return 1 - wrapped / (count / 2);
  };

  return (
    <div className="relative h-[900px] w-full bg-black flex items-center justify-center overflow-hidden font-mono">
      {/* Stage */}
      <div
        className="relative"
        style={{
          width: radius * 2,
          height: radius * 2,
          perspective: mode === "3D" ? "1200px" : undefined,
        }}
      >
        <motion.div
          className="relative w-full h-full transform-style-3d"
          animate={{
            rotateY: mode === "3D" ? rotation : 0,
            rotateZ: mode === "2D" ? rotation : 0,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
        >
          {items.map((item, index) => {
            const angle = index * angleStep;
            const depth = getDepth(index);

            return (
              <motion.div
                key={item.id}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "absolute top-1/2 left-1/2 w-48 h-64 -ml-24 -mt-32 cursor-pointer",
                  "border border-white/10 bg-black/80"
                )}
                style={{
                  transformStyle: "preserve-3d",
                  transform:
                    mode === "3D"
                      ? `rotateY(${angle}deg) translateZ(${radius}px)`
                      : `rotateZ(${angle}deg) translateY(-${radius}px) rotateZ(${-angle}deg)`,
                }}
                animate={{
                  scale: 0.85 + depth * 0.25,
                  opacity: 0.3 + depth * 0.7,
                  filter:
                    depth > 0.95
                      ? "grayscale(0%) blur(0px)"
                      : "grayscale(100%) blur(2px)",
                }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${item.src})` }}
                />
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* HUD */}
      <HUD item={items[activeIndex]} />
    </div>
  );
}

function HUD({ item }: { item: Item }) {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="bg-cyan-950/80 border-l-2 border-cyan-400 p-4 w-72"
        >
          <h1 className="text-cyan-400 text-2xl font-black italic mb-2">
            {item.name}
          </h1>
          <div className="text-xs tracking-widest text-cyan-200/70 space-y-1">
            <div>TYPE: <span className="text-white">{item.type}</span></div>
            <div>LOC: <span className="text-white">{item.loc}</span></div>
            <div>ID: <span className="text-white">#{item.id.toString().padStart(4, "0")}</span></div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
