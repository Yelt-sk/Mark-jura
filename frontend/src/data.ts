import { ModuleDefinition, RiskLevel } from './types';

export const MODULES: ModuleDefinition[] = [
  {
    id: 'module-collection',
    title: 'Сбор информации',
    description: 'Источники данных и правовые основания сбора.',
    icon: '🧾',
    settings: [
      {
        key: 'sources',
        label: 'Источники данных',
        type: 'checkbox-group',
        options: [
          { label: 'Опросы', value: 'опросы' },
          { label: 'Открытые данные', value: 'открытые данные' },
          { label: 'CRM', value: 'crm' },
        ],
        defaultValue: ['опросы'],
      },
      {
        key: 'consent_collected',
        label: 'Получаем согласие на обработку ПДн',
        type: 'switch',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'module-audience',
    title: 'Анализ аудитории',
    description: 'Сегментация и персонализация коммуникации.',
    icon: '🎯',
    settings: [
      {
        key: 'segmentation_depth',
        label: 'Глубина сегментации',
        type: 'select',
        options: [
          { label: 'Базовая', value: 'basic' },
          { label: 'Продвинутая', value: 'advanced' },
        ],
        defaultValue: 'basic',
      },
      {
        key: 'profiling',
        label: 'Автоматизированное профилирование',
        type: 'switch',
        defaultValue: false,
      },
    ],
  },
  {
    id: 'module-channels',
    title: 'Выбор каналов',
    description: 'Каналы дистрибуции рекламы и офферов.',
    icon: '📣',
    settings: [
      {
        key: 'channels',
        label: 'Каналы коммуникации',
        type: 'checkbox-group',
        options: [
          { label: 'Email', value: 'email' },
          { label: 'SMS', value: 'sms' },
          { label: 'Push', value: 'push' },
          { label: 'Соцсети', value: 'social' },
        ],
        defaultValue: ['social'],
      },
      {
        key: 'ad_marking',
        label: 'Маркируем материалы как рекламу',
        type: 'switch',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'module-content',
    title: 'Контент-план',
    description: 'Формулировки, офферы и промо-акции.',
    icon: '🗂️',
    settings: [
      {
        key: 'tone',
        label: 'Стиль коммуникации',
        type: 'radio',
        options: [
          { label: 'Нейтральный', value: 'neutral' },
          { label: 'Агрессивный', value: 'aggressive' },
          { label: 'Экспертный', value: 'expert' },
        ],
        defaultValue: 'neutral',
      },
      {
        key: 'promo_campaign',
        label: 'Есть акционные обещания / скидки',
        type: 'switch',
        defaultValue: false,
      },
    ],
  },
];

export const RISK_STYLE: Record<RiskLevel, { label: string; badge: string; accent: string }> = {
  safe: {
    label: 'Безопасно',
    badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    accent: 'text-emerald-600',
  },
  medium: {
    label: 'Средний риск',
    badge: 'bg-amber-100 text-amber-700 border border-amber-200',
    accent: 'text-amber-600',
  },
  high: {
    label: 'Высокий риск',
    badge: 'bg-rose-100 text-rose-700 border border-rose-200',
    accent: 'text-rose-600',
  },
};
