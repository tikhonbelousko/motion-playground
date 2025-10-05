import useMeasure from "react-use-measure";
import { useEffect, useState } from "react";
import { motion, useSpring } from "motion/react";

const openSpring = {
  visualDuration: 0.3,
  bounce: 0.25,
  restDelta: 0.05,
  restSpeed: 0.5,
};
const closeSpring = {
  visualDuration: 0.2,
  bounce: 0.15,
  restDelta: 0.05,
  restSpeed: 0.5,
};

export function UseMeasurePlaygroud() {
  const [panelRef, panelBounds] = useMeasure();
  const [buttonRef, buttonBounds] = useMeasure();

  const [isOpen, setIsOpen] = useState(false);
  const width = useSpring(0, isOpen ? openSpring : closeSpring);
  const height = useSpring(0, isOpen ? openSpring : closeSpring);
  const left = useSpring(0, isOpen ? openSpring : closeSpring);
  const bottom = useSpring(0, isOpen ? openSpring : closeSpring);

  useEffect(() => {
    width.set(isOpen ? panelBounds.width ?? 0 : buttonBounds.width ?? 0);
    height.set(isOpen ? panelBounds.height ?? 0 : buttonBounds.height ?? 0);

    const newLeft = panelBounds.left - buttonBounds.left;
    const newBottom = buttonBounds.bottom - panelBounds.bottom;

    left.set(isOpen ? newLeft : 0);
    bottom.set(isOpen ? newBottom : 0);
  }, [isOpen]);

  useEffect(() => {
    width.jump(isOpen ? panelBounds.width : buttonBounds.width ?? 0);
    height.jump(isOpen ? panelBounds.height : buttonBounds.height ?? 0);

    const newLeft = panelBounds.left - buttonBounds.left;
    const newBottom = buttonBounds.bottom - panelBounds.bottom;

    left.jump(isOpen ? newLeft : 0);
    bottom.jump(isOpen ? newBottom : 0);
  }, [
    panelBounds.width,
    panelBounds.height,
    buttonBounds.width,
    buttonBounds.height,
  ]);

  return (
    <div
      className="w-screen h-screen bg-gray-100"
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="absolute bottom-0 left-0 right-0 -bg-red-500/20">
        <div className="relative max-w-2xl mx-auto px-4 py-4 flex items-center justify-center gap-2 -bg-blue-500/20">
          <div
            className="absolute left-[8px] bottom-[8px] right-[8px] h-[500px] -bg-green-500/20"
            ref={panelRef}
          ></div>

          <div ref={buttonRef} className="relative shrink-0 w-20 h-12">
            <motion.div
              className="absolute bg-white border-[0.5px] border-black/20 rounded-[24px] -bg-red-500/20 shadow-lg"
              style={{
                width: width,
                height: height,
                left: left,
                bottom: bottom,
              }}
            >
              {bottom}
            </motion.div>
          </div>
          <div className="flex-1 w-20 h-12 bg-white border-[0.5px] border-black/20 rounded-[24px]"></div>
        </div>
      </div>
    </div>
  );
}
