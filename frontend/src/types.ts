export type RiskLevel = 'safe' | 'medium' | 'high';

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
  law_reference: LawReference;
}

export interface TextCheckResponse {
  violations: TextViolation[];
  has_violations: boolean;
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

export interface ModuleDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  settings: SettingDefinition[];
}

export interface StrategyStep extends StrategyStepConfig {
  moduleId: string;
}
