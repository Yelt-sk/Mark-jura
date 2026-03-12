import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';

import { ModuleDefinition, SettingDefinition, StrategyStep } from '../types';

interface StrategyBlockProps {
  step: StrategyStep;
  moduleDefinition: ModuleDefinition;
  onSettingsChange: (stepId: string, settingKey: string, value: unknown) => void;
  onRemove: (stepId: string) => void;
}

/**
 * Карточка этапа стратегии в канвасе.
 * Поддерживает сортировку drag&drop и редактирование настроек блока.
 */
export function StrategyBlock({
  step,
  moduleDefinition,
  onSettingsChange,
  onRemove,
}: StrategyBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
    data: {
      source: 'canvas',
      stepId: step.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.article
      ref={setNodeRef}
      style={style}
      layout
      className={`rounded-xl border bg-white p-4 shadow-sm ring-1 ring-slate-200 ${
        isDragging ? 'opacity-60' : 'opacity-100'
      }`}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500"
            aria-label="Перетащить блок"
            {...attributes}
            {...listeners}
          >
            ↕ Переместить
          </button>
          <h3 className="text-sm font-semibold text-slate-800">{moduleDefinition.title}</h3>
        </div>

        <button
          type="button"
          onClick={() => onRemove(step.id)}
          className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 transition hover:bg-rose-50"
        >
          Удалить
        </button>
      </header>

      <div className="space-y-3">
        {moduleDefinition.settings.map((setting) => (
          <SettingControl
            key={setting.key}
            inputNamePrefix={step.id}
            setting={setting}
            value={step.settings[setting.key]}
            onChange={(value) => onSettingsChange(step.id, setting.key, value)}
          />
        ))}
      </div>
    </motion.article>
  );
}

interface SettingControlProps {
  inputNamePrefix: string;
  setting: SettingDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}

function SettingControl({ inputNamePrefix, setting, value, onChange }: SettingControlProps) {
  if (setting.type === 'switch') {
    return (
      <label className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-sm text-slate-700">
        <span>{setting.label}</span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-blue-600"
        />
      </label>
    );
  }

  if (setting.type === 'select') {
    return (
      <label className="block text-sm text-slate-700">
        <span className="mb-1 block">{setting.label}</span>
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        >
          {setting.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (setting.type === 'radio') {
    return (
      <fieldset className="space-y-1 text-sm text-slate-700">
        <legend className="mb-1">{setting.label}</legend>
        {setting.options?.map((option) => (
          <label key={option.value} className="flex items-center gap-2">
            <input
              type="radio"
              name={`${inputNamePrefix}-${setting.key}`}
              value={option.value}
              checked={value === option.value}
              onChange={(event) => onChange(event.target.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
    );
  }

  const selectedValues = Array.isArray(value) ? value.map((item) => String(item)) : [];

  return (
    <fieldset className="space-y-1 text-sm text-slate-700">
      <legend className="mb-1">{setting.label}</legend>
      {setting.options?.map((option) => {
        const checked = selectedValues.includes(option.value);
        return (
          <label key={option.value} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => {
                if (event.target.checked) {
                  onChange(Array.from(new Set([...selectedValues, option.value])));
                  return;
                }

                onChange(selectedValues.filter((item) => item !== option.value));
              }}
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
