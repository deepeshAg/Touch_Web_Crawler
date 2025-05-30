import React from 'react';
import { motion } from 'framer-motion';
import { Globe, ExternalLink, Star } from 'lucide-react';

interface Source {
  title: string;
  url: string;
  snippet: string;
  relevance_score?: number;
}

interface SourcesProps {
  sources: Source[];
  isVisible: boolean;
}

export default function Sources({ sources, isVisible }: SourcesProps) {
  if (!isVisible || !sources.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-6 bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Globe className="w-4 h-4 text-emerald-400" />
            </div>
            <h4 className="text-sm font-medium text-white">
              Sources ({sources.length})
            </h4>
          </div>
        </div>
        
        <div className="grid gap-4">
          {sources.map((source, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="group"
            >
              <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 p-4 hover:border-gray-600/50 transition-all duration-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Globe className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-white text-sm mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                          {source.title}
                        </h5>
                        <p className="text-xs text-gray-400 mb-3 line-clamp-2 leading-relaxed">
                          {source.snippet}
                        </p>
                        <div className="flex items-center justify-between">
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <span className="font-mono">
                              {new URL(source.url).hostname}
                            </span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          {source.relevance_score && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-400" />
                              <span className="text-xs text-gray-400">
                                {Math.round(source.relevance_score * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}