import { useDraggable } from '@dnd-kit/core';
import { motion } from 'framer-motion';

import { ModuleDefinition } from '../types';

interface SidebarProps {
  modules: ModuleDefinition[];
}

interface DraggableModuleCardProps {
  module: ModuleDefinition;
}

/**
 * Левая колонка с модулями маркетинговой стратегии.
 * Пользователь перетаскивает их в канвас для сборки процесса.
 */
export function Sidebar({ modules }: SidebarProps) {
  return (
    <aside className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">Модули стратегии</h2>
        <p className="mt-1 text-sm text-slate-500">Перетащите блоки в центральный канвас.</p>
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
      className={`cursor-grab rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm transition ${
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
          <h3 className="text-sm font-semibold text-slate-700">{module.title}</h3>
          <p className="mt-1 text-xs text-slate-500">{module.description}</p>
        </div>
      </div>
    </motion.article>
  );
}
