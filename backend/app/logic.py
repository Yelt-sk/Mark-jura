from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from typing import Any, Callable

from .schemas import (
    AnalyzeStrategyResponse,
    LawReference,
    LegalRequirement,
    RiskLevel,
    RiskType,
    SeverityLevel,
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
    risk_type: RiskType
    recommendation: str
    law_reference: LawReference
    condition: Callable[[dict[str, Any]], bool] | None = None


@dataclass(frozen=True)
class TextRule:
    """Правило поиска рисковой формулировки в рекламном тексте."""

    pattern: re.Pattern[str]
    explanation: str
    suggestion: str
    risk_level: RiskLevel
    risk_type: RiskType
    law_reference: LawReference


_SEVERITY_ORDER: dict[SeverityLevel, int] = {
    SeverityLevel.HIGH: 0,
    SeverityLevel.MEDIUM: 1,
    SeverityLevel.LOW: 2,
}


_STAGE_ALIASES: dict[str, str] = {
    "тип продукта": "тип продукта",
    "product type": "тип продукта",
    "product-type": "тип продукта",
    "клиент": "клиент",
    "client": "клиент",
}


PRODUCT_TYPE_STAGE_NAME = "Тип продукта"
PRODUCT_TYPE_SETTING_KEY = "product_type"
CLIENT_STAGE_NAME = "Клиент"
CLIENT_SETTING_KEY = "client_categories"


def _normalize_stage_name(stage: str) -> str:
    """Нормализует имя этапа для устойчивого поиска правил (регистр/пробелы)."""

    normalized_spaces = " ".join(stage.strip().split())
    return normalized_spaces.casefold().replace("ё", "е")


def _risk_to_severity(risk_level: RiskLevel) -> SeverityLevel:
    """Преобразует risk_level в severity для сортировки на frontend."""

    if risk_level == RiskLevel.HIGH:
        return SeverityLevel.HIGH
    if risk_level == RiskLevel.MEDIUM:
        return SeverityLevel.MEDIUM
    return SeverityLevel.LOW


def _contains_any(settings: dict[str, Any], keys: list[str], expected_values: set[str]) -> bool:
    """Проверяет, выбран ли хотя бы один из ожидаемых пунктов в настройках блока."""

    normalized_expected = {item.casefold() for item in expected_values}

    for key in keys:
        value = settings.get(key)
        if isinstance(value, list):
            selected_values = {str(item).casefold() for item in value}
            if normalized_expected.intersection(selected_values):
                return True
        if isinstance(value, str) and value.casefold() in normalized_expected:
            return True
    return False


LEGAL_RULES_DB: dict[str, list[StageRule]] = {
    "Сбор информации": [
        StageRule(
            title="Согласие на обработку персональных данных",
            requirement="Перед сбором контактных и поведенческих данных необходимо получить информированное согласие субъекта.",
            risk_level=RiskLevel.HIGH,
            risk_type=RiskType.PERSONAL_DATA,
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
            risk_type=RiskType.PERSONAL_DATA,
            recommendation="Уберите из формы поля, не влияющие на сегментацию или коммуникацию.",
            law_reference=LawReference(
                law='ФЗ "О персональных данных"',
                article="ст. 5",
                description="Объем и содержание данных должны соответствовать заявленным целям обработки.",
            ),
        ),
        StageRule(
            title="Локализация и защита персональных данных",
            requirement="Для российских пользователей обеспечьте хранение и защиту персональных данных с учетом требований локализации.",
            risk_level=RiskLevel.MEDIUM,
            risk_type=RiskType.PERSONAL_DATA,
            recommendation="Проверьте место первичной записи ПДн и документируйте технические меры защиты.",
            law_reference=LawReference(
                law='ФЗ "О персональных данных"',
                article="ст. 18.1, ст. 19",
                description="Оператор обязан применять организационные и технические меры защиты, включая выполнение специальных требований к обработке.",
            ),
        ),
    ],
    "Анализ аудитории": [
        StageRule(
            title="Обезличивание аналитики",
            requirement="При аналитике сегментов используйте обезличенные данные, если персональная идентификация не требуется.",
            risk_level=RiskLevel.MEDIUM,
            risk_type=RiskType.PERSONAL_DATA,
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
            risk_type=RiskType.PERSONAL_DATA,
            recommendation="Добавьте в политику обработки данных раздел о профилировании и праве на возражение.",
            law_reference=LawReference(
                law='ФЗ "О персональных данных"',
                article="ст. 16",
                description="Регулируется принятие решений, порождающих юридические последствия, на основе автоматизированной обработки.",
            ),
            condition=lambda settings: settings.get("profiling") is True,
        ),
    ],
    CLIENT_STAGE_NAME: [
        StageRule(
            title="Корректные B2B-обещания для юридических лиц",
            requirement="В коммуникациях для юридических лиц исключайте недостоверные гарантии и непроверяемые экономические эффекты.",
            risk_level=RiskLevel.MEDIUM,
            risk_type=RiskType.CONSUMER_RIGHTS,
            recommendation="Фиксируйте измеримые KPI и указывайте условия достижения результата в оффере.",
            law_reference=LawReference(
                law='ФЗ "О рекламе"',
                article="ст. 5",
                description="Недостоверная реклама, в том числе с обещаниями без подтверждения, запрещена.",
            ),
            condition=lambda settings: _contains_any(
                settings,
                [CLIENT_SETTING_KEY],
                {"legal_entities"},
            ),
        ),
        StageRule(
            title="Защита детей от вредной рекламной информации",
            requirement="Материалы, направленные на детей, не должны формировать опасное поведение, давление на родителей или чувство неполноценности.",
            risk_level=RiskLevel.HIGH,
            risk_type=RiskType.CHILDREN_AND_VULNERABLE,
            recommendation="Используйте нейтральный тон, исключите агрессивные стимулы покупки и возрастно чувствительные образы.",
            law_reference=LawReference(
                law='ФЗ "О защите детей от информации, причиняющей вред их здоровью и развитию"',
                article="ст. 5, ст. 6",
                description="Информационная продукция для несовершеннолетних ограничивается по содержанию и способу подачи.",
            ),
            condition=lambda settings: _contains_any(
                settings,
                [CLIENT_SETTING_KEY],
                {"children"},
            ),
        ),
        StageRule(
            title="Недопустимость эксплуатации уязвимого положения",
            requirement="Реклама не должна использовать страх, тревожность или социальную зависимость уязвимых групп для стимулирования покупки.",
            risk_level=RiskLevel.HIGH,
            risk_type=RiskType.ETHICS,
            recommendation="Уберите манипулятивные триггеры и добавьте этический review в цикл согласования креативов.",
            law_reference=LawReference(
                law='ФЗ "О рекламе"',
                article="ст. 5",
                description="Недобросовестная и неэтичная реклама, вводящая потребителя в заблуждение или эксплуатирующая его состояние, запрещена.",
            ),
            condition=lambda settings: _contains_any(
                settings,
                [CLIENT_SETTING_KEY],
                {"vulnerable_people"},
            ),
        ),
    ],
    PRODUCT_TYPE_STAGE_NAME: [
        StageRule(
            title="Ограничения рекламы 18+ товаров",
            requirement="Указывайте возрастную маркировку и исключайте обращение к несовершеннолетним в креативах.",
            risk_level=RiskLevel.HIGH,
            risk_type=RiskType.CHILDREN_AND_VULNERABLE,
            recommendation="Добавьте маркировку 18+ и настройте таргетинг только на совершеннолетнюю аудиторию.",
            law_reference=LawReference(
                law='ФЗ "О рекламе"',
                article="ст. 5, ст. 21",
                description="Запрещена реклама, способная причинить вред несовершеннолетним; для отдельных категорий действуют спецограничения.",
            ),
            condition=lambda settings: settings.get("product_type") == "adult",
        ),
        StageRule(
            title="Жесткие ограничения по алкоголю",
            requirement="Реклама алкогольной и подакцизной продукции ограничена по каналам, содержанию и условиям распространения.",
            risk_level=RiskLevel.HIGH,
            risk_type=RiskType.ADVERTISING,
            recommendation="Проверьте допустимость канала размещения и исключите стимулирование чрезмерного потребления.",
            law_reference=LawReference(
                law='ФЗ "О рекламе"',
                article="ст. 21",
                description="Установлены специальные запреты и ограничения для рекламы алкогольной продукции.",
            ),
            condition=lambda settings: settings.get("product_type") == "alcohol",
        ),
        StageRule(
            title="Требования к рекламе азартных игр",
            requirement="Реклама азартных игр и ставок регулируется особыми ограничениями по содержанию и времени/месту распространения.",
            risk_level=RiskLevel.HIGH,
            risk_type=RiskType.ADVERTISING,
            recommendation="Добавьте предупреждения о рисках и проверьте соответствие площадки требованиям законодательства РФ.",
            law_reference=LawReference(
                law='ФЗ "О рекламе"',
                article="ст. 27",
                description="Реклама основанных на риске игр и пари допустима только при соблюдении специальных требований.",
            ),
            condition=lambda settings: settings.get("product_type") == "gambling",
        ),
        StageRule(
            title="Корректность медицинских заявлений",
            requirement="Нельзя обещать гарантированный лечебный эффект и замену обращения к врачу.",
            risk_level=RiskLevel.HIGH,
            risk_type=RiskType.ADVERTISING,
            recommendation="Используйте нейтральные формулировки и добавляйте обязательные предупреждения, если применимо.",
            law_reference=LawReference(
                law='ФЗ "О рекламе"',
                article="ст. 24",
                description="Для рекламы медицинских услуг, изделий и лекарственных средств установлены специальные требования и запреты.",
            ),
            condition=lambda settings: settings.get("product_type") == "medical",
        ),
        StageRule(
            title="Прозрачность финансовых условий",
            requirement="В рекламе финансовых услуг должны быть раскрыты существенные условия, влияющие на доходность и стоимость.",
            risk_level=RiskLevel.HIGH,
            risk_type=RiskType.FINANCIAL_DISCLOSURE,
            recommendation="Покажите полные условия, включая комиссии, диапазоны ставок и ограничения.",
            law_reference=LawReference(
                law='ФЗ "О рекламе"',
                article="ст. 28",
                description="Для финансовых услуг требуется достоверное указание существенных условий и отсутствие вводящих в заблуждение формулировок.",
            ),
            condition=lambda settings: settings.get("product_type") == "financial",
        ),
        StageRule(
            title="Осторожные формулировки для БАДов",
            requirement="Запрещено позиционировать БАДы как лекарственные средства или гарантировать лечебный эффект.",
            risk_level=RiskLevel.HIGH,
            risk_type=RiskType.ADVERTISING,
            recommendation="Используйте только допустимые формулировки о пищевой ценности и назначении без медицинских обещаний.",
            law_reference=LawReference(
                law='ФЗ "О рекламе"',
                article="ст. 25",
                description="Реклама БАДов не должна создавать впечатление, что они являются лекарством и обладают лечебными свойствами.",
            ),
            condition=lambda settings: settings.get("product_type") == "supplements",
        ),
        StageRule(
            title="Крипто-услуги: повышенный комплаенс",
            requirement="Коммуникации о крипто-сервисах должны быть максимально прозрачными и не содержать гарантий доходности.",
            risk_level=RiskLevel.HIGH,
            risk_type=RiskType.FINANCIAL_DISCLOSURE,
            recommendation="Укажите риск-раскрытия и избегайте формулировок про гарантированную прибыль.",
            law_reference=LawReference(
                law='ФЗ "О рекламе"',
                article="ст. 5",
                description="Запрещены недостоверные заявления, в том числе о гарантированном результате инвестиций.",
            ),
            condition=lambda settings: settings.get("product_type") == "crypto",
        ),
        StageRule(
            title="Потребительская прозрачность цифровых продуктов",
            requirement="Для цифровых товаров важно раскрывать существенные ограничения использования, подписки и возврата.",
            risk_level=RiskLevel.MEDIUM,
            risk_type=RiskType.DIGITAL_RIGHTS,
            recommendation="Покажите условия лицензии, автопродления и порядок отказа/возврата до покупки.",
            law_reference=LawReference(
                law='Закон РФ "О защите прав потребителей"',
                article="ст. 10",
                description="Потребителю должна быть предоставлена достоверная и полная информация о товаре/услуге.",
            ),
            condition=lambda settings: settings.get("product_type") == "digital",
        ),
    ],
    "Выбор каналов": [
        StageRule(
            title="Маркировка рекламы",
            requirement="Рекламные материалы должны быть однозначно идентифицируемы как реклама.",
            risk_level=RiskLevel.HIGH,
            risk_type=RiskType.ADVERTISING,
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
            risk_type=RiskType.PERSONAL_DATA,
            recommendation="Реализуйте double opt-in и хранение журнала согласий с датой/источником.",
            law_reference=LawReference(
                law='ФЗ "О рекламе"',
                article="ст. 18",
                description="Распространение рекламы по сетям электросвязи допускается при предварительном согласии абонента.",
            ),
            condition=lambda settings: _contains_any(settings, ["channels"], {"email", "sms", "push"}),
        ),
        StageRule(
            title="Соблюдение правил распространения информации в сети",
            requirement="При digital-кампаниях проверяйте соответствие контента и механик требованиям к распространению информации в интернете.",
            risk_level=RiskLevel.MEDIUM,
            risk_type=RiskType.DIGITAL_RIGHTS,
            recommendation="Внедрите внутренний чеклист публикации для маркетинговых материалов на онлайн-площадках.",
            law_reference=LawReference(
                law='ФЗ "Об информации, информационных технологиях и о защите информации"',
                article="ст. 10",
                description="Распространитель информации обязан соблюдать установленные законом ограничения и обязанности.",
            ),
        ),
    ],
    "Контент-план": [
        StageRule(
            title="Недопустимость недостоверных обещаний",
            requirement="В рекламе нельзя использовать формулировки, вводящие в заблуждение о свойствах и результате продукта.",
            risk_level=RiskLevel.HIGH,
            risk_type=RiskType.ADVERTISING,
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
            risk_type=RiskType.CONSUMER_RIGHTS,
            recommendation="Добавьте ссылку на правила акции и ограничения по срокам/категориям товаров.",
            law_reference=LawReference(
                law='Закон РФ "О защите прав потребителей"',
                article="ст. 8, ст. 10",
                description="Потребителю должна быть заранее предоставлена необходимая и достоверная информация о предложении.",
            ),
            condition=lambda settings: settings.get("promo_campaign") is True,
        ),
    ],
}

_STAGE_RULES_BY_NORMALIZED_NAME: dict[str, list[StageRule]] = {
    _normalize_stage_name(stage_name): stage_rules
    for stage_name, stage_rules in LEGAL_RULES_DB.items()
}


_TEXT_RULES: list[TextRule] = [
    TextRule(
        pattern=re.compile(r"гарантир(?:уем|ую|ует|уют)\s+результат", re.IGNORECASE),
        explanation="Абсолютная гарантия результата может быть признана недостоверной рекламой.",
        suggestion="Используйте формулировку: «Помогаем повысить вероятность результата при соблюдении условий».",
        risk_level=RiskLevel.HIGH,
        risk_type=RiskType.ADVERTISING,
        law_reference=LawReference(
            law='ФЗ "О рекламе"',
            article="ст. 5",
            description="Запрещена недостоверная реклама с необоснованными обещаниями.",
        ),
    ),
    TextRule(
        pattern=re.compile(r"(скидк[аи]?\s*(до\s*)?\d{1,2}%|минус\s*\d{1,2}%)", re.IGNORECASE),
        explanation="Крупная скидка без раскрытия условий может вводить потребителя в заблуждение.",
        suggestion="Уточните условия: «Скидка до N% на ограниченный ассортимент по правилам акции».",
        risk_level=RiskLevel.MEDIUM,
        risk_type=RiskType.CONSUMER_RIGHTS,
        law_reference=LawReference(
            law='Закон РФ "О защите прав потребителей"',
            article="ст. 10",
            description="Потребителю должна быть доступна достоверная информация о цене и условиях акции.",
        ),
    ),
    TextRule(
        pattern=re.compile(r"без\s+рисков", re.IGNORECASE),
        explanation="Утверждение об отсутствии рисков обычно недоказуемо и может считаться вводящим в заблуждение.",
        suggestion="Смягчите обещание: «Снижаем риски благодаря проверенной методологии».",
        risk_level=RiskLevel.HIGH,
        risk_type=RiskType.ADVERTISING,
        law_reference=LawReference(
            law='ФЗ "О рекламе"',
            article="ст. 5",
            description="Запрещены заявления, формирующие у потребителя ложное представление.",
        ),
    ),
    TextRule(
        pattern=re.compile(r"только\s+сегодня|последн(?:ий|ие)\s+шанс", re.IGNORECASE),
        explanation="Ограничение по времени должно быть фактическим и подтверждаемым.",
        suggestion="Укажите точный срок действия предложения и ссылку на условия акции.",
        risk_level=RiskLevel.MEDIUM,
        risk_type=RiskType.CONSUMER_RIGHTS,
        law_reference=LawReference(
            law='ФЗ "О рекламе"',
            article="ст. 5",
            description="Недостоверные сведения о сроках действия условий рекламы запрещены.",
        ),
    ),
    TextRule(
        pattern=re.compile(r"100%\s*(эффект|результат|гарантия)", re.IGNORECASE),
        explanation="Категоричные заявления о 100% результате часто требуют доказательств, которыми рекламодатель не располагает.",
        suggestion="Замените на проверяемые формулировки с условиями и оговорками.",
        risk_level=RiskLevel.HIGH,
        risk_type=RiskType.ADVERTISING,
        law_reference=LawReference(
            law='ФЗ "О рекламе"',
            article="ст. 5",
            description="Недостоверные и бездоказательные рекламные обещания запрещены.",
        ),
    ),
]

# Русские корни обсценной лексики и токсичного сленга.
# Словарь основан на юридически и репутационно рисковых категориях для рекламной коммуникации.
_PROFANITY_ROOTS = {
    "хуй",
    "хуе",
    "хуйн",
    "пизд",
    "еб",
    "бля",
    "бляд",
    "муд",
    "гандон",
    "уеб",
    "долбоеб",
    "мраз",
    "твар",
    "сук",
}

_TOXIC_SLANG_ROOTS = {
    "лох",
    "кидал",
    "развод",
    "шлак",
    "днищ",
    "отстой",
    "жесть",
    "кринж",
}

_LEETSPEAK_MAP = str.maketrans(
    {
        "0": "о",
        "1": "и",
        "3": "з",
        "4": "ч",
        "6": "б",
        "@": "а",
        "$": "с",
        "!": "и",
    }
)

_LATIN_TO_CYRILLIC_MAP = str.maketrans(
    {
        "a": "а",
        "b": "в",
        "c": "с",
        "e": "е",
        "h": "н",
        "k": "к",
        "m": "м",
        "o": "о",
        "p": "р",
        "t": "т",
        "x": "х",
        "y": "у",
    }
)

_WORD_PATTERN = re.compile(r"[A-Za-zА-Яа-яЁё0-9@!$]+")
_ANGLICISM_PATTERN = re.compile(r"\b[A-Za-z][A-Za-z\-']*\b")


def _normalize_token_for_profanity(token: str) -> str:
    """Нормализует токен (leet/translit/повторы) для устойчивого распознавания брани и сленга."""

    normalized = token.casefold().replace("ё", "е")
    normalized = normalized.translate(_LEETSPEAK_MAP)
    normalized = normalized.translate(_LATIN_TO_CYRILLIC_MAP)
    normalized = re.sub(r"[^а-я0-9]", "", normalized)

    # Сжимаем чрезмерные повторы символов: "бляяяя" -> "бляя".
    normalized = re.sub(r"(.)\1{2,}", r"\1\1", normalized)
    return normalized


def _detect_anglicisms(text: str) -> list[str]:
    """Выявляет английские слова в русскоязычном тексте для предупреждения о языковых рисках."""

    # Детектор запускается только если текст реально содержит русские символы.
    if re.search(r"[А-Яа-яЁё]", text) is None:
        return []

    detected: list[str] = []
    seen: set[str] = set()

    for match in _ANGLICISM_PATTERN.finditer(text):
        word = match.group(0)
        normalized = word.casefold()
        if normalized in seen:
            continue

        seen.add(normalized)
        detected.append(normalized)

    return detected


def _match_russian_profanity_or_slang(token: str) -> tuple[bool, RiskLevel, RiskType, str] | None:
    """Возвращает параметры нарушения при совпадении с корнями брани/сленга."""

    normalized = _normalize_token_for_profanity(token)
    if len(normalized) < 3:
        return None

    for root in _PROFANITY_ROOTS:
        if normalized.startswith(root) or root in normalized:
            return (
                True,
                RiskLevel.HIGH,
                RiskType.ETHICS,
                "Обнаружена обсценная лексика: это повышает репутационный риск бренда и может быть оценено как неэтичная реклама.",
            )

    for root in _TOXIC_SLANG_ROOTS:
        if normalized.startswith(root) or root in normalized:
            return (
                True,
                RiskLevel.MEDIUM,
                RiskType.ETHICS,
                "Обнаружен токсичный/жаргонный сленг: в публичной рекламе это снижает профессиональный стандарт коммуникации.",
            )

    return None


def _resolve_stage_rules(step: StrategyStepConfig) -> list[StageRule]:
    """Ищет правила этапа по нормализованному имени, алиасам и fallback по ключам настроек."""

    normalized_name = _normalize_stage_name(step.module)
    aliased_name = _STAGE_ALIASES.get(normalized_name, normalized_name)
    stage_rules = _STAGE_RULES_BY_NORMALIZED_NAME.get(aliased_name)

    if stage_rules is not None:
        return stage_rules

    # Fallback: если frontend прислал другое отображаемое имя,
    # применяем правила по ключевым полям настроек.
    if PRODUCT_TYPE_SETTING_KEY in step.settings:
        return LEGAL_RULES_DB.get(PRODUCT_TYPE_STAGE_NAME, [])
    if CLIENT_SETTING_KEY in step.settings:
        return LEGAL_RULES_DB.get(CLIENT_STAGE_NAME, [])

    return []


def analyze_strategy(steps_config: list[StrategyStepConfig]) -> AnalyzeStrategyResponse:
    """Формирует правовую аналитику по текущей конфигурации маркетинговой стратегии."""

    requirements: list[LegalRequirement] = []

    for step in steps_config:
        stage_rules = _resolve_stage_rules(step)
        for rule in stage_rules:
            if rule.condition is None or rule.condition(step.settings):
                requirements.append(
                    LegalRequirement(
                        stage=step.module,
                        title=rule.title,
                        requirement=rule.requirement,
                        risk_level=rule.risk_level,
                        severity=_risk_to_severity(rule.risk_level),
                        risk_type=rule.risk_type,
                        recommendation=rule.recommendation,
                        law_reference=rule.law_reference,
                    )
                )

    requirements.sort(key=lambda item: _SEVERITY_ORDER[item.severity])

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
    detected_words: set[str] = set()

    for rule in _TEXT_RULES:
        for match in rule.pattern.finditer(text):
            violations.append(
                ViolationMatch(
                    phrase=match.group(0),
                    start=match.start(),
                    end=match.end(),
                    explanation=rule.explanation,
                    suggestion=rule.suggestion,
                    risk_level=rule.risk_level,
                    severity=_risk_to_severity(rule.risk_level),
                    risk_type=rule.risk_type,
                    law_reference=rule.law_reference,
                )
            )

    for token_match in _WORD_PATTERN.finditer(text):
        original_token = token_match.group(0)
        moderation_match = _match_russian_profanity_or_slang(original_token)
        if moderation_match is None:
            continue

        _, risk_level, risk_type, explanation = moderation_match
        normalized_word = _normalize_token_for_profanity(original_token)
        detected_words.add(normalized_word)

        suggestion = (
            "Замените формулировку на нейтральную и профессиональную лексику, избегая бранных и уничижительных выражений."
            if risk_level == RiskLevel.HIGH
            else "Сохраните деловой тон и замените жаргон на нейтральную, понятную аудитории формулировку."
        )

        violations.append(
            ViolationMatch(
                phrase=original_token,
                start=token_match.start(),
                end=token_match.end(),
                explanation=explanation,
                suggestion=suggestion,
                risk_level=risk_level,
                severity=_risk_to_severity(risk_level),
                risk_type=risk_type,
                law_reference=LawReference(
                    law='ФЗ "О рекламе"',
                    article="ст. 5",
                    description="Недобросовестная и неэтичная реклама может повлечь претензии со стороны регулятора.",
                ),
            )
        )

    violations.sort(key=lambda item: (_SEVERITY_ORDER[item.severity], item.start))
    detected_anglicisms = _detect_anglicisms(text)

    return TextCheckResponse(
        violations=violations,
        has_violations=bool(violations),
        detected_words=sorted(detected_words),
        has_anglicisms=bool(detected_anglicisms),
        detected_anglicisms=detected_anglicisms,
    )
