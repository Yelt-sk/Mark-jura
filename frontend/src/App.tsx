import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { AnimatePresence, motion } from 'framer-motion';

import { ApiClientError, analyzeStrategy, checkText } from './api';
import { Canvas } from './components/Canvas';
import { LegalPanel } from './components/LegalPanel';
import { Sidebar } from './components/Sidebar';
import { MODULES, STRATEGY_TEMPLATES } from './data';
import {
  AnalyzeStrategyResponse,
  LegalRequirement,
  StrategyState,
  StrategyStep,
  TextCheckResponse,
  TextViolation,
} from './types';

type ThemeMode = 'light' | 'dark';

function createDefaultSettings(moduleId: string): Record<string, unknown> {
  const module = MODULES.find((item) => item.id === moduleId);
  if (!module) {
    return {};
  }

  return module.settings.reduce<Record<string, unknown>>((acc, setting) => {
    acc[setting.key] = setting.defaultValue;
    return acc;
  }, {});
}

/**
 * Формирует стабильный ключ риска для хранения пользовательской отметки «учтено».
 */
function getRequirementKey(requirement: LegalRequirement): string {
  return [
    requirement.stage,
    requirement.title,
    requirement.requirement,
    requirement.risk_type,
    requirement.law_reference.law,
    requirement.law_reference.article,
  ].join('::');
}

/**
 * Нормализует текст для устойчивого сравнения значений (регистры/пробелы).
 */
function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU');
}

/**
 * Ищет шаг стратегии, к которому относится риск из правовой панели.
 */
function findStepForRequirement(requirement: LegalRequirement, steps: StrategyStep[]): StrategyStep | null {
  const requirementStage = normalizeText(requirement.stage);
  if (!requirementStage) {
    return null;
  }

  return (
    steps.find(
      (step) =>
        normalizeText(step.module) === requirementStage || normalizeText(step.moduleId) === requirementStage,
    ) ?? null
  );
}

/**
 * Готовит безопасное имя файла отчёта.
 */
function toSafeFileName(value: string): string {
  const normalized = value.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
  return normalized || 'strategy';
}

/**
 * Формирует и скачивает TXT-отчёт по юридической аналитике.
 */
function downloadTextReport(fileName: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Преобразует типизированную ошибку API в текст сводки для правовой панели.
 */
function mapAnalyzeErrorToSummary(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.kind === 'network') {
      return 'Ошибка соединения с backend. Проверьте запуск FastAPI-сервиса.';
    }

    if (error.kind === 'http') {
      const statusPart = error.status ? `HTTP ${error.status}` : 'HTTP ошибка';
      const detailsPart = error.details ? ` ${error.details}` : '';
      return `Ошибка ответа backend (${statusPart}).${detailsPart}`;
    }

    if (error.kind === 'abort') {
      return 'Запрос анализа был отменен.';
    }
  }

  return 'Не удалось получить юридический анализ. Повторите попытку.';
}

function renderHighlightedText(sourceText: string, violations: TextViolation[]): ReactNode {
  if (!violations.length) {
    return <span>{sourceText}</span>;
  }

  const sorted = [...violations].sort((a, b) => a.start - b.start);
  const nodes: ReactNode[] = [];
  let cursor = 0;

  sorted.forEach((violation, index) => {
    if (violation.start > cursor) {
      nodes.push(
        <span key={`plain-${index}-${cursor}`}>{sourceText.slice(cursor, violation.start)}</span>,
      );
    }

    nodes.push(
      <mark
        key={`mark-${violation.start}-${violation.end}-${index}`}
        className="rounded bg-rose-200 px-1 text-rose-900"
      >
        {sourceText.slice(violation.start, violation.end)}
      </mark>,
    );

    cursor = violation.end;
  });

  if (cursor < sourceText.length) {
    nodes.push(<span key={`tail-${cursor}`}>{sourceText.slice(cursor)}</span>);
  }

  return <>{nodes}</>;
}

