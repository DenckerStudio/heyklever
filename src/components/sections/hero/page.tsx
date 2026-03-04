'use client'
import React from 'react'
import { Button } from '@/components/ui/button'
import { SparklesIcon, MessageCircleIcon, ShieldAlertIcon, ShieldCheckIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import DockText from '@/components/ui/dock-text'
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button'
import Link from 'next/link'
import { TypingAnimation } from '@/components/ui/typing-animation'
import { Announcement, AnnouncementTitle, AnnouncementTag } from '@/components/ui/announcement'

const stats = [
  {
    title: 'Fast',
    description: 'Ultra-fast processing and delivery of results',
    icon: <SparklesIcon className="w-5 h-5" />
  },
  {
    title: 'Team & Client Experience',
    description: 'AI chat for your team and client-portal for customers to interact with your documents.',
    icon: <MessageCircleIcon className="w-5 h-5" />
  },
  {
    title: 'Document Guardian',
    description: 'Get notified when documents are outdated or if your customers seek missing information.',
    icon: <ShieldAlertIcon className="w-5 h-5" />
  },
  {
    title: 'Security & Integrations',
    description: 'integrated with the best security providers in the world, like Google Cloud, Microsoft Azure, and AWS.',
    icon: <ShieldCheckIcon className="w-5 h-5" />
  },
]



const Hero = () => {
  return (
    <div className="min-h-svh w-screen text-black dark:text-white flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-6xl space-y-12 relative z-10">
        <div className="flex flex-col items-center text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -20, filter: 'blur(20px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              duration: 1,
              delay: 1.2,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Announcement movingBorder>
              <AnnouncementTag lustre>KleverAI</AnnouncementTag>
              <AnnouncementTitle>
                Next Generation Information Retrieval
                <span className="text-lg">✨</span>
              </AnnouncementTitle>
            </Announcement>
          </motion.div>
          <div className="space-y-6 flex items-center justify-center flex-col ">
            <motion.div
              className="dark:text-white text-black flex flex-row gap-6"
            >
              <motion.div
                initial={{ opacity: 0, y: 20, filter: 'blur(20px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.5,
                  delay: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <DockText text="Life" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20, filter: 'blur(20px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.5,
                  delay: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <DockText text="Is" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20, filter: 'blur(20px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.5,
                  delay: 1,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <DockText text="Short" />
              </motion.div>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.8,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="text-lg dark:text-neutral-300 text-neutral-700 max-w-2xl"
            >
              <TypingAnimation
                className="text-lg"
                duration={50}
                typeSpeed={30}
                delay={800}
                showCursor={true}
                blinkCursor={true}
                cursorStyle="line"
              >
                Designed with aesthetics and performance in mind. Experience
                ultra-fast processing, better client experience, and intuitive
                document retrieval
              </TypingAnimation>
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 1.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex flex-col sm:flex-row gap-4 items-center"
            >
              <Link href="/signup">
                <InteractiveHoverButton text="Get Started" className="text-sm" />
              </Link>
              <Button
                variant="ghost"
                className="text-sm px-8 py-1 rounded-xl bg-transparent text-black dark:text-white border dark:border-white/20 border-white shadow-none hover:bg-white/10 transition-all duration-200"
              >
                Sign In
              </Button>
            </motion.div>
          </div>
        </div>
        {/* <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto">
          {stats.map((stats, idx) => (
            <div
              key={idx}
              className="backdrop-blur-sm bg-black/5 dark:bg-white/5 border dark:border-white/10 border-black/10 rounded-xl p-4 md:p-6 h-40 md:h-48 flex flex-col justify-start items-start space-y-2 md:space-y-3"
            >
              <div className="flex items-center justify-center w-10 h-10">
                {stats.icon}
              </div>
              <div className="flex flex-col items-start justify-start">
                <h3 className="text-sm md:text-base font-medium">
                  {stats.title}
                </h3>
                <p className="text-xs md:text-sm text-neutral-400">
                  {stats.description}
                </p>
              </div>
            </div>
          ))}
        </div> */}
      </div>
      <div className="absolute inset-0 z-0 max-h-[100vh]">
        <div className="w-[60%] top-1/2 left-1/2 translate-x-[-60%] translate-y-[-100%] bg-indigo-500/20 dark:bg-indigo-400/20 absolute z-0 h-[80%] rounded-full blur-[100px] rotate-12" />
        <div className="w-[40%] top-1/2 left-1/2 translate-x-[-60%] translate-y-[150%] bg-blue-700/20 dark:bg-blue-200/20 absolute z-0 h-[400px] rounded-full blur-[100px] rotate-12" />
      </div>
    </div>
  );
}

export default Hero