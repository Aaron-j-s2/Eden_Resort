import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy?: string }) => ReactNode;
  tone?: 'light' | 'admin';
}

/** Label + control + hint/error, wired up for screen readers. */
export function FieldShell({ label, error, hint, required, className, children, tone = 'light' }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className={cn(tone === 'admin' ? 'text-xs font-semibold text-ink-soft' : 'eyebrow text-ink-soft')}>
        {label}
        {required && <span className="text-laterite-deep" aria-hidden> *</span>}
      </label>
      {children({ id, describedBy })}
      {error ? (
        <p id={errorId} className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const control =
  'w-full min-h-12 border-0 border-b border-ink/25 bg-transparent px-0 py-2 text-base text-ink placeholder:text-ink/35 transition-colors focus:border-forest focus:outline-none focus:ring-0 aria-[invalid=true]:border-danger';

const adminControl =
  'w-full min-h-10 rounded-sm border border-stone bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink/35 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15 aria-[invalid=true]:border-danger';

type Common = { label: string; error?: string; hint?: ReactNode; tone?: 'light' | 'admin'; wrapperClassName?: string };

export const TextField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Common>(function TextField(
  { label, error, hint, tone = 'light', wrapperClassName, className, required, ...props },
  ref,
) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} tone={tone} className={wrapperClassName}>
      {({ id, describedBy }) => (
        <input
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          aria-required={required}
          className={cn(tone === 'admin' ? adminControl : control, className)}
          {...props}
        />
      )}
    </FieldShell>
  );
});

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & Common>(
  function TextAreaField({ label, error, hint, tone = 'light', wrapperClassName, className, required, ...props }, ref) {
    return (
      <FieldShell label={label} error={error} hint={hint} required={required} tone={tone} className={wrapperClassName}>
        {({ id, describedBy }) => (
          <textarea
            ref={ref}
            id={id}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            aria-required={required}
            rows={4}
            className={cn(tone === 'admin' ? adminControl : control, 'resize-y', className)}
            {...props}
          />
        )}
      </FieldShell>
    );
  },
);

export const SelectField = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & Common>(
  function SelectField({ label, error, hint, tone = 'light', wrapperClassName, className, required, children, ...props }, ref) {
    return (
      <FieldShell label={label} error={error} hint={hint} required={required} tone={tone} className={wrapperClassName}>
        {({ id, describedBy }) => (
          <select
            ref={ref}
            id={id}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            aria-required={required}
            className={cn(tone === 'admin' ? adminControl : control, 'cursor-pointer', className)}
            {...props}
          >
            {children}
          </select>
        )}
      </FieldShell>
    );
  },
);
