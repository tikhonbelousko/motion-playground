import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

export function LayoutIdPlayground() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-gray-2">
      <AnimatePresence mode="popLayout">
        {!isOpen && (
          <motion.div
            layoutId="box"
            className="relative w-[200px] h-[48px] bg-white border-[0.5px] border-black/20 overflow-hidden"
            transition={{
              duration: 1,
            }}
            onClick={() => {
              setIsOpen(true);
            }}
            style={{
              borderWidth: "0.5px",
              borderRadius: "16px",
              boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.2)",
            }}
          ></motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {isOpen && (
          <motion.div
            layoutId="box"
            className="w-[300px] h-[600px] bg-white border-[0.5px] border-black/20"
            transition={{
              duration: 1,
            }}
            onClick={() => {
              setIsOpen(false);
            }}
            style={{
              borderWidth: "0.5px",
              borderRadius: "16px",
              boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.2)",
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
