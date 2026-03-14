import { useDraggable } from '@dnd-kit/core';
import { motion } from 'framer-motion';

import { ModuleDefinition, StrategyTemplate } from '../types';

interface SidebarProps {
  modules: ModuleDefinition[];
  strategyName: string;
  onStrategyNameChange: (nextName: string) => void;
  templates: StrategyTemplate[];
  selectedTemplateId: string;
  onTemplateSelect: (templateId: string) => void;
  onApplyTemplate: () => void;
}

interface DraggableModuleCardProps {
  module: ModuleDefinition;
}

/**
 * Левая колонка с модулями маркетинговой стратегии.
 * Пользователь может задать имя стратегии, применить шаблон и перетаскивать блоки в канвас.
 */
export function Sidebar({
  modules,
  strategyName,
  onStrategyNameChange,
  templates,
  selectedTemplateId,
  onTemplateSelect,
  onApplyTemplate,
}: SidebarProps) {
  return (
    <aside className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-colors dark:bg-slate-800 dark:ring-slate-700">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Strategy Modules</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Перетащите блоки в центральный канвас.</p>
      </div>

      <div className="mb-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-700/60 dark:ring-slate-600">
        <label htmlFor="strategy-name" className="block text-xs font-medium text-slate-600 dark:text-slate-300">
          Название стратегии
        </label>
        <input
          id="strategy-name"
          type="text"
          value={strategyName}
          onChange={(event) => onStrategyNameChange(event.target.value)}
          placeholder="Например: Весенняя digital-кампания 2026"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-blue-500 focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div className="mb-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-700/60 dark:ring-slate-600">
        <label htmlFor="strategy-template" className="block text-xs font-medium text-slate-600 dark:text-slate-300">
          Шаблон стратегии
        </label>
        <select
          id="strategy-template"
          value={selectedTemplateId}
          onChange={(event) => onTemplateSelect(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-blue-500 focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        >
          <option value="">Выберите готовый шаблон</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onApplyTemplate}
          disabled={!selectedTemplateId}
          className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Применить шаблон
        </button>

        {selectedTemplateId ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {templates.find((item) => item.id === selectedTemplateId)?.description}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {modules.map((module) => (
          <DraggableModuleCard key={module.id} module={module} />
        ))}
      </div>
    </aside>
  );
}

function DraggableModuleCard({ module }: DraggableModuleCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `sidebar-${module.id}`,
    data: {
      source: 'sidebar',
      moduleId: module.id,
    },
  });

  return (
    <motion.article
      ref={setNodeRef}
      layout
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`cursor-grab rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm transition dark:border-slate-600 dark:bg-slate-700/70 ${
        isDragging ? 'opacity-60' : 'opacity-100'
      }`}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl" aria-hidden>
          {module.icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-100">{module.title}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{module.description}</p>
        </div>
      </div>
    </motion.article>
  );
}
