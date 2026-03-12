import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { AnimatePresence, motion } from 'framer-motion';

import { Canvas } from './components/Canvas';
import { LegalPanel } from './components/LegalPanel';
import { Sidebar } from './components/Sidebar';
import { MODULES } from './data';
import { AnalyzeStrategyResponse, StrategyStep, TextCheckResponse, TextViolation } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

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
  const [steps, setSteps] = useState<StrategyStep[]>([]);
  const [analysis, setAnalysis] = useState<AnalyzeStrategyResponse>({
    requirements: [],
    summary: 'Добавьте этапы в канвас, чтобы получить правовой анализ.',
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [textModalOpen, setTextModalOpen] = useState(false);
  const [adText, setAdText] = useState('');
  const [textResult, setTextResult] = useState<TextCheckResponse | null>(null);
  const [isCheckingText, setIsCheckingText] = useState(false);

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
    const controller = new AbortController();

    const runAnalysis = async () => {
      setIsAnalyzing(true);
      try {
        const payload = {
          steps_config: steps.map((step) => ({
            id: step.id,
            module: step.module,
            settings: step.settings,
          })),
        };

        const response = await fetch(`${API_BASE_URL}/api/analyze-strategy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Не удалось получить юридический анализ.');
        }

        const data = (await response.json()) as AnalyzeStrategyResponse;
        setAnalysis(data);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setAnalysis({
            requirements: [],
            summary: 'Ошибка соединения с backend. Проверьте запуск FastAPI-сервиса.',
          });
        }
      } finally {
        setIsAnalyzing(false);
      }
    };

    void runAnalysis();

    return () => controller.abort();
  }, [steps]);

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
        settings: createDefaultSettings(moduleDefinition.id),
      };

      setSteps((prev) => {
        if (prev.length === 0 || overId === 'canvas-drop-zone') {
          return [...prev, newStep];
        }

        const overIndex = prev.findIndex((item) => item.id === overId);
        if (overIndex < 0) {
          return [...prev, newStep];
        }

        const clone = [...prev];
        clone.splice(overIndex, 0, newStep);
        return clone;
      });
      return;
    }

    const activeId = String(active.id);
    if (activeId === overId) {
      return;
    }

    setSteps((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === activeId);
      const newIndex = prev.findIndex((item) => item.id === overId);
      if (oldIndex < 0 || newIndex < 0) {
        return prev;
      }

      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleSettingsChange = (stepId: string, settingKey: string, value: unknown) => {
    setSteps((prev) =>
      prev.map((step) =>
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
    );
  };

  const handleRemoveStep = (stepId: string) => {
    setSteps((prev) => prev.filter((step) => step.id !== stepId));
  };

  const handleTextCheck = async () => {
    if (!adText.trim()) {
      setTextResult({ violations: [], has_violations: false });
      return;
    }

    setIsCheckingText(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/check-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: adText }),
      });

      if (!response.ok) {
        throw new Error('Не удалось проверить рекламный текст.');
      }

      const result = (await response.json()) as TextCheckResponse;
      setTextResult(result);
    } catch {
      setTextResult({ violations: [], has_violations: false });
    } finally {
      setIsCheckingText(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-6">
      <div className="mx-auto mb-4 max-w-[1600px] rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-200 md:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Маркетинговый Юрист</h1>
        <p className="mt-1 text-sm text-slate-500">
          Конструктор маркетинговой стратегии с автоматическим правовым контролем по ФЗ «О рекламе» и ФЗ «О персональных данных».
        </p>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <Sidebar modules={MODULES} />
          </div>

          <div className="lg:col-span-5">
            <Canvas
              steps={steps}
              moduleMap={moduleMap}
              onSettingsChange={handleSettingsChange}
              onRemoveStep={handleRemoveStep}
            />
          </div>

          <div className="lg:col-span-4">
            <LegalPanel
              requirements={analysis.requirements}
              summary={analysis.summary}
              isLoading={isAnalyzing}
              onOpenTextChecker={() => setTextModalOpen(true)}
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
              className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Проверка рекламного текста</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Найдем рискованные формулировки и предложим юридически безопасные альтернативы.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTextModalOpen(false)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-600"
                >
                  Закрыть
                </button>
              </div>

              <textarea
                value={adText}
                onChange={(event) => setAdText(event.target.value)}
                placeholder="Введите рекламный текст, например: Гарантируем результат, скидка 70% только сегодня..."
                className="h-32 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring"
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
                <section className="mt-4 space-y-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800">Результат анализа</h3>

                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    {renderHighlightedText(adText, textResult.violations)}
                  </div>

                  {!textResult.has_violations ? (
                    <p className="rounded-lg bg-emerald-100 p-2 text-sm text-emerald-700">
                      ✅ Нарушения по заданным паттернам не обнаружены.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {textResult.violations.map((item, index) => (
                        <article
                          key={`${item.start}-${item.end}-${index}`}
                          className="rounded-lg bg-white p-3 ring-1 ring-slate-200"
                        >
                          <p className="text-sm font-medium text-rose-700">⚠️ «{item.phrase}»</p>
                          <p className="mt-1 text-xs text-slate-600">{item.explanation}</p>
                          <p className="mt-1 text-xs font-medium text-emerald-700">
                            Альтернатива: {item.suggestion}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
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
