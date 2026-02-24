/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Globe, 
  Delete, 
  ArrowUp, 
  Smile, 
  Type, 
  Languages, 
  ChevronDown, 
  ChevronUp,
  X,
  Send,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type LayoutMode = 'lowercase' | 'uppercase' | 'symbols' | 'emojis';

interface KeyProps {
  label: React.ReactNode;
  value: string;
  onClick: (val: string) => void;
  onLongPress?: (val: string) => void;
  className?: string;
  type?: 'default' | 'action' | 'special';
  accents?: string[];
}

// --- Constants ---
const GENAI_MODEL = "gemini-3-flash-preview";

const LAYOUTS = {
  lowercase: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
    ['?123', 'emoji', 'globe', 'space', '.', 'enter']
  ],
  uppercase: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'backspace'],
    ['?123', 'emoji', 'globe', 'space', '.', 'enter']
  ],
  symbols: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['@', '#', '$', '_', '&', '-', '+', '(', ')', '/'],
    ['*123', '*', '"', '\'', ':', ';', '!', '?', 'backspace'],
    ['abc', 'emoji', 'globe', 'space', ',', 'enter']
  ]
};

const ACCENTS: Record<string, string[]> = {
  'a': ['á', 'à', 'â', 'ã', 'ä'],
  'e': ['é', 'è', 'ê', 'ë'],
  'i': ['í', 'ì', 'î', 'ï'],
  'o': ['ó', 'ò', 'ô', 'õ', 'ö'],
  'u': ['ú', 'ù', 'û', 'ü'],
  'c': ['ç'],
  'n': ['ñ'],
  'A': ['Á', 'À', 'Â', 'Ã', 'Ä'],
  'E': ['É', 'È', 'Ê', 'Ë'],
  'I': ['Í', 'Ì', 'Î', 'Ï'],
  'O': ['Ó', 'Ò', 'Ô', 'Õ', 'Ö'],
  'U': ['Ú', 'Ù', 'Û', 'Ü'],
  'C': ['Ç'],
  'N': ['Ñ'],
};

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
  '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
  '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
  '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
  '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
  '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
  '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾',
  '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿',
  '😾', '🤲', '👐', '🙌', '👏', '🤝', '👍', '👎', '👊', '✊',
  '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈',
  '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐', '🖖', '👋', '🤙',
  '💪', '🦾', '🖕', '✍️', '🙏', '🦶', '🦵', '🦿', '💄', '💋',
  '👄', '🦷', '👅', '👂', '🦻', '👃', '👣', '👁', '👀', '🧠',
  '🗣', '👤', '👥', '🫂', '👶', '👧', '🧒', '👦', '👩', '🧑',
  '👨', '👩‍🦱', '🧑‍🦱', '👨‍🦱', '👩‍🦰', '🧑‍🦰', '👨‍🦰', '👱‍♀️', '👱', '👱‍♂️',
  '🫨', '🫷', '🫸', '🫵', '🫶', '🫦', '🫧', '🪪', '🪬', '🪷',
  '🪸', '🪻', '🫘', '🫗', '🫙', '🛝', '🛞', '🛟', '🫠', '🫢',
  '🫣', '🫡', '🫥', '🫤', '🫱', '🫲', '🫳', '🫴', '🫰', '🫵'
];

// --- Components ---

