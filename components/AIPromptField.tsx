'use client';

import React, { useState, useRef, useEffect } from 'react';

interface AIPromptFieldProps {
  onSubmit: (prompt: string) => void;
}

export default function AIPromptField({ onSubmit }: AIPromptFieldProps) {
  const [prompt, setPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const examplePrompts = [
    "Create a gear with 48 teeth and module 2.5",
    "Design a heavy-duty gear with 25° pressure angle",
    "Make a small precision gear with 12 teeth",
    "Build a large gear with 100 teeth for high torque",
    "Generate a helical gear with module 4",
    "Design an internal gear with 60 teeth",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt);

      // Add animation feedback
      if (inputRef.current) {
        inputRef.current.style.transform = 'scale(0.98)';
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.style.transform = 'scale(1)';
          }
        }, 100);
      }

      // Don't clear the prompt so user can refine
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    setShowSuggestions(false);
    onSubmit(suggestion);
  };

  // Auto-suggest based on input
  useEffect(() => {
    if (prompt.length > 2) {
      const filtered = examplePrompts.filter(p =>
        p.toLowerCase().includes(prompt.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [prompt]);

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={() => setShowSuggestions(prompt.length > 2)}
            placeholder="Describe gear requirements (e.g., '48 teeth with module 2.5')"
            className="flex-1 px-3 py-2 border rounded-md resize-none text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Apply
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-white border rounded-md shadow-lg z-50">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-2 mb-1">
                Suggestions
              </div>
              {suggestions.slice(0, 3).map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* Example Prompts */}
      {prompt.length === 0 && (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-2">Examples:</div>
          <div className="flex flex-wrap gap-1">
            {examplePrompts.slice(0, 3).map((example, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(example)}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 rounded transition-colors"
              >
                {example.split(' ').slice(0, 4).join(' ')}...
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}