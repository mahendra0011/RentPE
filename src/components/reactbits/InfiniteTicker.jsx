import { motion } from "framer-motion";

export default function InfiniteTicker({
  items,
  className = "",
  itemClassName = "",
  duration = 24,
}) {
  const row = [...items, ...items];

  return (
    <div className={`overflow-hidden ${className}`}>
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration, ease: "linear", repeat: Infinity }}
        className="flex w-max items-center gap-3"
      >
        {row.map((item, index) => (
          <span
            key={`${item}-${index}`}
            aria-hidden={index >= items.length ? "true" : undefined}
            className={`whitespace-nowrap ${itemClassName}`}
          >
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
