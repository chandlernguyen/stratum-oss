import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { Info, Sparkles, Settings2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ExpertModeToggleProps {
  onChange?: (isExpert: boolean) => void;
  className?: string;
}

export function ExpertModeToggle({ onChange, className = '' }: ExpertModeToggleProps) {
  const { t } = useTranslation('settings');
  const [isExpert, setIsExpert] = useState(() => {
    // Load from localStorage
    const saved = localStorage.getItem('expertMode');
    return saved === 'true';
  });

  const handleToggle = (checked: boolean) => {
    setIsExpert(checked);
    localStorage.setItem('expertMode', checked.toString());
    onChange?.(checked);
    
    // Dispatch custom event for other components to listen to
    window.dispatchEvent(new CustomEvent('expertModeChanged', { 
      detail: { isExpert: checked } 
    }));
  };

  return (
    <div className={`flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
      <div className="flex items-center gap-2 flex-1">
        {isExpert ? (
          <Settings2 className="w-4 h-4 text-amber-500" />
        ) : (
          <Sparkles className="w-4 h-4 text-yellow-500" />
        )}
        <span className="text-sm font-medium">
          {isExpert ? t('expertMode.expert') : t('expertMode.guided')}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center"
                aria-label={isExpert ? t('expertMode.expertAriaLabel') : t('expertMode.guidedAriaLabel')}
              >
                <Info className="w-4 h-4 text-gray-400 cursor-help" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-sm">
                {isExpert
                  ? t('expertMode.expertDescription')
                  : t('expertMode.guidedDescription')}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Switch
        checked={isExpert}
        onCheckedChange={handleToggle}
        aria-label={t('expertMode.toggleAriaLabel')}
      />
    </div>
  );
}

// Hook to use expert mode state in other components
export function useExpertMode() {
  const [isExpert, setIsExpert] = useState(() => {
    const saved = localStorage.getItem('expertMode');
    return saved === 'true';
  });

  useEffect(() => {
    const handleChange = (event: CustomEvent<{ isExpert: boolean }>) => {
      setIsExpert(event.detail.isExpert);
    };

    window.addEventListener('expertModeChanged' as any, handleChange);
    return () => {
      window.removeEventListener('expertModeChanged' as any, handleChange);
    };
  }, []);

  return isExpert;
}