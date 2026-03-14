import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';

import { ModuleDefinition, StrategyStep } from '../types';
import { StrategyBlock } from './StrategyBlock';

interface CanvasProps {
  steps: StrategyStep[];
  moduleMap: Record<string, ModuleDefinition>;
  onSettingsChange: (stepId: string, settingKey: string, value: unknown) => void;
  onSubtitleChange: (stepId: string, subtitle: string) => void;
  onRemoveStep: (stepId: string) => void;
  highlightedStepId: string | null;
}

/**
 * Центральный канвас со стратегией.
 * Содержит список блоков, которые можно сортировать drag&drop.
 */
export function Canvas({
  steps,
  moduleMap,
  onSettingsChange,
  onSubtitleChange,
  onRemoveStep,
  highlightedStepId,
}: CanvasProps) {
  const { isOver, setNodeRef } = useDroppable({ id: 'canvas-drop-zone' });

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-colors dark:bg-slate-800 dark:ring-slate-700">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Конструктор стратегии</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Перетаскивайте модули слева и меняйте порядок для построения воронки.
        </p>
      </header>

      <div
        ref={setNodeRef}
        className={`min-h-[440px] rounded-xl border border-dashed p-3 transition ${
          isOver
            ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
            : 'border-slate-300 bg-slate-50/60 dark:border-slate-600 dark:bg-slate-700/40'
        }`}
      >
        {steps.length === 0 ? (
          <motion.div
            initial={{ opacity: 0.5, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex h-[400px] items-center justify-center rounded-lg border border-slate-200 bg-white/80 text-center dark:border-slate-600 dark:bg-slate-800/80"
          >
            <p className="max-w-xs text-sm text-slate-500 dark:text-slate-300">
              Добавьте модули в канвас, чтобы запустить автоматический юридический анализ.
            </p>
          </motion.div>
        ) : (
          <SortableContext items={steps.map((step) => step.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {steps.map((step) => {
                const moduleDefinition = moduleMap[step.moduleId];
                if (!moduleDefinition) {
                  return null;
                }

                return (
                  <StrategyBlock
                    key={step.id}
                    step={step}
                    moduleDefinition={moduleDefinition}
                    onSettingsChange={onSettingsChange}
                    onSubtitleChange={onSubtitleChange}
                    onRemove={onRemoveStep}
                    isHighlighted={highlightedStepId === step.id}
                  />
                );
              })}
            </div>
          </SortableContext>
        )}
      </div>
    </section>
  );
}
