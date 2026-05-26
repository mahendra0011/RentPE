import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";

export default function TiltCard({ children, className = "", delay = 0 }) {
  const rotateXValue = useMotionValue(0);
  const rotateYValue = useMotionValue(0);
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);
  const rotateX = useSpring(rotateXValue, { stiffness: 240, damping: 22 });
  const rotateY = useSpring(rotateYValue, { stiffness: 240, damping: 22 });
  const glow = useMotionTemplate`radial-gradient(280px circle at ${mouseX}% ${mouseY}%, rgba(99, 102, 241, 0.18), transparent 42%)`;

  function handleMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const percentX = x / rect.width;
    const percentY = y / rect.height;

    rotateXValue.set((0.5 - percentY) * 9);
    rotateYValue.set((percentX - 0.5) * 9);
    mouseX.set(percentX * 100);
    mouseY.set(percentY * 100);
  }

  function resetTilt() {
    rotateXValue.set(0);
    rotateYValue.set(0);
    mouseX.set(50);
    mouseY.set(50);
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.35, delay }}
      onMouseMove={handleMove}
      onMouseLeave={resetTilt}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={`relative overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <motion.div aria-hidden="true" style={{ background: glow }} className="absolute inset-0" />
      <div className="relative">{children}</div>
    </motion.article>
  );
}
