import { motion } from 'framer-motion';

import { RISK_STYLE } from '../data';
import { LegalRequirement } from '../types';

interface LegalPanelProps {
  requirements: LegalRequirement[];
  summary: string;
  isLoading: boolean;
  onOpenTextChecker: () => void;
}

/**
 * Правая колонка с юридической аналитикой по этапам стратегии.
 */
export function LegalPanel({ requirements, summary, isLoading, onOpenTextChecker }: LegalPanelProps) {
  const grouped = requirements.reduce<Record<string, LegalRequirement[]>>((acc, item) => {
    if (!acc[item.stage]) {
      acc[item.stage] = [];
    }

    acc[item.stage].push(item);
    return acc;
  }, {});

  return (
    <aside className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Юридическая аналитика</h2>
          <p className="mt-1 text-sm text-slate-500">Автообновление при каждом изменении стратегии.</p>
        </div>
        <button
          type="button"
          onClick={onOpenTextChecker}
          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          Проверить текст
        </button>
      </div>

      <div className="mb-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">{summary}</div>

      <div className="max-h-[560px] space-y-3 overflow-auto pr-1">
        {isLoading ? (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Выполняется анализ стратегии...</p>
        ) : requirements.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
            Добавьте этапы в канвас — требования и риски появятся здесь.
          </p>
        ) : (
          Object.entries(grouped).map(([stage, items]) => (
            <section key={stage} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">{stage}</h3>
              <div className="space-y-2">
                {items.map((item) => {
                  const style = RISK_STYLE[item.risk_level];
                  const icon = item.risk_level === 'high' ? '⚠️' : item.risk_level === 'medium' ? '🟠' : '✅';

                  return (
                    <motion.article
                      key={`${item.stage}-${item.title}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-lg bg-white p-3 ring-1 ring-slate-200"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-800">
                          {icon} {item.title}
                        </h4>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${style.badge}`}>
                          {style.label}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600">{item.requirement}</p>
                      <p className={`mt-2 text-xs font-medium ${style.accent}`}>Рекомендация: {item.recommendation}</p>
                      <p className="mt-2 text-[11px] text-slate-500">
                        {item.law_reference.law}, {item.law_reference.article}: {item.law_reference.description}
                      </p>
                    </motion.article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </aside>
  );
}
