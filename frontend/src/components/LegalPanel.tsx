import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import { RISK_STYLE } from '../data';
import { LegalRequirement, RiskType, SeverityLevel } from '../types';

interface LegalPanelProps {
  requirements: LegalRequirement[];
  summary: string;
  isLoading: boolean;
  onOpenTextChecker: () => void;
  onSaveReport: () => void;
  onToggleRiskAccounted: (requirement: LegalRequirement, isChecked: boolean) => void;
  isRiskAccounted: (requirement: LegalRequirement) => boolean;
  onRiskClick: (requirement: LegalRequirement) => void;
}

const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

const RISK_TYPE_LABELS: Record<RiskType, string> = {
  advertising: 'Рекламные требования',
  personal_data: 'Персональные данные',
  consumer_rights: 'Права потребителей',
  children_and_vulnerable: 'Дети и уязвимые лица',
  ethics: 'Этика коммуникации',
  financial_disclosure: 'Финансовые раскрытия',
  digital_rights: 'Цифровые права',
};

/**
 * Правая колонка с юридической аналитикой по этапам стратегии.
 * Риски сортируются по критичности: HIGH -> MEDIUM -> LOW.
 */
export function LegalPanel({
  requirements,
  summary,
  isLoading,
  onOpenTextChecker,
  onSaveReport,
  onToggleRiskAccounted,
  isRiskAccounted,
  onRiskClick,
}: LegalPanelProps) {
  const [selectedRiskType, setSelectedRiskType] = useState<RiskType | 'all'>('all');

  const riskTypeOptions = useMemo(() => {
    const uniqueTypes = Array.from(new Set(requirements.map((item) => item.risk_type)));
    return uniqueTypes;
  }, [requirements]);

  const sortedRequirements = useMemo(
    () =>
      [...requirements].sort(
        (left, right) => SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity],
      ),
    [requirements],
  );

  const visibleRequirements = useMemo(() => {
    if (selectedRiskType === 'all') {
      return sortedRequirements;
    }

    return sortedRequirements.filter((item) => item.risk_type === selectedRiskType);
  }, [selectedRiskType, sortedRequirements]);

  return (
    <aside className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-colors dark:bg-slate-800 dark:ring-slate-700">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Legal Analytics</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Автообновление при каждом изменении стратегии.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSaveReport}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onOpenTextChecker}
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            Проверить текст
          </button>
        </div>
      </div>

      <div className="mb-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600">
        {summary}
      </div>

      <div className="mb-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-700/60 dark:ring-slate-600">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Фильтр по типу риска</label>
        <select
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          value={selectedRiskType}
          onChange={(event) => setSelectedRiskType(event.target.value as RiskType | 'all')}
        >
          <option value="all">Все типы рисков</option>
          {riskTypeOptions.map((riskType) => (
            <option key={riskType} value={riskType}>
              {RISK_TYPE_LABELS[riskType]}
            </option>
          ))}
        </select>
      </div>

      <div className="max-h-[520px] space-y-3 overflow-auto pr-1">
        {isLoading ? (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-700/60 dark:text-slate-300">
            Выполняется анализ стратегии...
          </p>
        ) : visibleRequirements.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-700/60 dark:text-slate-300">
            Добавьте этапы в канвас — требования и риски появятся здесь.
          </p>
        ) : (
          visibleRequirements.map((item) => {
            const style = RISK_STYLE[item.risk_level];
            const icon = item.risk_level === 'high' ? '⚠️' : item.risk_level === 'medium' ? '🟠' : '✅';
            const checked = isRiskAccounted(item);

            return (
              <motion.article
                key={`${item.stage}-${item.title}-${item.requirement}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-white p-3 ring-1 ring-slate-200 transition hover:ring-blue-300 dark:bg-slate-800 dark:ring-slate-600 dark:hover:ring-blue-500"
              >
                <button
                  type="button"
                  onClick={() => onRiskClick(item)}
                  className="w-full text-left"
                  title="Показать связанный модуль стратегии на канвасе"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {icon} {item.title}
                    </h4>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${style.badge}`}>
                      {item.severity}
                    </span>
                  </div>

                  <p className="mb-1 text-[11px] text-slate-500 dark:text-slate-400">Этап: {item.stage}</p>
                  <p className="mb-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Тип риска: {RISK_TYPE_LABELS[item.risk_type]}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{item.requirement}</p>
                  <p className={`mt-2 text-xs font-medium ${style.accent}`}>Рекомендация: {item.recommendation}</p>
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    {item.law_reference.law}, {item.law_reference.article}: {item.law_reference.description}
                  </p>
                </button>

                <label className="mt-3 flex items-center gap-2 rounded-md bg-slate-50 p-2 text-xs text-slate-700 ring-1 ring-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => onToggleRiskAccounted(item, event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <span>{checked ? 'Риск учтён в работе' : 'Отметить риск как учтённый'}</span>
                </label>
              </motion.article>
            );
          })
        )}
      </div>
    </aside>
  );
}
