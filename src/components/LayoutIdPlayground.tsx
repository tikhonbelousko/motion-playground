import { motion } from "motion/react";

export function LayoutIdPlayground() {
  return (
    <div>
      <motion.div layoutId="box" className="size-10 bg-red-500" />
    </div>
  );
}
