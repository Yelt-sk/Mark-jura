import { ModuleDefinition, RiskLevel, StrategyTemplate } from './types';

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
    infoSections: [
      {
        title: 'Пояснения к источникам',
        items: [
          {
            title: 'Опросы',
            description:
              'Требуют прозрачного информирования респондента о целях обработки данных и сроках хранения.',
          },
          {
            title: 'CRM',
            description:
              'Данные из CRM обычно персональные, поэтому важны согласие, ограничение целей и контроль доступа.',
          },
        ],
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
    infoSections: [
      {
        title: 'Пояснения к аналитике',
        items: [
          {
            title: 'Базовая сегментация',
            description:
              'Группирует аудиторию по общим признакам и обычно создает меньше правовых рисков при корректном обезличивании.',
          },
          {
            title: 'Продвинутая сегментация',
            description:
              'Может включать чувствительные профили и требует повышенного контроля оснований обработки персональных данных.',
          },
        ],
      },
    ],
  },
  {
    id: 'module-client',
    title: 'Клиент',
    description: 'Категории клиентов для уточнения правовых ограничений коммуникации.',
    icon: '👥',
    settings: [
      {
        key: 'client_categories',
        label: 'Категории клиентов',
        type: 'checkbox-group',
        options: [
          { label: 'Юридические лица', value: 'legal_entities' },
          { label: 'Дети', value: 'children' },
          { label: 'Уязвимые лица', value: 'vulnerable_people' },
        ],
        defaultValue: ['legal_entities'],
      },
    ],
    infoSections: [
      {
        title: 'Категории клиентского сегмента',
        items: [
          {
            title: 'Юридические лица',
            description:
              'Для B2B важна достоверность коммерческих условий и отсутствие вводящих в заблуждение обещаний.',
          },
          {
            title: 'Дети',
            description:
              'Коммуникации для несовершеннолетних требуют повышенной этической и правовой осторожности.',
          },
          {
            title: 'Уязвимые лица',
            description:
              'Нельзя использовать страх, давление или эксплуатацию сложного жизненного положения аудитории.',
          },
        ],
      },
    ],
  },
  {
    id: 'module-product-type',
    title: 'Тип продукта',
    description: 'Категория продвигаемого продукта для точной правовой оценки.',
    icon: '🧩',
    settings: [
      {
        key: 'product_type',
        label: 'Категория продукта',
        type: 'select',
        options: [
          { label: '18+ товары', value: 'adult' },
          { label: 'Алкоголь / подакцизные товары', value: 'alcohol' },
          { label: 'Азартные игры / ставки', value: 'gambling' },
          { label: 'Медицинские товары', value: 'medical' },
          { label: 'Финансовые услуги', value: 'financial' },
          { label: 'БАДы', value: 'supplements' },
          { label: 'Крипто-сервисы', value: 'crypto' },
          { label: 'Цифровые продукты', value: 'digital' },
        ],
        defaultValue: 'digital',
      },
    ],
    infoSections: [
      {
        title: 'Зачем этот модуль',
        items: [
          {
            title: 'Категория продукта',
            description:
              'Для отдельных категорий в РФ действуют специальные требования к содержанию и каналам рекламы.',
          },
        ],
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
    infoSections: [
      {
        title: 'Пояснения к каналам',
        items: [
          {
            title: 'Email/SMS/Push',
            description:
              'Требуют предварительного согласия получателя и хранения доказательств такого согласия.',
          },
          {
            title: 'Соцсети',
            description:
              'Важно корректно маркировать рекламу и указывать сведения о рекламодателе при необходимости.',
          },
        ],
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
    infoSections: [
      {
        title: 'Стили коммуникации',
        items: [
          {
            title: 'Нейтральный стиль',
            description:
              'Спокойная и фактическая подача без давления на потребителя. Обычно снижает риск претензий к недостоверности и манипуляции.',
          },
          {
            title: 'Агрессивный стиль',
            description:
              'Эмоционально давящая подача с усиленными обещаниями и срочностью. Требует особенно аккуратной юридической вычитки формулировок.',
          },
          {
            title: 'Экспертный стиль',
            description:
              'Опора на факты, исследования и квалификацию. Все тезисы должны быть проверяемыми и подтверждаемыми.',
          },
        ],
      },
    ],
  },
];

/**
 * Готовые шаблоны стратегий для быстрого старта.
 * Можно выбрать в системе и применить одним действием.
 */
export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'template-balanced-digital',
    name: 'Сбалансированная digital-стратегия',
    description: 'Умеренный уровень рисков для классической цифровой кампании.',
    steps: [
      {
        moduleId: 'module-collection',
        subtitle: 'Собираем данные только на законных основаниях',
        settings: {
          sources: ['опросы', 'crm'],
          consent_collected: true,
        },
      },
      {
        moduleId: 'module-audience',
        subtitle: 'Базовая сегментация без спорного профилирования',
        settings: {
          segmentation_depth: 'basic',
          profiling: false,
        },
      },
      {
        moduleId: 'module-channels',
        subtitle: 'Соцсети и email с соблюдением маркировки',
        settings: {
          channels: ['social', 'email'],
          ad_marking: true,
        },
      },
      {
        moduleId: 'module-content',
        subtitle: 'Нейтральный тон с прозрачными обещаниями',
        settings: {
          tone: 'neutral',
          promo_campaign: true,
        },
      },
    ],
  },
  {
    id: 'template-finance-compliance',
    name: 'Финансовый продукт с усиленным комплаенсом',
    description: 'Фокус на раскрытиях и аккуратных формулировках для финсектора.',
    steps: [
      {
        moduleId: 'module-collection',
        subtitle: 'Источники данных с подтверждённым согласием',
        settings: {
          sources: ['crm', 'открытые данные'],
          consent_collected: true,
        },
      },
      {
        moduleId: 'module-client',
        subtitle: 'Ориентация на юридические лица',
        settings: {
          client_categories: ['legal_entities'],
        },
      },
      {
        moduleId: 'module-product-type',
        subtitle: 'Правовая модель под финансовую услугу',
        settings: {
          product_type: 'financial',
        },
      },
      {
        moduleId: 'module-content',
        subtitle: 'Экспертная коммуникация и проверяемые тезисы',
        settings: {
          tone: 'expert',
          promo_campaign: false,
        },
      },
    ],
  },
  {
    id: 'template-family-safe-campaign',
    name: 'Семейная кампания с повышенной этикой',
    description: 'Подходит для коммуникаций с детьми и уязвимыми аудиториями.',
    steps: [
      {
        moduleId: 'module-client',
        subtitle: 'Учитываем детей и уязвимые категории',
        settings: {
          client_categories: ['children', 'vulnerable_people'],
        },
      },
      {
        moduleId: 'module-audience',
        subtitle: 'Базовая сегментация без автоматизированного профилирования',
        settings: {
          segmentation_depth: 'basic',
          profiling: false,
        },
      },
      {
        moduleId: 'module-channels',
        subtitle: 'Ограничиваемся социальными каналами с маркировкой',
        settings: {
          channels: ['social'],
          ad_marking: true,
        },
      },
      {
        moduleId: 'module-content',
        subtitle: 'Этичный нейтральный стиль без агрессивных обещаний',
        settings: {
          tone: 'neutral',
          promo_campaign: false,
        },
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