const Key: React.FC<KeyProps> = ({ label, value, onClick, className, type = 'default', accents }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [showAccents, setShowAccents] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startPos = useRef<{ x: number, y: number } | null>(null);
  const swipeTriggered = useRef(false);
  const keyRef = useRef<HTMLButtonElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsPressed(true);
    swipeTriggered.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    
    if (accents && accents.length > 0) {
      timerRef.current = setTimeout(() => {
        setShowAccents(true);
        setSelectedIndex(-1);
      }, 400);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPos.current) return;

    if (showAccents && accents) {
      const dx = e.clientX - startPos.current.x;
      // Calculate which accent is selected based on horizontal movement
      // Each accent item is roughly 40px wide
      const index = Math.floor((dx + 20) / 40);
      if (index >= 0 && index < accents.length) {
        setSelectedIndex(index);
      } else {
        setSelectedIndex(-1);
      }
      return;
    }

    if (swipeTriggered.current) return;

    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;

    // Detect horizontal swipe (threshold of 40px)
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (accents && accents.length > 0) {
        swipeTriggered.current = true;
        setShowAccents(true);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    }
  };

  const handlePointerUp = () => {
    setIsPressed(false);
    startPos.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (showAccents && accents) {
      if (selectedIndex >= 0 && selectedIndex < accents.length) {
        onClick(accents[selectedIndex]);
      } else {
        onClick(value);
      }
      setShowAccents(false);
      setSelectedIndex(-1);
      swipeTriggered.current = true; // Prevent double click
    }
  };

  const handleClick = () => {
    if (!swipeTriggered.current && !showAccents) {
      onClick(value);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence>
        {showAccents && accents && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: -50, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            className="absolute left-1/2 -translate-x-1/2 z-50 flex bg-zinc-800 border border-white/20 rounded-xl p-1 shadow-2xl"
          >
            {accents.map((acc, i) => (
              <div
                key={acc}
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-lg text-lg font-bold transition-colors",
                  selectedIndex === i ? "bg-white text-black" : "text-white"
                )}
              >
                {acc}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        ref={keyRef}
        whileTap={{ scale: 0.95 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        className={cn(
          "relative flex items-center justify-center h-12 w-full rounded-md text-sm font-medium transition-colors touch-none",
          "bg-black/20 text-white border border-white/5 backdrop-blur-sm",
          type === 'action' && "bg-white/60 text-black border-black/10",
          type === 'special' && "bg-white/5 text-white",
          isPressed && "opacity-80",
          showAccents && "bg-white/20"
        )}
      >
        {label}
        {accents && accents.length > 0 && (
          <div className="absolute top-0.5 right-1 w-1 h-1 bg-white/20 rounded-full" />
        )}
      </motion.button>
    </div>
  );
};

export default function App() {
  const [inputText, setInputText] = useState('');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('lowercase');
  const [showEmojis, setShowEmojis] = useState(false);
  const [isTranslateOpen, setIsTranslateOpen] = useState(false);
  const [translateMode, setTranslateMode] = useState<'en-pt' | 'pt-en'>('pt-en');
  const [translationInput, setTranslationInput] = useState('');
  const [translationResult, setTranslationResult] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [wordFrequencies, setWordFrequencies] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('word_frequencies');
    return saved ? JSON.parse(saved) : {};
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const aiRef = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    if (process.env.GEMINI_API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('word_frequencies', JSON.stringify(wordFrequencies));
  }, [wordFrequencies]);

  const getCurrentWord = (text: string) => {
    const words = text.split(/\s/);
    return words[words.length - 1];
  };

  useEffect(() => {
    const currentWord = getCurrentWord(inputText).toLowerCase();
    if (currentWord.length > 0) {
      const matches = Object.keys(wordFrequencies)
        .filter(word => word.startsWith(currentWord) && word !== currentWord)
        .sort((a, b) => wordFrequencies[b] - wordFrequencies[a])
        .slice(0, 3);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  }, [inputText, wordFrequencies]);

  const learnWord = (word: string) => {
    if (!word || word.length < 2) return;
    const cleanWord = word.toLowerCase().replace(/[^a-zà-úç]/g, '');
    if (cleanWord.length < 2) return;
    
    setWordFrequencies(prev => ({
      ...prev,
      [cleanWord]: (prev[cleanWord] || 0) + 1
    }));
  };

  const handleKeyClick = (val: string) => {
    if (val === 'backspace') {
      setInputText(prev => prev.slice(0, -1));
    } else if (val === 'shift') {
      setLayoutMode(prev => prev === 'lowercase' ? 'uppercase' : 'lowercase');
    } else if (val === '?123') {
      setLayoutMode('symbols');
    } else if (val === 'abc') {
      setLayoutMode('lowercase');
    } else if (val === 'space') {
      const currentWord = getCurrentWord(inputText);
      learnWord(currentWord);
      setInputText(prev => prev + ' ');
    } else if (val === 'enter') {
      const currentWord = getCurrentWord(inputText);
      learnWord(currentWord);
      setInputText(prev => prev + '\n');
    } else if (val === 'emoji') {
      setShowEmojis(!showEmojis);
    } else if (val === 'globe') {
      setIsTranslateOpen(!isTranslateOpen);
    } else {
      setInputText(prev => prev + val);
      if (layoutMode === 'uppercase') setLayoutMode('lowercase');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    const words = inputText.split(/\s/);
    words[words.length - 1] = suggestion;
    setInputText(words.join(' ') + ' ');
    learnWord(suggestion);
  };

  const translateText = async () => {
    if (!translationInput.trim() || !aiRef.current) return;

    setIsTranslating(true);
    try {
      const prompt = translateMode === 'en-pt' 
        ? `Translate the following English text to Portuguese: "${translationInput}". Return only the translated text.`
        : `Translate the following Portuguese text to English: "${translationInput}". Return only the translated text.`;

      const response = await aiRef.current.models.generateContent({
        model: GENAI_MODEL,
        contents: prompt,
      });

      setTranslationResult(response.text || '');
    } catch (error) {
      console.error("Translation error:", error);
      setTranslationResult("Error translating.");
    } finally {
      setIsTranslating(false);
    }
  };

  const useTranslation = () => {
    setInputText(prev => prev + translationResult);
    setTranslationInput('');
    setTranslationResult('');
    setIsTranslateOpen(false);
  };

  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] flex flex-col items-center justify-end p-4 font-sans">
      {/* Input Display Area */}
      <div className="w-full max-w-md mb-8 flex flex-col gap-4">
        <div className="bg-black rounded-2xl p-6 shadow-2xl min-h-[200px] flex flex-col">
          <div className="flex justify-between items-center mb-4 border-bottom border-white/5 pb-2">
            <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">Seven Keyboard Output</span>
            <button 
              onClick={() => setInputText('')}
              className="text-[10px] uppercase tracking-widest font-bold text-white hover:opacity-50 transition-opacity"
            >
              Clear
            </button>
          </div>
          <div className="flex-1 text-white text-xl whitespace-pre-wrap break-words">
            {inputText || <span className="text-white/20 italic">Start typing...</span>}
          </div>
        </div>
      </div>

      {/* Keyboard Container */}
      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl rounded-t-3xl p-2 shadow-2xl border-t border-white/10 relative overflow-hidden">
        
        {/* Suggestion Bar */}
        <div className="h-10 flex items-center justify-around px-2 mb-2 border-b border-white/5">
          {suggestions.length > 0 ? (
            suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-white/80 text-sm font-medium px-4 py-1 rounded-full hover:bg-white/10 transition-colors"
              >
                {suggestion}
              </button>
            ))
          ) : (
            <span className="text-white/20 text-[10px] uppercase tracking-widest font-bold">Suggestions</span>
          )}
        </div>

        {/* Translation Bar */}
        <AnimatePresence>
          {isTranslateOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-white text-black p-4 rounded-2xl mb-2 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Languages size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {translateMode === 'en-pt' ? 'EN → PT' : 'PT → EN'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTranslateMode(prev => prev === 'en-pt' ? 'pt-en' : 'en-pt')}
                    className="p-1 hover:bg-black/10 rounded"
                  >
                    <Globe size={14} />
                  </button>
                  <button onClick={() => setIsTranslateOpen(false)} className="p-1 hover:bg-black/10 rounded">
                    <X size={14} />
                  </button>
                </div>
              </div>
              
              <div className="relative">
                <input 
                  type="text" 
                  value={translationInput}
                  onChange={(e) => setTranslationInput(e.target.value)}
                  placeholder="Type to translate..."
                  className="w-full bg-black/10 border border-black/20 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-black/40 text-black"
                  onKeyDown={(e) => e.key === 'Enter' && translateText()}
                />
                <button 
                  onClick={translateText}
                  disabled={isTranslating}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-black/60 hover:text-black"
                >
                  {isTranslating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>

              {translationResult && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-black text-white p-3 rounded-lg flex items-center justify-between"
                >
                  <span className="text-sm font-medium">{translationResult}</span>
                  <button 
                    onClick={useTranslation}
                    className="text-[10px] font-bold uppercase bg-white text-black px-2 py-1 rounded"
                  >
                    Insert
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emoji Picker Overlay */}
        <AnimatePresence>
          {showEmojis && (
            <motion.div 
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              className="absolute inset-x-0 bottom-0 bg-black z-20 h-full p-4 overflow-y-auto grid grid-cols-8 gap-2"
            >
              <div className="col-span-8 flex justify-between items-center mb-4 sticky top-0 bg-black py-2">
                <span className="text-xs font-bold uppercase text-white/40">Emojis</span>
                <button onClick={() => setShowEmojis(false)} className="p-1 bg-white text-black rounded-full">
                  <ChevronDown size={16} />
                </button>
              </div>
              {EMOJIS.map(emoji => (
                <button 
                  key={emoji} 
                  onClick={() => { setInputText(prev => prev + emoji); setShowEmojis(false); }}
                  className="text-2xl hover:bg-zinc-800 p-2 rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keyboard Layout */}
        <div className="flex flex-col gap-2">
          {LAYOUTS[layoutMode === 'emojis' ? 'lowercase' : layoutMode].map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center gap-1.5">
              {row.map((keyVal, keyIndex) => {
                let label: React.ReactNode = keyVal;
                let type: 'default' | 'action' | 'special' = 'default';
                let width = "flex-1";

                if (keyVal === 'backspace') {
                  label = <Delete size={18} />;
                  type = 'special';
                  width = "w-12";
                } else if (keyVal === 'shift') {
                  label = <ArrowUp size={18} className={layoutMode === 'uppercase' ? 'text-white' : 'text-white/30'} />;
                  type = 'special';
                  width = "w-12";
                } else if (keyVal === 'space') {
                  label = <span className="text-[10px] uppercase tracking-[0.2em] font-black opacity-40">By seven</span>;
                  width = "w-48";
                } else if (keyVal === 'enter') {
                  label = <Send size={18} />;
                  type = 'action';
                  width = "w-14";
                } else if (keyVal === 'emoji') {
                  label = <Smile size={18} />;
                  type = 'special';
                  width = "w-10";
                } else if (keyVal === 'globe') {
                  label = <Globe size={18} />;
                  type = 'special';
                  width = "w-10";
                } else if (keyVal === '?123' || keyVal === 'abc') {
                  type = 'special';
                  width = "w-12";
                }

                return (
                  <Key
                    key={`${rowIndex}-${keyIndex}`}
                    label={label}
                    value={keyVal}
                    onClick={handleKeyClick}
                    accents={ACCENTS[keyVal]}
                    type={type}
                    className={width}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer / Info */}
      <div className="mt-4 text-[10px] text-black/20 uppercase tracking-widest font-bold">
        Seven Design Studio • 2026
      </div>
    </div>
  );
}
