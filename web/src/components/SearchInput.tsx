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
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        value={value}
        {...rest}
        className={cn(
          'w-full h-10 pl-10 pr-10 rounded-[8px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-[13px]',
          'text-foreground placeholder:text-muted-foreground',
          'transition-colors duration-150',
          'hover:border-[rgba(255,255,255,0.2)]',
          'focus-visible:outline-none focus-visible:border-accent',
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
