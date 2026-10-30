import { type HTMLAttributes, type JSX } from 'react';
import { cn } from '../../lib/utils.ts';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={cn('rounded-lg border border-slate-200 bg-white p-6 shadow-sm', className)}
      {...props}
    />
  );
}
