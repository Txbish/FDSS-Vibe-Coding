import { HelpCircle } from 'lucide-react';
import { useState, useRef, useEffect, type ReactNode } from 'react';

interface InfoTipProps {
  content: ReactNode;
  title?: string;
}

/**
 * A small (?) icon that shows a tooltip with an explanation on hover/click.
 * Designed to make complex financial concepts accessible to laymen.
 */
export function InfoTip({ content, title }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-ink-muted hover:text-rust transition-colors p-0.5 rounded-full focus:outline-none focus:ring-2 focus:ring-rust/30"
        aria-label="More information"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-surface rounded-xl shadow-lg border border-border text-xs leading-relaxed text-ink-soft animate-fade-in">
          {title && <p className="font-semibold text-ink mb-1">{title}</p>}
          <div>{content}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-2 h-2 bg-surface border-b border-r border-border rotate-45 -translate-y-1" />
          </div>
        </div>
      )}
    </div>
  );
}
