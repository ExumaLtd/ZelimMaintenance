// components/date-picker.tsx
import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-day-picker/dist/style.css';

interface DatePickerProps {
  value: string | null;
  onChange: (date: string) => void;
  max?: string;
  disabled?: boolean;
}

export default function DatePicker({ value, onChange, max, disabled = false }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedDate = value ? new Date(value) : undefined;
  const maxDate = max ? new Date(max) : new Date();

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
      setIsOpen(false);
    }
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="date-picker-wrapper" ref={dropdownRef}>
      <div className="field-icon-wrapper">
        <input
          type="text"
          className="checklist-input"
          value={selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          readOnly
          disabled={disabled}
          placeholder="Select date"
          style={{ cursor: disabled ? 'not-allowed' : 'pointer', paddingRight: '40px' }}
        />
        <div className="field-icon-inside">
          <Calendar size={20} strokeWidth={1.5} />
        </div>
      </div>

      {isOpen && (
        <div className="date-picker-dropdown">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            disabled={{ after: maxDate }}
            defaultMonth={selectedDate || maxDate}
            endMonth={maxDate}
            showOutsideDays
            locale={enGB}
            weekStartsOn={1}
            formatters={{
              formatWeekdayName: (date: Date) => format(date, 'EEEEE', { locale: enGB })
            }}
            components={{
              Chevron: ({ orientation, ...props }: { orientation?: string; [key: string]: any }) =>
                orientation === 'left' ? (
                  <ChevronLeft size={20} strokeWidth={1.5} />
                ) : (
                  <ChevronRight size={20} strokeWidth={1.5} />
                ),
            }}
          />
        </div>
      )}
    </div>
  );
}