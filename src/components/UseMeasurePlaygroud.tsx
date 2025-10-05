import {
  ChevronUpIcon,
  LanguageIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  SparklesIcon,
  StopIcon,
} from "@heroicons/react/16/solid";
import { motion, useSpring, type Transition } from "motion/react";
import { useEffect, useState } from "react";
import useMeasure from "react-use-measure";
import { twMerge } from "tailwind-merge";
import { AudioSettingsIcon } from "./AudioSettingsIcon";
import { CopyDocumentIcon } from "./CopyDocumentIcon";
import { DancingBars } from "./DancingBars";

const openSpring: Transition = {
  type: "spring",
  visualDuration: 0.3,
  bounce: 0.25,
  restDelta: 0.05,
  restSpeed: 0.5,
};

const openWidthSpring: Transition = {
  type: "spring",
  visualDuration: 0.2,
  bounce: 0.17,
  restDelta: 0.05,
  restSpeed: 0.5,
};

const closeSpring: Transition = {
  type: "spring",
  visualDuration: 0.2,
  bounce: 0.12,
  restDelta: 0.05,
  restSpeed: 0.5,
};

export function UseMeasurePlaygroud() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div
      className="w-screen h-screen bg-zinc-100 select-none"
      onClick={() => {
        if (openIndex === null) {
          return;
        }
        setOpenIndex(null);
      }}
    >
      <div className="absolute bottom-0 left-0 right-0 -bg-red-500/20">
        <div className="relative max-w-2xl mx-auto px-4 py-4 flex items-center justify-center gap-2 -bg-blue-500/20">
          <ExpandingPanel
            isOpen={openIndex === 0}
            onClick={() => {
              setOpenIndex(i => (i === 0 ? null : 0));
            }}
          />
          <div className="shrink-0 flex justify-center items-center px-4 pl-3 gap-1 h-11 text-white font-medium text-[14px] leading-5 bg-emerald-700 hover:bg-emerald-800 ring-[0.5px] ring-inset ring-black/10 shadow-lg rounded-[22px]">
            <SparklesIcon className="size-4" /> Generate notes
          </div>
          <div className="flex-1 h-11 bg-white ring-[0.5px] ring-black/20 shadow-lg rounded-[22px] text-sm text-zinc-400 px-4 flex flex-row items-center justify-start">
            Ask anything ⌘J, recipes /
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpandingPanel({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  // const [panelRef, panelBounds] = useMeasure({ debounce: isOpen ? 0 : 100 });
  // const [buttonRef, buttonBounds] = useMeasure({ debounce: isOpen ? 0 : 100 });
  const [panelRef, panelBounds] = useMeasure();
  const [buttonRef, buttonBounds] = useMeasure();

  const width = useSpring(0, isOpen ? openWidthSpring : closeSpring);
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    width.jump(isOpen ? panelBounds.width : buttonBounds.width ?? 0);
    height.jump(isOpen ? panelBounds.height : buttonBounds.height ?? 0);

    const newLeft = panelBounds.left - buttonBounds.left;
    const newBottom = buttonBounds.bottom - panelBounds.bottom;

    left.jump(isOpen ? newLeft : 0);
    bottom.jump(isOpen ? newBottom : 0);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    panelBounds.width,
    panelBounds.height,
    buttonBounds.width,
    buttonBounds.height,
  ]);

  return (
    <div>
      <div
        className="absolute left-[8px] bottom-[8px] right-[8px] h-[500px] -bg-green-500/20 pointer-events-none"
        ref={panelRef}
        style={{
          zIndex: isOpen ? 10 : 0,
        }}
      ></div>

      <div
        ref={buttonRef}
        className="relative shrink-0 w-[86px] h-11"
        onClick={onClick}
      >
        <motion.div
          className="absolute bg-white ring-[0.5px] ring-black/20 rounded-[22px] -bg-red-500/20 shadow-lg flex flex-col items-stretch overflow-hidden"
          style={{
            width: width,
            height: height,
            left: left,
            bottom: bottom,
            zIndex: isOpen ? 10 : 0,
          }}
        >
          <motion.div
            className="flex-1 flex flex-col overflow-hidden -bg-red-500"
            animate={{
              opacity: isOpen ? 1 : 0,
            }}
            transition={
              isOpen
                ? { delay: 0.1, duration: 0.1, ease: "easeOut" }
                : { duration: 0.1, ease: "easeOut" }
            }
          >
            <div className="shrink-0 h-12 flex items-center justify-between px-4 pr-2 -bg-red-500 text-[13px] leading-5 font-semibold border-b border-zinc-200">
              <div>Transcription</div>
              <div className="flex items-center">
                <div className="size-8 rounded-full hover:bg-zinc-100 flex items-center justify-center">
                  <MagnifyingGlassIcon className="size-4 text-zinc-500" />
                </div>
                <div className="size-8 rounded-full hover:bg-zinc-100 flex items-center justify-center">
                  <CopyDocumentIcon className="size-4 text-zinc-500" />
                </div>
                <div className="size-8 rounded-full hover:bg-zinc-100 flex items-center justify-center">
                  <MinusIcon className="size-4 text-zinc-500" />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto border-b border-zinc-200">
              <motion.div
                className="flex-1 flex flex-col px-4 py-4"
                style={{ width: panelBounds.width }}
              >
                {MESSAGES.map((message, index) => {
                  const prevMessage = index > 0 ? MESSAGES[index - 1] : null;
                  const shouldHaveLargeGap =
                    prevMessage && prevMessage.isUser !== message.isUser;
                  const gapClass = shouldHaveLargeGap
                    ? "mt-4"
                    : index > 0
                    ? "mt-1"
                    : "";

                  return message.isUser ? (
                    <UserMessage
                      key={message.id}
                      message={message.message}
                      className={gapClass}
                    />
                  ) : (
                    <PariticipantMessage
                      key={message.id}
                      message={message.message}
                      className={gapClass}
                    />
                  );
                })}
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            className="shrink-0 flex flex-row items-center justify-between -bg-red-500"
            animate={{
              padding: isOpen ? 14 : 6,
            }}
            transition={isOpen ? openSpring : closeSpring}
          >
            <div className="shrink-0 flex items-center justify-center">
              <div className="h-8 w-[42px] rounded-full flex items-center justify-center hover:bg-zinc-100">
                <DancingBars />
              </div>
              <div className="size-8 flex items-center rounded-full justify-center hover:bg-zinc-100">
                <StopIcon className="size-4 text-zinc-500" />
              </div>
            </div>

            <motion.div
              className="flex items-center justify-between"
              animate={{
                opacity: isOpen ? 1 : 0,
              }}
              transition={
                isOpen
                  ? { delay: 0.1, duration: 0.1, ease: "easeOut" }
                  : { duration: 0.1, ease: "easeOut" }
              }
            >
              <div className="flex items-center gap-0.5 p-2 pl-2.5 rounded-full hover:bg-zinc-100">
                <AudioSettingsIcon className="size-4 text-zinc-500" />
                <ChevronUpIcon className="size-3 text-zinc-500" />
              </div>
              <div className="flex items-center gap-0.5 pr-2 py-1.5 pl-2.5 rounded-full text-zinc-500 hover:bg-zinc-100">
                <div className="flex items-center gap-1">
                  <LanguageIcon className="size-4 text-zinc-500" />
                  <span className="text-[13px] leading-5 font-medium ">
                    English
                  </span>
                </div>
                <ChevronUpIcon className="size-3 text-zinc-500" />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

const MESSAGES = [
  {
    id: 1,
    message:
      "Hey team, I wanted to follow up on our discussion from yesterday's meeting about the quarterly planning session.",
    isUser: true,
  },
  {
    id: 2,
    message:
      "Of course! We covered quite a bit of ground. What specific aspect would you like me to recap?",
    isUser: false,
  },
  {
    id: 3,
    message:
      "The action items, particularly who was supposed to reach out to the stakeholders.",
    isUser: true,
  },
  {
    id: 4,
    message:
      "I remember we assigned different people to different departments, but I can't recall the exact breakdown. Sarah was handling marketing, I think?",
    isUser: true,
  },
  {
    id: 5,
    message:
      "And someone else was taking care of the engineering team coordination. There were also discussions about timeline adjustments and budget allocations that I want to make sure we're all aligned on before moving forward.",
    isUser: true,
  },
  {
    id: 6,
    message: "Right! Let me break that down for you.",
    isUser: false,
  },
  {
    id: 7,
    message:
      "Sarah is indeed handling marketing outreach, specifically reaching out to the brand partnerships team and the social media coordinators.",
    isUser: false,
  },
  {
    id: 8,
    message:
      "Mike volunteered to coordinate with engineering, and he's supposed to set up meetings with the backend and frontend team leads by Friday.",
    isUser: false,
  },
  {
    id: 9,
    message: "Perfect, that matches what I remembered.",
    isUser: true,
  },
  {
    id: 10,
    message:
      "For the client services department, Jessica took that on. She's planning to schedule calls with our top three clients to get their input on the proposed feature roadmap.",
    isUser: false,
  },
  {
    id: 11,
    message:
      "The timeline we discussed was to have all stakeholder feedback collected by the end of next week, which gives us two weeks to incorporate their suggestions before the final presentation to the board.",
    isUser: false,
  },
  {
    id: 12,
    message:
      "And what about the budget discussion? I remember there being some concerns about the allocated resources for the mobile app development phase.",
    isUser: true,
  },
  {
    id: 13,
    message:
      "Yes, that was a significant part of our conversation. The finance team, led by David, raised concerns about the initial budget estimate being potentially insufficient for the mobile development phase.",
    isUser: false,
  },
  {
    id: 14,
    message:
      "They suggested we might need an additional 20-25% buffer for unexpected technical challenges, especially given the complexity of the cross-platform requirements we're aiming for.",
    isUser: false,
  },
  {
    id: 15,
    message:
      "David is supposed to prepare a detailed cost breakdown analysis and present alternative funding scenarios by Tuesday.",
    isUser: false,
  },
  {
    id: 16,
    message:
      "That's really helpful. I should probably touch base with David before Tuesday to see if he needs any additional information from our side.",
    isUser: true,
  },
  {
    id: 17,
    message:
      "That would be great! He mentioned he might need access to the technical specifications document that the engineering team prepared last month.",
    isUser: false,
  },
  {
    id: 18,
    message: "I can get him that. Anything else I should be aware of?",
    isUser: true,
  },
  {
    id: 19,
    message:
      "One more thing - we also discussed the possibility of bringing in an external consultant for the user experience design phase.",
    isUser: false,
  },
  {
    id: 20,
    message:
      "Lisa from the design team suggested someone she's worked with before who specializes in mobile UX for enterprise applications.",
    isUser: false,
  },
  {
    id: 21,
    message:
      "The idea is to have them conduct user research sessions and provide recommendations before we finalize the interface mockups. This would add about two weeks to our timeline but could significantly improve the end product quality.",
    isUser: false,
  },
  {
    id: 22,
    message:
      "I think that's worth considering. The user experience is crucial for adoption rates.",
    isUser: true,
  },
  {
    id: 23,
    message:
      "Exactly! Lisa is supposed to reach out to the consultant this week to discuss availability and pricing.",
    isUser: false,
  },
  {
    id: 24,
    message:
      "She'll report back to us in Friday's standup meeting with a recommendation on whether to proceed.",
    isUser: false,
  },
];

function UserMessage({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={twMerge(
        "flex items-center justify-center px-3 py-1.5 rounded-2xl rounded-br text-sm text-emerald-900 bg-emerald-700/20 max-w-[calc(100%-64px)] self-end",
        className
      )}
    >
      {message}
    </div>
  );
}

function PariticipantMessage({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={twMerge(
        "flex items-center justify-center px-3 py-1.5 rounded-2xl rounded-bl text-sm text-zinc-900 bg-zinc-100 max-w-[calc(100%-64px)] self-start",
        className
      )}
    >
      {message}
    </div>
  );
}
