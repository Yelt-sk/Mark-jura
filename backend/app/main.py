from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from logic import analyze_strategy, check_ad_text
from schemas import (
    AnalyzeStrategyRequest,
    AnalyzeStrategyResponse,
    TextCheckRequest,
    TextCheckResponse,
)

# Инициализация API приложения.
app = FastAPI(
    title="Маркетинговый Юрист API",
    version="1.0.0",
    description="REST API для анализа маркетинговой стратегии и рекламных текстов.",
)

# CORS для локального frontend и демонстрационного запуска.
# В production рекомендуется заменить '*' на список доверенных доменов.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def healthcheck() -> dict[str, str]:
    """Проверка доступности backend."""

    return {"status": "ok"}


@app.post("/api/analyze-strategy", response_model=AnalyzeStrategyResponse)
def analyze_strategy_endpoint(payload: AnalyzeStrategyRequest) -> AnalyzeStrategyResponse:
    """Возвращает правовые требования и риски по конфигурации стратегии."""

    return analyze_strategy(payload.steps_config)


@app.post("/api/check-text", response_model=TextCheckResponse)
def check_text_endpoint(payload: TextCheckRequest) -> TextCheckResponse:
    """Проверяет рекламный текст на потенциальные юридические нарушения."""

    return check_ad_text(payload.text)
