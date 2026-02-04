'use client';
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils/cn';

interface ChatInputProps {
  onSubmit: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSubmit, disabled, placeholder = '답변을 입력하세요...' }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSubmit(value);
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 200) + 'px';
    }
  }, [value]);

  return (
    <div className="flex gap-2 items-end">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className={cn(
          'flex-1 resize-none rounded-lg border border-zinc-300 dark:border-zinc-700',
          'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100',
          'px-4 py-3 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'placeholder:text-zinc-400 dark:placeholder:text-zinc-600'
        )}
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className={cn(
          'px-6 py-3 rounded-lg font-medium text-sm',
          'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
          'hover:bg-zinc-800 dark:hover:bg-zinc-200',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors'
        )}
      >
        제출
      </button>
    </div>
  );
}
