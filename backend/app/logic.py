from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from typing import Any, Callable

from schemas import (
    AnalyzeStrategyResponse,
    LawReference,
    LegalRequirement,
    RiskLevel,
    StrategyStepConfig,
    TextCheckResponse,
    ViolationMatch,
)


@dataclass(frozen=True)
class StageRule:
    """Описание правила для этапа стратегии с опциональным условием применения."""

    title: str
    requirement: str
    risk_level: RiskLevel
    recommendation: str
    law_reference: LawReference
    condition: Callable[[dict[str, Any]], bool] | None = None


def _contains_any(settings: dict[str, Any], keys: list[str], expected_values: set[str]) -> bool:
    """Проверяет, выбран ли хотя бы один из ожидаемых пунктов в настройках блока."""

    for key in keys:
        value = settings.get(key)
        if isinstance(value, list) and expected_values.intersection({str(item).lower() for item in value}):
            return True
        if isinstance(value, str) and value.lower() in expected_values:
            return True
    return False


LEGAL_RULES_DB: dict[str, list[StageRule]] = {
    "Сбор информации": [
        StageRule(
            title="Согласие на обработку персональных данных",
            requirement="Перед сбором контактных и поведенческих данных необходимо получить информированное согласие субъекта.",
            risk_level=RiskLevel.HIGH,
            recommendation="Добавьте отдельный чекбокс согласия и ссылку на политику обработки персональных данных.",
            law_reference=LawReference(
                law='ФЗ "О персональных данных"',
                article="ст. 6, ст. 9",
                description="Обработка персональных данных допускается при наличии законных оснований, включая согласие.",
            ),
            condition=lambda settings: _contains_any(settings, ["sources"], {"опросы", "crm"}),
        ),
        StageRule(
            title="Минимизация собираемых данных",
            requirement="Собирайте только те данные, которые действительно нужны для заявленной цели маркетинга.",
            risk_level=RiskLevel.MEDIUM,
            recommendation="Уберите из формы поля, не влияющие на сегментацию или коммуникацию.",
            law_reference=LawReference(
                law='ФЗ "О персональных данных"',
                article="ст. 5",
                description="Объем и содержание данных должны соответствовать заявленным целям обработки.",
            ),
        ),
    ],
    "Анализ аудитории": [
        StageRule(
            title="Обезличивание аналитики",
            requirement="При аналитике сегментов используйте обезличенные данные, если персональная идентификация не требуется.",
            risk_level=RiskLevel.MEDIUM,
            recommendation="В отчетах исключите ФИО, телефоны, email и иные прямые идентификаторы.",
            law_reference=LawReference(
                law='ФЗ "О персональных данных"',
                article="ст. 3, ст. 5",
                description="Предусматривается возможность обработки обезличенных данных при соблюдении целей.",
            ),
        ),
        StageRule(
            title="Профилирование и автоматизированные решения",
            requirement="При использовании автоматизированного профилирования уведомляйте пользователя о логике и последствиях.",
            risk_level=RiskLevel.HIGH,
            recommendation="Добавьте в политику обработки данных раздел о профилировании и праве на возражение.",
            law_reference=LawReference(
                law='ФЗ "О персональных данных"',
                article="ст. 16",
                description="Регулируется принятие решений, порождающих юридические последствия, на основе автоматизированной обработки.",
            ),
            condition=lambda settings: settings.get("profiling") is True,
        ),
    ],
    "Выбор каналов": [
        StageRule(
            title="Маркировка рекламы",
            requirement="Рекламные материалы должны быть однозначно идентифицируемы как реклама.",
            risk_level=RiskLevel.HIGH,
            recommendation='Добавьте маркировку "Реклама" и сведения о рекламодателе на креативы.',
            law_reference=LawReference(
                law='ФЗ "О рекламе"',
                article="ст. 5, ст. 18.1",
                description="Реклама должна быть распознаваема, а распространение в интернете требует специальной маркировки.",
            ),
        ),
        StageRule(
            title="Согласие на рассылку",
            requirement="Для email/SMS/push-каналов нужно предварительное согласие адресата на получение рекламы.",
            risk_level=RiskLevel.HIGH,
            recommendation="Реализуйте double opt-in и хранение журнала согласий с датой/источником.",
            law_reference=LawReference(
                law='ФЗ "О рекламе"',
                article="ст. 18",
                description="Распространение рекламы по сетям электросвязи допускается при предварительном согласии абонента.",
            ),
            condition=lambda settings: _contains_any(settings, ["channels"], {"email", "sms", "push"}),
        ),
    ],
    "Контент-план": [
        StageRule(
            title="Недопустимость недостоверных обещаний",
            requirement="В рекламе нельзя использовать формулировки, вводящие в заблуждение о свойствах и результате продукта.",
            risk_level=RiskLevel.HIGH,
            recommendation="Замените абсолютные обещания на проверяемые и ограниченные по условиям формулировки.",
            law_reference=LawReference(
                law='ФЗ "О рекламе"',
                article="ст. 5",
                description="Недостоверная реклама, вводящая в заблуждение, запрещена.",
            ),
        ),
        StageRule(
            title="Полнота существенных условий акции",
            requirement="Если в креативе указана скидка/акция, должны быть доступны существенные условия ее получения.",
            risk_level=RiskLevel.MEDIUM,
            recommendation="Добавьте ссылку на правила акции и ограничения по срокам/категориям товаров.",
            law_reference=LawReference(
                law='ФЗ "О рекламе"',
                article="ст. 28",
                description="Реклама акций и стимулирующих мероприятий должна содержать существенные условия.",
            ),
            condition=lambda settings: settings.get("promo_campaign") is True,
        ),
    ],
}


