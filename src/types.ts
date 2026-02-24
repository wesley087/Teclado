export type KeyboardLayout = 'lowercase' | 'uppercase' | 'symbols' | 'emojis';

export interface KeyConfig {
  label: string;
  value: string;
  type?: 'char' | 'action' | 'space' | 'backspace' | 'shift' | 'mode' | 'translate' | 'emoji';
  width?: string;
  accents?: string[];
}

export interface TranslationState {
  sourceText: string;
  translatedText: string;
  mode: 'en-pt' | 'pt-en';
  isTranslating: boolean;
}
