import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { ArrowUpRight, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'solid' | 'outline' | 'light' | 'ghost' | 'laterite' | 'danger';

const base =
  'inline-flex min-h-12 items-center justify-center gap-3 px-6 text-[0.8125rem] font-semibold uppercase tracking-[0.16em] transition-[background-color,color,border-color,transform] duration-300 ease-[var(--ease-calm)] disabled:pointer-events-none disabled:opacity-50 active:translate-y-px';

const variants: Record<Variant, string> = {
  solid: 'bg-forest text-ivory hover:bg-woodland',
  outline: 'border border-current text-forest hover:bg-forest hover:text-ivory hover:border-forest',
  light: 'bg-ivory text-woodland hover:bg-paper',
  ghost: 'text-current px-0 min-h-10 hover:text-laterite-deep',
  laterite: 'bg-laterite-deep text-paper hover:bg-[#7a3f23]',
  danger: 'bg-danger text-paper hover:bg-[#7f2418]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'solid', loading, icon, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
      {children}
      {!loading && icon}
    </button>
  );
});

export function ButtonLink({
  variant = 'solid',
  className,
  children,
  arrow,
  ...props
}: LinkProps & { variant?: Variant; arrow?: boolean }) {
  return (
    <Link className={cn(base, variants[variant], className)} {...props}>
      {children}
      {arrow && <ArrowUpRight className="size-4" aria-hidden />}
    </Link>
  );
}

/** Text link with the signature growing underline. */
export function TextLink({ className, children, ...props }: LinkProps) {
  return (
    <Link className={cn('eyebrow link-line inline-flex items-center gap-2', className)} {...props}>
      {children}
    </Link>
  );
}
