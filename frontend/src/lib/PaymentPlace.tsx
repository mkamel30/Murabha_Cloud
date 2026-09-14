import { useEffect, useState } from 'react';
import { settingsApi } from '@/api/client';

interface PaymentPlaceSelectProps {
  value: string;
  onChange: (value: string) => void;
  places?: string[];
}

const DEFAULT_PLACES = ['Damen', 'البريد', 'البنك'];

const PLACE_ICONS: Record<string, string> = {
  Damen: '👤',
  dhamen: '👤',
  damen: '👤',
  'ضامن': '👤',
  post: '📬',
  'البريد': '📬',
  bank: '🏦',
  'البنك': '🏦',
};

export function PaymentPlaceSelect({ value, onChange, places: propPlaces }: PaymentPlaceSelectProps) {
  const [options, setOptions] = useState<string[]>(propPlaces || DEFAULT_PLACES);

  useEffect(() => {
    if (propPlaces && propPlaces.length > 0) {
      setOptions(propPlaces);
    } else {
      settingsApi.getAll()
        .then((settings) => {
          if (Array.isArray(settings?.paymentPlaces) && settings.paymentPlaces.length > 0) {
            setOptions(settings.paymentPlaces);
          }
        })
        .catch(() => {});
    }
  }, [propPlaces]);

  // Normalize legacy values
  const normalizedValue = value === 'dhamen' || value === 'damen' ? 'Damen' : value;

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = normalizedValue === option || (option === 'Damen' && (value === 'dhamen' || value === 'damen'));
        const icon = PLACE_ICONS[option] || '💳';
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`
              flex-1 min-w-[85px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all
              ${isSelected 
                ? 'bg-[#0A2472] text-white border-[#0A2472] shadow-sm' 
                : 'bg-white text-gray-700 border-gray-200 hover:border-[#0A2472] hover:text-[#0A2472]'
              }
            `}
          >
            <span>{icon}</span>
            <span>{option}</span>
          </button>
        );
      })}
    </div>
  );
}