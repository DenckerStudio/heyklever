"use client";

import * as React from "react";
import { motion } from "framer-motion";
import * as Accordion from "@radix-ui/react-accordion";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  icon?: string;
  iconPosition?: "left" | "right";
}

interface ScrollFAQAccordionProps {
  data: FAQItem[];
  className?: string;
  questionClassName?: string;
  answerClassName?: string;
}

export default function ScrollFAQAccordion({
  data = [
    {
      id: 1,
      question: "What is Klever AI?",
      answer:
        "Klever AI is a RAG assistant that can answer questions based on the information in your team’s files. Secure and fast.",
    },
    {
      id: 2,
      question: "Do I need to install anything?",
      answer:
        "You dont need to install Klever AI, it's all in the cloud, and you can access your files through the dashboard.",
    },
    {
      id: 3,
      question: "Why should I use Klever AI?",
      answer:
        "Klever AI is a great way to save time and get the information you need quickly. Imagine you save 10 minutes per day, that's 60.8 hours per year. That's a lot of time looking for information.",
    },
    {
      id: 4,
      question: "How is my data secure in Klever AI?",
      answer:
        "We are not going to compete with the big guys, instead we integrate with the best security providers in the world, like Google Cloud, Microsoft Azure, and AWS. That way you can be sure your data is secure.",
    },
    {
      id: 5,
      question: "I am not a tech guy, can I use Klever AI without any technical knowledge?",
      answer:
        "Yes, you can use Klever AI without any technical knowledge. We have a simple and user-friendly dashboard that allows you to upload your files and chat with your personal AI agent.",
    },
  ],
  className,
  questionClassName,
  answerClassName,
}: ScrollFAQAccordionProps) {
  const [openItem, setOpenItem] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const contentRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());

  // Register GSAP plugins
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
    }
  }, []);

  // Set up GSAP animations
  useGSAP(() => {
    if (!containerRef.current || data.length === 0) return;

    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: `+=${data.length * 200}`, // adjust spacing
        scrub: 0.3,
        pin: true,
        markers: false,
      },
    });

    data.forEach((item, index) => {
      const contentRef = contentRefs.current.get(item.id.toString());
      if (contentRef) {
        tl.add(() => {
          setOpenItem(item.id.toString());
        }, index * 2); // spacing between triggers
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [data]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "max-w-4xl top-[100px] mx-auto text-center py-16 h-[180vh]",
        className
      )}
    >
      {/* Top gradient background */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 min-h-screen"
      >
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            background: `linear-gradient(to top right, var(--brand), var(--brand-foreground))`,
          }}
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] max-w-none -translate-x-1/2 rotate-[30deg] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem] min-h-screen"
        />
      </div>

      <h2 className="text-3xl font-bold mb-2">Frequently Asked Questions</h2>
      <p className="text-gray-600 dark:text-gray-200 mb-6">
        Find answers to common questions about Klever AI, data security, and
        pricing.
      </p>

      <Accordion.Root type="single" collapsible value={openItem || ""}>
        {data.map((item) => (
          <Accordion.Item
            value={item.id.toString()}
            key={item.id}
            className="mb-6"
          >
            <Accordion.Header>
              <Accordion.Trigger className="flex w-full items-center justify-start gap-x-4 cursor-default">
                <div
                  className={cn(
                    "relative flex items-center space-x-2 rounded-xl p-2 transition-colors",
                    openItem === item.id.toString()
                      ? "bg-primary/20 text-primary"
                      : "bg-muted",
                    questionClassName
                  )}
                >
                  {item.icon && (
                    <span
                      className={cn(
                        "absolute bottom-6",
                        item.iconPosition === "right" ? "right-0" : "left-0"
                      )}
                      style={{
                        transform:
                          item.iconPosition === "right"
                            ? "rotate(7deg)"
                            : "rotate(-4deg)",
                      }}
                    >
                      {item.icon}
                    </span>
                  )}
                  <span className="font-medium">{item.question}</span>
                </div>

                <span
                  className={cn(
                    "text-gray-600 dark:text-gray-200",
                    openItem === item.id.toString() && "text-primary"
                  )}
                >
                  {openItem === item.id.toString() ? (
                    <Minus className="h-5 w-5" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                </span>
              </Accordion.Trigger>
            </Accordion.Header>

            <Accordion.Content asChild forceMount>
              <motion.div
                ref={(el) => {
                  if (el) contentRefs.current.set(item.id.toString(), el);
                }}
                initial="collapsed"
                animate={openItem === item.id.toString() ? "open" : "collapsed"}
                variants={{
                  open: { opacity: 1, height: "auto" },
                  collapsed: { opacity: 0, height: 0 },
                }}
                transition={{ duration: 0.4 }}
                className="overflow-hidden"
              >
                <div className="flex justify-end ml-7 mt-4 md:ml-16">
                  <div
                    className={cn(
                      "relative max-w-md rounded-2xl px-4 py-2 text-white dark:text-black text-lg bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-300 via-indigo-400 dark:to-purple-300",
                      answerClassName
                    )}
                  >
                    {item.answer}
                  </div>
                </div>
              </motion.div>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </div>
  );
}
