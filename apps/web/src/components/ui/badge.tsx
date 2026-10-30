import { type HTMLAttributes, type JSX } from 'react';
import { cn } from '../../lib/utils.ts';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700',
        className,
      )}
      {...props}
    />
  );
}
