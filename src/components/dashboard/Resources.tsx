import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, FileText, BookOpen, Link2, Code, Database } from 'lucide-react';
import { motion } from "framer-motion";

const Resources = () => {
  const navigate = useNavigate();
  const resources = [
    {
      title: "Research Methodology Guide",
      description: "Comprehensive guide to academic research methods and best practices",
      icon: <BookOpen className="w-6 h-6 text-cyan-400" />,
      link: "https://example.com/research-methods"
    },
    {
      title: "Academic Writing Templates",
      description: "Templates for research papers, theses, and dissertations",
      icon: <FileText className="w-6 h-6 text-purple-400" />,
      link: "https://example.com/writing-templates"
    },
    {
      title: "Citation Tools",
      description: "Tools for managing references and citations",
      icon: <Link2 className="w-6 h-6 text-blue-400" />,
      link: "https://example.com/citation-tools"
    },
    {
      title: "Data Analysis Resources",
      description: "Tutorials and tools for statistical analysis",
      icon: <Database className="w-6 h-6 text-green-400" />,
      link: "https://example.com/data-analysis"
    },
    {
      title: "Programming for Research",
      description: "Resources for using Python/R in academic research",
      icon: <Code className="w-6 h-6 text-orange-400" />,
      link: "https://example.com/research-programming"
    },
    {
      title: "Thesis Writing Guide",
      description: "Step-by-step guide to writing your thesis",
      icon: <FileText className="w-6 h-6 text-yellow-400" />,
      link: "https://example.com/thesis-guide"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <header className="bg-gray-800/50 border-b border-cyan-400/20 shadow-lg shadow-cyan-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  RESEARCH RESOURCES
                </h1>
                <p className="text-sm text-gray-400">TOOLS AND MATERIALS FOR YOUR RESEARCH</p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="border-gray-600 hover:bg-gray-700/50 hover:border-cyan-400 text-gray-300"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              BACK TO DASHBOARD
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource, index) => (
            <div key={index} className="bg-gray-800/50 border border-cyan-400/20 rounded-lg p-6 hover:bg-gray-700/30 transition-colors">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-gray-700 rounded-full">
                  {resource.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white">{resource.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{resource.description}</p>
                  <a 
                    href={resource.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block mt-3 text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    Visit Resource →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-gray-800/50 border border-cyan-400/20 rounded-lg p-6">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">ADDITIONAL RESOURCES</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 hover:bg-gray-700/30 rounded-lg transition-colors">
              <div>
                <h3 className="font-medium text-white">University Library Portal</h3>
                <p className="text-sm text-gray-400">Access to journals, books, and databases</p>
              </div>
              <a 
                href="https://library.example.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                Access
              </a>
            </div>
            <div className="flex items-center justify-between p-3 hover:bg-gray-700/30 rounded-lg transition-colors">
              <div>
                <h3 className="font-medium text-white">Research Ethics Guidelines</h3>
                <p className="text-sm text-gray-400">Institutional policies on research ethics</p>
              </div>
              <a 
                href="https://ethics.example.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                View
              </a>
            </div>
            <div className="flex items-center justify-between p-3 hover:bg-gray-700/30 rounded-lg transition-colors">
              <div>
                <h3 className="font-medium text-white">Statistical Software Tutorials</h3>
                <p className="text-sm text-gray-400">SPSS, R, and Python tutorials</p>
              </div>
              <a 
                href="https://stats.example.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-cyan-400 hover:text-cyan-300"
              >
                Learn
              </a>
            </div>
          </div>
        </div>
      </main>
      <motion.footer
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.5, duration: 0.5 }}
  className="fixed bottom-0 left-0 right-0 p-4 pb-20 md:pb-12 pr-20 md:pr-4 text-center z-50 bg-transparent"
>
  <motion.a
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    href="https://r2-vision.firebaseapp.com/"
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 group"
  >
    <span className="text-white font-medium drop-shadow-sm">Developed by</span>
    <span className="relative overflow-hidden">
      <motion.span
        className="block font-medium text-[#2980B9] font-bold"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          backgroundSize: '200% 200%',
        }}
      >
        R.R Bandara
      </motion.span>
      <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-purple-400 to-cyan-400 transition-all duration-300 group-hover:w-full" />
    </span>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-arrow-up-right text-purple-400 transition-transform group-hover:rotate-45 duration-300"
    >
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  </motion.a>
</motion.footer>
    </div>
  );
};

export default Resources;