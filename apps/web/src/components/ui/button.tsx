import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { type ButtonHTMLAttributes, type JSX } from 'react';
import { cn } from '../../lib/utils.ts';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-sky-700 px-4 py-2 text-white hover:bg-sky-800',
        outline: 'border border-slate-300 bg-white px-4 py-2 hover:bg-slate-100',
        destructive: 'bg-red-700 px-4 py-2 text-white hover:bg-red-800',
        ghost: 'px-3 py-2 hover:bg-slate-100',
      },
      size: { default: '', sm: 'px-3 py-1 text-xs' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type = 'button',
  ...props
}: ButtonProps): JSX.Element {
  const Component = asChild ? Slot : 'button';
  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      type={asChild ? undefined : type}
      {...props}
    />
  );
}
