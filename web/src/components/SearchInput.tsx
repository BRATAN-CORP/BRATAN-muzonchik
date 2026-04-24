import { Search as SearchIcon, X } from 'lucide-react';
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
  inputClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { onClear, className, inputClassName, value, ...rest },
  ref,
) {
  return (
    <div className={cn('relative flex w-full items-center', className)}>
      <SearchIcon
        size={16}
        aria-hidden
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={ref}
        type="search"
        value={value}
        {...rest}
        className={cn(
          'w-full h-11 pl-10 pr-10 rounded-full bg-input border border-border text-sm',
          'text-foreground placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          inputClassName,
        )}
      />
      {value ? (
        <button
          type="button"
          aria-label="Очистить поиск"
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
});
