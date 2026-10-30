import * as LabelPrimitive from '@radix-ui/react-label';
import { type ComponentProps, type JSX } from 'react';
import { cn } from '../../lib/utils.ts';

export function Label({
  className,
  ...props
}: ComponentProps<typeof LabelPrimitive.Root>): JSX.Element {
  return (
    <LabelPrimitive.Root
      className={cn('text-sm font-medium text-slate-700', className)}
      {...props}
    />
  );
}
