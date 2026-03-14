import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { ModuleDefinition, SettingDefinition, StrategyStep } from '../types';

interface StrategyBlockProps {
  step: StrategyStep;
  moduleDefinition: ModuleDefinition;
  onSettingsChange: (stepId: string, settingKey: string, value: unknown) => void;
  onSubtitleChange: (stepId: string, subtitle: string) => void;
  onRemove: (stepId: string) => void;
  isHighlighted: boolean;
}

/**
 * Карточка этапа стратегии в канвасе.
 * Поддерживает сортировку drag&drop, редактирование настроек и пользовательский подзаголовок.
 */
export function StrategyBlock({
  step,
  moduleDefinition,
  onSettingsChange,
  onSubtitleChange,
  onRemove,
  isHighlighted,
}: StrategyBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
    data: {
      source: 'canvas',
      stepId: step.id,
    },
  });

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isSubtitleEditing, setIsSubtitleEditing] = useState(false);
  const [subtitleDraft, setSubtitleDraft] = useState(step.subtitle);

  useEffect(() => {
    setSubtitleDraft(step.subtitle);
  }, [step.subtitle]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSubtitleSubmit = () => {
    onSubtitleChange(step.id, subtitleDraft.trim());
    setIsSubtitleEditing(false);
  };

  return (
    <motion.article
      id={`strategy-step-${step.id}`}
      ref={setNodeRef}
      style={style}
      layout
      className={`rounded-xl border bg-white p-4 shadow-sm ring-1 transition-all dark:bg-slate-800 ${
        isHighlighted
          ? 'border-blue-300 ring-blue-300 shadow-md shadow-blue-200/60 dark:border-blue-500 dark:ring-blue-500 dark:shadow-blue-900/40'
          : 'border-slate-200 ring-slate-200 dark:border-slate-600 dark:ring-slate-700'
      } ${isDragging ? 'opacity-60' : 'opacity-100'}`}
    >
      <header className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="cursor-grab rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-300"
              aria-label="Перетащить блок"
              {...attributes}
              {...listeners}
            >
              ↕ Переместить
            </button>
            <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
              {moduleDefinition.title}
            </h3>
            {moduleDefinition.infoSections?.length ? (
              <button
                type="button"
                onClick={() => setIsInfoOpen((prev) => !prev)}
                className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                aria-label={`Показать пояснения для модуля ${moduleDefinition.title}`}
                title="Пояснения"
              >
                ⓘ
              </button>
            ) : null}
          </div>

          <div className="mt-2">
            {isSubtitleEditing ? (
              <input
                autoFocus
                value={subtitleDraft}
                onChange={(event) => setSubtitleDraft(event.target.value)}
                onBlur={handleSubtitleSubmit}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSubtitleSubmit();
                  }
                  if (event.key === 'Escape') {
                    setSubtitleDraft(step.subtitle);
                    setIsSubtitleEditing(false);
                  }
                }}
                placeholder="Введите подзаголовок"
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none ring-blue-500 focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsSubtitleEditing(true)}
                className="max-w-full rounded-md border border-dashed border-slate-300 px-2 py-1 text-left text-xs text-slate-500 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Нажмите, чтобы задать пользовательский подзаголовок"
              >
                {step.subtitle || 'Нажмите, чтобы добавить подзаголовок'}
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemove(step.id)}
          className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 transition hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40"
        >
          Удалить
        </button>
      </header>

      {isInfoOpen && moduleDefinition.infoSections?.length ? (
        <section className="mb-3 space-y-2 rounded-lg border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-800 dark:bg-blue-950/40">
          {moduleDefinition.infoSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-200">{section.title}</h4>
              <ul className="mt-1 space-y-1">
                {section.items.map((item) => (
                  <li key={item.title} className="text-xs text-slate-700 dark:text-slate-200">
                    <span className="font-medium">{item.title}:</span> {item.description}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

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
      <label className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-sm text-slate-700 dark:bg-slate-700/70 dark:text-slate-200">
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
      <label className="block text-sm text-slate-700 dark:text-slate-200">
        <span className="mb-1 block">{setting.label}</span>
        <select
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
      <fieldset className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
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
    <fieldset className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
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
