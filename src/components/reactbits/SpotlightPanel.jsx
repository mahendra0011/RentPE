import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

export default function SpotlightPanel({ children, className = "" }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const background = useMotionTemplate`radial-gradient(340px circle at ${mouseX}px ${mouseY}px, rgba(99, 102, 241, 0.18), transparent 45%)`;

  return (
    <motion.div
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        mouseX.set(event.clientX - rect.left);
        mouseY.set(event.clientY - rect.top);
      }}
      style={{ background }}
      className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-card shadow-[var(--shadow-card)] ${className}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.72)_45%,transparent_70%)] opacity-30" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
