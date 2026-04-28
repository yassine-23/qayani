'use client';

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';

/* ============================================
   Input — Text inputs, textareas, and selects

   Dark theme with subtle borders. Focus state
   uses tier-violet glow. Clean, precise spacing.
   ============================================ */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-label uppercase tracking-[0.1em] text-muted"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full rounded-md',
            'bg-white/[0.03] border border-white/[0.08]',
            'px-3 py-2.5',
            'text-body-sm text-primary placeholder:text-muted/50',
            'transition-all duration-interaction ease-spring',
            'focus:outline-none focus:border-cube/40 focus:bg-white/[0.05]',
            'focus:shadow-[0_0_0_3px_rgba(124,58,237,0.08)]',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            error ? 'border-error/40 focus:border-error/60' : '',
            className,
          ].join(' ')}
          {...props}
        />
        {hint && !error && (
          <p className="text-caption text-muted">{hint}</p>
        )}
        {error && (
          <p className="text-caption text-error">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;

/* Textarea */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-label uppercase tracking-[0.1em] text-muted"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={[
            'w-full rounded-md resize-none',
            'bg-white/[0.03] border border-white/[0.08]',
            'px-3 py-2.5',
            'text-body-sm text-primary placeholder:text-muted/50',
            'leading-relaxed',
            'transition-all duration-interaction ease-spring',
            'focus:outline-none focus:border-cube/40 focus:bg-white/[0.05]',
            'focus:shadow-[0_0_0_3px_rgba(124,58,237,0.08)]',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            error ? 'border-error/40 focus:border-error/60' : '',
            className,
          ].join(' ')}
          {...props}
        />
        {hint && !error && (
          <p className="text-caption text-muted">{hint}</p>
        )}
        {error && (
          <p className="text-caption text-error">{error}</p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