export default function App() {
  const [strategy, setStrategy] = useState<StrategyState>({
    name: 'Новая стратегия',
    steps: [],
  });
  const [analysis, setAnalysis] = useState<AnalyzeStrategyResponse>({
    requirements: [],
    summary: 'Добавьте этапы в канвас, чтобы получить правовой анализ.',
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [textModalOpen, setTextModalOpen] = useState(false);
  const [adText, setAdText] = useState('');
  const [textResult, setTextResult] = useState<TextCheckResponse | null>(null);
  const [isCheckingText, setIsCheckingText] = useState(false);

  const [accountedRisks, setAccountedRisks] = useState<Record<string, boolean>>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [highlightedStepId, setHighlightedStepId] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const moduleMap = useMemo(
    () =>
      MODULES.reduce<Record<string, (typeof MODULES)[number]>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {}),
    [],
  );

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('markjura-theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setThemeMode(storedTheme);
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setThemeMode(prefersDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
    window.localStorage.setItem('markjura-theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    const controller = new AbortController();

    const runAnalysis = async () => {
      setIsAnalyzing(true);
      try {
        const data = await analyzeStrategy(strategy.steps, controller.signal);
        setAnalysis(data);
      } catch (error) {
        if (error instanceof ApiClientError && error.kind === 'abort') {
          return;
        }

        setAnalysis({
          requirements: [],
          summary: mapAnalyzeErrorToSummary(error),
        });
      } finally {
        setIsAnalyzing(false);
      }
    };

    void runAnalysis();

    return () => controller.abort();
  }, [strategy.steps]);

  useEffect(() => {
    const existingKeys = new Set(analysis.requirements.map((item) => getRequirementKey(item)));
    setAccountedRisks((prev) => {
      const nextEntries = Object.entries(prev).filter(([riskKey]) => existingKeys.has(riskKey));
      return Object.fromEntries(nextEntries);
    });
  }, [analysis.requirements]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      return;
    }

    const activeData = active.data.current as { source?: string; moduleId?: string } | undefined;
    const overId = String(over.id);

    if (activeData?.source === 'sidebar' && activeData.moduleId) {
      const moduleDefinition = moduleMap[activeData.moduleId];
      if (!moduleDefinition) {
        return;
      }

      const newStep: StrategyStep = {
        id: `step-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        moduleId: moduleDefinition.id,
        module: moduleDefinition.title,
        subtitle: '',
        settings: createDefaultSettings(moduleDefinition.id),
      };

      setStrategy((prev) => {
        if (prev.steps.length === 0 || overId === 'canvas-drop-zone') {
          return {
            ...prev,
            steps: [...prev.steps, newStep],
          };
        }

        const overIndex = prev.steps.findIndex((item) => item.id === overId);
        if (overIndex < 0) {
          return {
            ...prev,
            steps: [...prev.steps, newStep],
          };
        }

        const clone = [...prev.steps];
        clone.splice(overIndex, 0, newStep);
        return {
          ...prev,
          steps: clone,
        };
      });
      return;
    }

    const activeId = String(active.id);
    if (activeId === overId) {
      return;
    }

    setStrategy((prev) => {
      const oldIndex = prev.steps.findIndex((item) => item.id === activeId);
      const newIndex = prev.steps.findIndex((item) => item.id === overId);
      if (oldIndex < 0 || newIndex < 0) {
        return prev;
      }

      return {
        ...prev,
        steps: arrayMove(prev.steps, oldIndex, newIndex),
      };
    });
  };

  const handleSettingsChange = (stepId: string, settingKey: string, value: unknown) => {
    setStrategy((prev) => ({
      ...prev,
      steps: prev.steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              settings: {
                ...step.settings,
                [settingKey]: value,
              },
            }
          : step,
      ),
    }));
  };

  const handleSubtitleChange = (stepId: string, subtitle: string) => {
    setStrategy((prev) => ({
      ...prev,
      steps: prev.steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              subtitle,
            }
          : step,
      ),
    }));
  };

  const handleRemoveStep = (stepId: string) => {
    setStrategy((prev) => ({
      ...prev,
      steps: prev.steps.filter((step) => step.id !== stepId),
    }));
  };

  const handleToggleRiskAccounted = (requirement: LegalRequirement, isChecked: boolean) => {
    const riskKey = getRequirementKey(requirement);
    setAccountedRisks((prev) => ({
      ...prev,
      [riskKey]: isChecked,
    }));
  };

  const isRiskAccounted = (requirement: LegalRequirement): boolean => {
    const riskKey = getRequirementKey(requirement);
    return Boolean(accountedRisks[riskKey]);
  };

  const handleStrategyNameChange = (nextName: string) => {
    setStrategy((prev) => ({
      ...prev,
      name: nextName,
    }));
  };

  const handleApplyTemplate = () => {
    const template = STRATEGY_TEMPLATES.find((item) => item.id === selectedTemplateId);
    if (!template) {
      return;
    }

    const templateSteps: StrategyStep[] = template.steps
      .map((templateStep) => {
        const moduleDefinition = moduleMap[templateStep.moduleId];
        if (!moduleDefinition) {
          return null;
        }

        return {
          id: `step-${Date.now()}-${Math.random().toString(16).slice(2, 8)}-${templateStep.moduleId}`,
          moduleId: moduleDefinition.id,
          module: moduleDefinition.title,
          subtitle: templateStep.subtitle,
          settings: {
            ...createDefaultSettings(moduleDefinition.id),
            ...(templateStep.settings ?? {}),
          },
        } satisfies StrategyStep;
      })
      .filter((item): item is StrategyStep => item !== null);

    setStrategy({
      name: template.name,
      steps: templateSteps,
    });
    setHighlightedStepId(null);
  };

  const handleSaveReport = () => {
    const reportDate = new Date().toLocaleString('ru-RU');
    const fileSafeStrategyName = toSafeFileName(strategy.name);
    const reportLines: string[] = [
      'Mark&Jura — Юридический отчет по стратегии',
      `Стратегия: ${strategy.name.trim() || 'Без названия'}`,
      `Дата экспорта: ${reportDate}`,
      '',
      `Сводка: ${analysis.summary}`,
      '',
      `Количество требований: ${analysis.requirements.length}`,
      '',
    ];

    analysis.requirements.forEach((item, index) => {
      const accountedText = isRiskAccounted(item) ? 'Да' : 'Нет';
      reportLines.push(`${index + 1}. ${item.title}`);
      reportLines.push(`   Этап: ${item.stage}`);
      reportLines.push(`   Тип риска: ${item.risk_type}`);
      reportLines.push(`   Уровень: ${item.severity}`);
      reportLines.push(`   Требование: ${item.requirement}`);
      reportLines.push(`   Рекомендация: ${item.recommendation}`);
      reportLines.push(
        `   Норма: ${item.law_reference.law}, ${item.law_reference.article} — ${item.law_reference.description}`,
      );
      reportLines.push(`   Риск учтен: ${accountedText}`);
      reportLines.push('');
    });

    downloadTextReport(`legal-report-${fileSafeStrategyName}.txt`, reportLines.join('\n'));
  };

  const handleTextCheck = async () => {
    if (!adText.trim()) {
      setTextResult({
        violations: [],
        has_violations: false,
        detected_words: [],
        has_anglicisms: false,
        detected_anglicisms: [],
      });
      return;
    }

    setIsCheckingText(true);
    try {
      const result = await checkText(adText);
      setTextResult(result);
    } catch {
      setTextResult({
        violations: [],
        has_violations: false,
        detected_words: [],
        has_anglicisms: false,
        detected_anglicisms: [],
      });
    } finally {
      setIsCheckingText(false);
    }
  };

  const handleRiskClick = (requirement: LegalRequirement) => {
    const relatedStep = findStepForRequirement(requirement, strategy.steps);
    if (!relatedStep) {
      return;
    }

    setHighlightedStepId(relatedStep.id);

    window.setTimeout(() => {
      const element = document.getElementById(`strategy-step-${relatedStep.id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);

    window.setTimeout(() => {
      setHighlightedStepId((prev) => (prev === relatedStep.id ? null : prev));
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900 transition-colors dark:bg-slate-900 dark:text-slate-100 md:p-6">
      <div className="mx-auto mb-4 flex max-w-[1600px] items-start justify-between gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-200 transition-colors dark:bg-slate-800 dark:ring-slate-700 md:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Mark&Jura</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Конструктор маркетинговой стратегии с автоматическим правовым контролем по нормам рекламного,
            потребительского и персонально-данного законодательства РФ.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          aria-label="Переключить тему интерфейса"
        >
          {themeMode === 'light' ? '🌙 Dark mode' : '☀️ Light mode'}
        </button>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <Sidebar
              modules={MODULES}
              strategyName={strategy.name}
              onStrategyNameChange={handleStrategyNameChange}
              templates={STRATEGY_TEMPLATES}
              selectedTemplateId={selectedTemplateId}
              onTemplateSelect={setSelectedTemplateId}
              onApplyTemplate={handleApplyTemplate}
            />
          </div>

          <div className="lg:col-span-5">
            <Canvas
              steps={strategy.steps}
              moduleMap={moduleMap}
              onSettingsChange={handleSettingsChange}
              onSubtitleChange={handleSubtitleChange}
              onRemoveStep={handleRemoveStep}
              highlightedStepId={highlightedStepId}
            />
          </div>

          <div className="lg:col-span-4">
            <LegalPanel
              requirements={analysis.requirements}
              summary={analysis.summary}
              isLoading={isAnalyzing}
              onOpenTextChecker={() => setTextModalOpen(true)}
              onSaveReport={handleSaveReport}
              onToggleRiskAccounted={handleToggleRiskAccounted}
              isRiskAccounted={isRiskAccounted}
              onRiskClick={handleRiskClick}
            />
          </div>
        </main>
      </DndContext>

      <AnimatePresence>
        {textModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 12, opacity: 0 }}
              className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-800"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Проверка рекламного текста</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Найдем рискованные формулировки и предложим юридически безопасные альтернативы.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTextModalOpen(false)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-200"
                >
                  Закрыть
                </button>
              </div>

              <textarea
                value={adText}
                onChange={(event) => setAdText(event.target.value)}
                placeholder="Введите рекламный текст, например: Гарантируем результат, скидка 70% только сегодня..."
                className="h-32 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleTextCheck()}
                  disabled={isCheckingText}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCheckingText ? 'Проверяем...' : 'Проверить'}
                </button>
              </div>

              {textResult && (
                <section className="mt-4 space-y-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-700/60 dark:ring-slate-600">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Результат анализа</h3>

                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                    {renderHighlightedText(adText, textResult.violations)}
                  </div>

                  {textResult.detected_words.length > 0 ? (
                    <p className="rounded-lg bg-amber-100 p-2 text-sm text-amber-800">
                      ⚠️ Обнаружены стоп-слова/бранные слова: {textResult.detected_words.join(', ')}.
                    </p>
                  ) : null}

                  {textResult.has_anglicisms ? (
                    <p className="rounded-lg bg-orange-100 p-2 text-sm text-orange-800">
                      ⚠️ Обнаружены англицизмы: {textResult.detected_anglicisms.join(', ')}. Проверьте соблюдение
                      требований законодательства о защите русского языка (ФЗ №53 «О государственном языке
                      Российской Федерации»).
                    </p>
                  ) : null}

                  {!textResult.has_violations ? (
                    <p className="rounded-lg bg-emerald-100 p-2 text-sm text-emerald-700">
                      ✅ Нарушения по заданным паттернам не обнаружены.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {textResult.violations.map((item, index) => (
                        <article
                          key={`${item.start}-${item.end}-${index}`}
                          className="rounded-lg bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600"
                        >
                          <p className="text-sm font-medium text-rose-700">⚠️ «{item.phrase}»</p>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{item.explanation}</p>
                          <p className="mt-1 text-xs font-medium text-emerald-700">
                            Альтернатива: {item.suggestion}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            {item.law_reference.law}, {item.law_reference.article}: {item.law_reference.description}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