_TEXT_RULES = [
    {
        "pattern": re.compile(r"гарантируем\s+результат", re.IGNORECASE),
        "explanation": "Абсолютная гарантия результата может быть признана недостоверной рекламой.",
        "suggestion": "Используйте формулировку: «Помогаем повысить вероятность результата при соблюдении условий».",
        "risk_level": RiskLevel.HIGH,
        "law_reference": LawReference(
            law='ФЗ "О рекламе"',
            article="ст. 5",
            description="Запрещена недостоверная реклама с необоснованными обещаниями.",
        ),
    },
    {
        "pattern": re.compile(r"скидка\s*70%", re.IGNORECASE),
        "explanation": "Крупная скидка без раскрытия условий может вводить потребителя в заблуждение.",
        "suggestion": "Уточните условия: «Скидка до 70% на ограниченный ассортимент по правилам акции».",
        "risk_level": RiskLevel.MEDIUM,
        "law_reference": LawReference(
            law='ФЗ "О рекламе"',
            article="ст. 28",
            description="В рекламе акций должны быть указаны существенные условия их проведения.",
        ),
    },
    {
        "pattern": re.compile(r"без\s+рисков", re.IGNORECASE),
        "explanation": "Утверждение об отсутствии рисков обычно недоказуемо и может считаться вводящим в заблуждение.",
        "suggestion": "Смягчите обещание: «Снижаем риски благодаря проверенной методологии».",
        "risk_level": RiskLevel.HIGH,
        "law_reference": LawReference(
            law='ФЗ "О рекламе"',
            article="ст. 5",
            description="Запрещены заявления, которые формируют у потребителя ложное представление.",
        ),
    },
    {
        "pattern": re.compile(r"только\s+сегодня", re.IGNORECASE),
        "explanation": "Ограничение по времени должно быть фактическим и подтверждаемым.",
        "suggestion": "Укажите точный срок: «Предложение действует до 23:59 15.09.2026».",
        "risk_level": RiskLevel.MEDIUM,
        "law_reference": LawReference(
            law='ФЗ "О рекламе"',
            article="ст. 5",
            description="Недостоверные сведения о сроках действия условий рекламы запрещены.",
        ),
    },
]


def analyze_strategy(steps_config: list[StrategyStepConfig]) -> AnalyzeStrategyResponse:
    """Формирует правовую аналитику по текущей конфигурации маркетинговой стратегии."""

    requirements: list[LegalRequirement] = []

    for step in steps_config:
        stage_rules = LEGAL_RULES_DB.get(step.module, [])
        for rule in stage_rules:
            if rule.condition is None or rule.condition(step.settings):
                requirements.append(
                    LegalRequirement(
                        stage=step.module,
                        title=rule.title,
                        requirement=rule.requirement,
                        risk_level=rule.risk_level,
                        recommendation=rule.recommendation,
                        law_reference=rule.law_reference,
                    )
                )

    if not requirements:
        summary = "Пока в стратегии нет активных модулей. Добавьте блоки для правового анализа."
    else:
        counters = Counter(item.risk_level for item in requirements)
        summary = (
            f"Найдено требований: {len(requirements)}. "
            f"Высокий риск: {counters.get(RiskLevel.HIGH, 0)}, "
            f"средний риск: {counters.get(RiskLevel.MEDIUM, 0)}, "
            f"безопасный уровень: {counters.get(RiskLevel.SAFE, 0)}."
        )

    return AnalyzeStrategyResponse(requirements=requirements, summary=summary)


def check_ad_text(text: str) -> TextCheckResponse:
    """Ищет рисковые рекламные формулировки и возвращает юридические комментарии."""

    violations: list[ViolationMatch] = []

    for rule in _TEXT_RULES:
        for match in rule["pattern"].finditer(text):
            violations.append(
                ViolationMatch(
                    phrase=match.group(0),
                    start=match.start(),
                    end=match.end(),
                    explanation=rule["explanation"],
                    suggestion=rule["suggestion"],
                    risk_level=rule["risk_level"],
                    law_reference=rule["law_reference"],
                )
            )

    violations.sort(key=lambda item: item.start)
    return TextCheckResponse(violations=violations, has_violations=bool(violations))
