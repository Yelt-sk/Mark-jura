export type RiskLevel = 'safe' | 'medium' | 'high';
export type SeverityLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type RiskType =
  | 'advertising'
  | 'personal_data'
  | 'consumer_rights'
  | 'children_and_vulnerable'
  | 'ethics'
  | 'financial_disclosure'
  | 'digital_rights';

export interface LawReference {
  law: string;
  article: string;
  description: string;
}

export interface LegalRequirement {
  stage: string;
  title: string;
  requirement: string;
  risk_level: RiskLevel;
  severity: SeverityLevel;
  risk_type: RiskType;
  recommendation: string;
  law_reference: LawReference;
}

export interface StrategyStepConfig {
  id: string;
  module: string;
  settings: Record<string, unknown>;
}

export interface AnalyzeStrategyResponse {
  requirements: LegalRequirement[];
  summary: string;
}

export interface TextViolation {
  phrase: string;
  start: number;
  end: number;
  explanation: string;
  suggestion: string;
  risk_level: RiskLevel;
  severity: SeverityLevel;
  risk_type: RiskType;
  law_reference: LawReference;
}

export interface TextCheckResponse {
  violations: TextViolation[];
  has_violations: boolean;
  detected_words: string[];
  has_anglicisms: boolean;
  detected_anglicisms: string[];
}

export type SettingType = 'checkbox-group' | 'radio' | 'select' | 'switch';

export interface SettingOption {
  label: string;
  value: string;
}

export interface SettingDefinition {
  key: string;
  label: string;
  type: SettingType;
  options?: SettingOption[];
  defaultValue: unknown;
}

export interface ModuleInfoItem {
  title: string;
  description: string;
}

export interface ModuleInfoSection {
  title: string;
  items: ModuleInfoItem[];
}

export interface ModuleDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  settings: SettingDefinition[];
  infoSections?: ModuleInfoSection[];
}

export interface StrategyStep extends StrategyStepConfig {
  moduleId: string;
  subtitle: string;
}

/**
 * Состояние стратегии, которое хранит пользовательское имя и набор шагов.
 */
export interface StrategyState {
  name: string;
  steps: StrategyStep[];
}

/**
 * Шаг шаблона стратегии для быстрого применения готовых пресетов.
 */
export interface StrategyTemplateStep {
  moduleId: string;
  subtitle: string;
  settings?: Record<string, unknown>;
}

/**
 * Шаблон стратегии, который можно выбрать и применить в конструкторе.
 */
export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  steps: StrategyTemplateStep[];
}
