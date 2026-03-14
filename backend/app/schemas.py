from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    """Уровни правового риска для визуализации и приоритизации."""

    SAFE = "safe"
    MEDIUM = "medium"
    HIGH = "high"


class SeverityLevel(str, Enum):
    """Текстовый уровень критичности для сортировки в UI."""

    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RiskType(str, Enum):
    """Тип риска для фильтрации и группировки в правовой панели."""

    ADVERTISING = "advertising"
    PERSONAL_DATA = "personal_data"
    CONSUMER_RIGHTS = "consumer_rights"
    CHILDREN_AND_VULNERABLE = "children_and_vulnerable"
    ETHICS = "ethics"
    FINANCIAL_DISCLOSURE = "financial_disclosure"
    DIGITAL_RIGHTS = "digital_rights"


class LawReference(BaseModel):
    """Ссылка на норму закона."""

    law: str = Field(..., description="Название закона")
    article: str = Field(..., description="Статья или пункт")
    description: str = Field(..., description="Краткое пояснение нормы")


class LegalRequirement(BaseModel):
    """Единица юридической аналитики для конкретного этапа стратегии."""

    stage: str = Field(..., description="Этап маркетинговой стратегии")
    title: str = Field(..., description="Краткое название требования")
    requirement: str = Field(..., description="Что нужно сделать, чтобы соблюдать закон")
    risk_level: RiskLevel = Field(..., description="Уровень риска")
    severity: SeverityLevel = Field(..., description="Критичность для сортировки")
    risk_type: RiskType = Field(..., description="Категория риска для фильтрации")
    recommendation: str = Field(..., description="Практическая рекомендация")
    law_reference: LawReference = Field(..., description="Ссылка на закон")


class StrategyStepConfig(BaseModel):
    """Конфигурация блока стратегии, приходящая с frontend."""

    id: str = Field(..., description="Уникальный идентификатор блока на канвасе")
    module: str = Field(..., description="Название этапа/модуля")
    settings: dict[str, Any] = Field(default_factory=dict, description="Настройки блока")


class AnalyzeStrategyRequest(BaseModel):
    """Тело запроса на анализ всей стратегии."""

    steps_config: list[StrategyStepConfig] = Field(default_factory=list)


class AnalyzeStrategyResponse(BaseModel):
    """Ответ с агрегированными юридическими требованиями."""

    requirements: list[LegalRequirement] = Field(default_factory=list)
    summary: str = Field(..., description="Сводка по рискам")


class TextCheckRequest(BaseModel):
    """Запрос на проверку рекламного текста."""

    text: str = Field(..., min_length=1, description="Текст рекламного сообщения")


class ViolationMatch(BaseModel):
    """Найденное потенциальное нарушение в тексте."""

    phrase: str = Field(..., description="Найденная фраза")
    start: int = Field(..., ge=0, description="Стартовый индекс")
    end: int = Field(..., ge=0, description="Конечный индекс")
    explanation: str = Field(..., description="Почему это риск")
    suggestion: str = Field(..., description="Безопасная альтернатива")
    risk_level: RiskLevel = Field(..., description="Оценка риска")
    severity: SeverityLevel = Field(..., description="Критичность для сортировки")
    risk_type: RiskType = Field(..., description="Категория риска")
    law_reference: LawReference = Field(..., description="Ссылка на норму")


class TextCheckResponse(BaseModel):
    """Результат юридической проверки рекламного текста."""

    violations: list[ViolationMatch] = Field(default_factory=list)
    has_violations: bool = Field(..., description="Есть ли рисковые формулировки")
    detected_words: list[str] = Field(
        default_factory=list,
        description="Список обнаруженных стоп-слов/бранных слов",
    )
    has_anglicisms: bool = Field(
        default=False,
        description="Обнаружены ли англицизмы (английские слова в русскоязычном тексте)",
    )
    detected_anglicisms: list[str] = Field(
        default_factory=list,
        description="Список обнаруженных англицизмов",
    )
