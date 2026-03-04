import ScrollFAQAccordion from "@/components/ui/scroll-faqaccordion";
const  faqData = [
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
  ];

const FAQSection = () => {
  return <ScrollFAQAccordion data={faqData} />;
};

export default FAQSection;
