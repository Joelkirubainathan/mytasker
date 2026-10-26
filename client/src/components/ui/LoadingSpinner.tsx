import { cn } from '../../utils/helpers';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
const borders = { sm: 'border-2', md: 'border-2', lg: 'border-3' };

export default function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'rounded-full border-slate-200 dark:border-slate-700 border-t-brand-500 animate-spin',
        sizes[size],
        borders[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
