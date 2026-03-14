from __future__ import annotations

"""Локальный smoke-тест backend API для быстрого запуска в разработке.

Скрипт поднимает реальный FastAPI-сервер через uvicorn,
проверяет ключевые REST-эндпоинты и завершает процесс.
"""

import json
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import Any
from urllib.error import URLError
from urllib.request import Request, urlopen

BACKEND_HOST = "127.0.0.1"
STARTUP_TIMEOUT_SECONDS = 30


def _reserve_free_port() -> int:
    """Возвращает свободный локальный порт для тестового запуска backend."""

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind((BACKEND_HOST, 0))
        sock.listen(1)
        return int(sock.getsockname()[1])


def _http_get_json(url: str) -> tuple[int, dict[str, Any]]:
    """Выполняет GET-запрос и возвращает HTTP-статус + JSON."""

    request = Request(url=url, method="GET")
    with urlopen(request, timeout=5) as response:
        payload = response.read().decode("utf-8")
        data = json.loads(payload)
        return response.status, data


def _http_post_json(url: str, body: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    """Выполняет POST-запрос с JSON и возвращает HTTP-статус + JSON."""

    raw_body = json.dumps(body).encode("utf-8")
    request = Request(
        url=url,
        data=raw_body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urlopen(request, timeout=10) as response:
        payload = response.read().decode("utf-8")
        data = json.loads(payload)
        return response.status, data


def _wait_for_backend(base_url: str, process: subprocess.Popen[str]) -> None:
    """Ожидает доступности backend по /api/health и проверяет, что процесс не упал."""

    deadline = time.time() + STARTUP_TIMEOUT_SECONDS
    health_url = f"{base_url}/api/health"

    while time.time() < deadline:
        if process.poll() is not None:
            stderr_output = ""
            if process.stderr is not None:
                stderr_output = process.stderr.read().strip()
            raise RuntimeError(
                "Backend process exited during startup. "
                f"Return code: {process.returncode}. STDERR: {stderr_output}"
            )

        try:
            status_code, data = _http_get_json(health_url)
            if status_code == 200 and data.get("status") == "ok":
                return
        except (URLError, TimeoutError, ConnectionResetError, OSError, ValueError, json.JSONDecodeError):
            # На старте uvicorn могут быть кратковременные сетевые ошибки (в т.ч. WinError 10054).
            pass

        time.sleep(0.6)

    raise RuntimeError("Backend did not become healthy in time.")


def run_smoke_tests() -> None:
    """Запускает backend и проверяет ключевые API-контракты."""

    backend_dir = Path(__file__).resolve().parents[1]
    backend_port = _reserve_free_port()
    backend_base_url = f"http://{BACKEND_HOST}:{backend_port}"

    uvicorn_cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        BACKEND_HOST,
        "--port",
        str(backend_port),
        "--log-level",
        "warning",
    ]

    process = subprocess.Popen(
        uvicorn_cmd,
        cwd=str(backend_dir),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    try:
        _wait_for_backend(backend_base_url, process)

        # 1) Health endpoint.
        health_status, health_data = _http_get_json(f"{backend_base_url}/api/health")
        assert health_status == 200, "Health endpoint returned non-200 status"
        assert health_data.get("status") == "ok", "Health response status must be 'ok'"

        # 2) Analyze strategy endpoint.
        analyze_payload = {
            "steps_config": [
                {
                    "id": "step-1",
                    "module": "Продукт",
                    "settings": {"product_type": "finance"},
                }
            ]
        }
        analyze_status, analyze_data = _http_post_json(
            f"{backend_base_url}/api/analyze-strategy",
            analyze_payload,
        )
        assert analyze_status == 200, "Analyze endpoint returned non-200 status"
        assert isinstance(analyze_data.get("requirements"), list), "requirements must be a list"
        assert isinstance(analyze_data.get("summary"), str), "summary must be a string"

        if analyze_data["requirements"]:
            first_requirement = analyze_data["requirements"][0]
            required_fields = {
                "stage",
                "title",
                "requirement",
                "risk_level",
                "severity",
                "risk_type",
                "recommendation",
                "law_reference",
            }
            missing_fields = required_fields.difference(first_requirement.keys())
            assert not missing_fields, f"Requirement is missing fields: {sorted(missing_fields)}"

        # 3) Check text endpoint.
        text_payload = {
            "text": "Это лучший продукт без рисков и скрытых условий.",
        }
        text_status, text_data = _http_post_json(
            f"{backend_base_url}/api/check-text",
            text_payload,
        )
        assert text_status == 200, "Text check endpoint returned non-200 status"
        assert isinstance(text_data.get("has_violations"), bool), "has_violations must be boolean"
        assert isinstance(text_data.get("violations"), list), "violations must be a list"
        assert isinstance(text_data.get("detected_words"), list), "detected_words must be a list"
        assert isinstance(text_data.get("has_anglicisms"), bool), "has_anglicisms must be boolean"
        assert isinstance(
            text_data.get("detected_anglicisms"), list
        ), "detected_anglicisms must be a list"

        print("SMOKE_TEST_OK: backend API contracts are valid.")
    finally:
        process.terminate()
        try:
            process.wait(timeout=8)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


if __name__ == "__main__":
    run_smoke_tests()
