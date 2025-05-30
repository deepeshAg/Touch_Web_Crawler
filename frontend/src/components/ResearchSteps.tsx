import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock } from 'lucide-react';

interface ResearchStep {
  step_number: number;
  description: string;
  search_query?: string;
  sources_found: number;
  timestamp: string;
}

interface ResearchStepsProps {
  steps: ResearchStep[];
  isVisible: boolean;
}

export default function ResearchSteps({ steps, isVisible }: ResearchStepsProps) {
  if (!isVisible || !steps.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-6 bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <h4 className="text-sm font-medium text-white">Research Process</h4>
        </div>
        
        <div className="space-y-4">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex items-start gap-4"
            >
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-xs font-medium text-white">{step.step_number}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className="absolute top-8 left-1/2 w-0.5 h-6 bg-gradient-to-b from-gray-600 to-transparent transform -translate-x-1/2"></div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 leading-relaxed">{step.description}</p>
                {step.search_query && (
                  <div className="mt-2 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                    <p className="text-xs text-gray-400 mb-1">Search Query</p>
                    <p className="text-xs text-blue-400 font-mono">"{step.search_query}"</p>
                    <div className="flex items-center gap-2 mt-2">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-gray-400">{step.sources_found} sources found</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}