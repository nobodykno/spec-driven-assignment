import { type InputHTMLAttributes, type JSX } from 'react';
import { cn } from '../../lib/utils.ts';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return (
    <input
      className={cn(
        'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
