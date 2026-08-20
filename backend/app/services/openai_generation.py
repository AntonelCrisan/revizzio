from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from openai import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    AsyncOpenAI,
    RateLimitError,
)

from app.core.config import Settings


class OpenAIGenerationError(Exception):
    pass


@dataclass(slots=True)
class OpenAIGenerationResult:
    payload: dict[str, Any]
    response_id: str | None
    input_tokens: int
    output_tokens: int
    total_tokens: int


class OpenAIStudyGenerator:
    def __init__(self, settings: Settings) -> None:
        if settings.openai_api_key is None:
            raise OpenAIGenerationError(
                "Serviciul de generare nu este configurat."
            )

        self._settings = settings
        self._client = AsyncOpenAI(
            api_key=settings.openai_api_key.get_secret_value(),
            timeout=settings.openai_request_timeout_seconds,
        )

    async def generate_json(
        self,
        *,
        model: str,
        instructions: str,
        prompt: str,
        schema_name: str,
        schema: dict[str, Any],
        max_output_tokens: int,
        reasoning_effort: str,
        user_id: str,
        project_id: str,
        job_type: str,
    ) -> OpenAIGenerationResult:
        try:
            response = await self._client.responses.create(
                model=model,
                instructions=instructions,
                input=prompt,
                max_output_tokens=max_output_tokens,
                reasoning={"effort": reasoning_effort},
                text={
                    "format": {
                        "type": "json_schema",
                        "name": schema_name,
                        "strict": True,
                        "schema": schema,
                    }
                },
                store=False,
                metadata={
                    "app": "reviss",
                    "project_id": project_id,
                    "job_type": job_type,
                },
                user=user_id,
            )
        except (APIConnectionError, APITimeoutError) as exc:
            raise OpenAIGenerationError(
                "Serviciul de generare nu a raspuns la timp. Incearca din nou."
            ) from exc
        except RateLimitError as exc:
            error_code = getattr(exc, "code", None)
            if error_code == "insufficient_quota":
                raise OpenAIGenerationError(
                    "Generarea nu este disponibila momentan. Incearca din nou "
                    "in cateva minute."
                ) from exc
            raise OpenAIGenerationError(
                "Serviciul de generare este aglomerat momentan. Incearca din nou."
            ) from exc
        except APIError as exc:
            raise OpenAIGenerationError(
                "Pachetul nu a putut fi generat momentan. Incearca din nou."
            ) from exc

        raw_output = getattr(response, "output_text", "") or ""
        if not raw_output.strip():
            raise OpenAIGenerationError(
                "Serviciul de generare nu a returnat continut util."
            )

        try:
            payload = json.loads(raw_output)
        except json.JSONDecodeError as exc:
            raise OpenAIGenerationError(
                "Pachetul generat nu a putut fi citit corect."
            ) from exc

        if not isinstance(payload, dict):
            raise OpenAIGenerationError(
                "Pachetul generat are o structura invalida."
            )

        usage = getattr(response, "usage", None)
        input_tokens = int(getattr(usage, "input_tokens", 0) or 0)
        output_tokens = int(getattr(usage, "output_tokens", 0) or 0)
        total_tokens = int(getattr(usage, "total_tokens", 0) or 0)

        return OpenAIGenerationResult(
            payload=payload,
            response_id=getattr(response, "id", None),
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
        )


AI_EXPLANATION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["title", "answer", "bullets"],
    "properties": {
        "title": {"type": "string", "minLength": 2, "maxLength": 120},
        "answer": {"type": "string", "minLength": 2, "maxLength": 1200},
        "bullets": {
            "type": "array",
            "minItems": 2,
            "maxItems": 4,
            "items": {"type": "string", "minLength": 2, "maxLength": 260},
        },
    },
}


AI_CHAT_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["answer"],
    "properties": {
        "answer": {"type": "string", "minLength": 2, "maxLength": 4000},
    },
}


STUDY_PACK_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["schema_version", "summary", "keywords", "flashcards", "strategies"],
    "properties": {
        "schema_version": {"type": "string", "enum": ["reviss.study_pack.v1"]},
        "summary": {
            "type": "object",
            "additionalProperties": False,
            "required": ["content", "estimated_reading_minutes"],
            "properties": {
                "content": {"type": "string", "maxLength": 120000},
                "estimated_reading_minutes": {"type": "integer"},
            },
        },
        "keywords": {
            "type": "array",
            "maxItems": 80,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["term", "explanation", "anchor_text"],
                "properties": {
                    "term": {"type": "string", "maxLength": 180},
                    "explanation": {"type": "string", "maxLength": 1200},
                    "anchor_text": {"type": "string", "maxLength": 240},
                },
            },
        },
        "flashcards": {
            "type": "array",
            "maxItems": 140,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["front", "back", "category", "difficulty"],
                "properties": {
                    "front": {"type": "string", "maxLength": 1200},
                    "back": {"type": "string", "maxLength": 1800},
                    "category": {"type": "string", "maxLength": 120},
                    "difficulty": {"type": "string", "enum": ["low", "medium", "high"]},
                },
            },
        },
        "strategies": {
            "type": "array",
            "maxItems": 30,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["title", "description"],
                "properties": {
                    "title": {"type": "string", "maxLength": 180},
                    "description": {"type": "string", "maxLength": 1600},
                },
            },
        },
    },
}


QUIZ_PACK_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["schema_version", "quizzes"],
    "properties": {
        "schema_version": {"type": "string", "enum": ["reviss.quiz_pack.v1"]},
        "quizzes": {
            "type": "array",
            "maxItems": 20,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": [
                    "title",
                    "description",
                    "complexity",
                    "question_type",
                    "questions",
                ],
                "properties": {
                    "title": {"type": "string", "maxLength": 180},
                    "description": {"type": "string", "maxLength": 1000},
                    "complexity": {"type": "string", "enum": ["low", "medium", "high"]},
                    "question_type": {
                        "type": "string",
                        "enum": ["single_choice"],
                    },
                    "questions": {
                        "type": "array",
                        "maxItems": 80,
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["prompt", "type", "options", "explanation"],
                            "properties": {
                                "prompt": {"type": "string", "maxLength": 1600},
                                "type": {
                                    "type": "string",
                                    "enum": ["single_choice", "multiple_choice"],
                                },
                                "options": {
                                    "type": "array",
                                    "minItems": 2,
                                    "maxItems": 8,
                                    "items": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["label", "is_correct"],
                                        "properties": {
                                "label": {
                                    "type": "string",
                                    "maxLength": 600,
                                },
                                            "is_correct": {"type": "boolean"},
                                        },
                                    },
                                },
                                "explanation": {"type": "string", "maxLength": 1600},
                            },
                        },
                    },
                },
            },
        },
    },
}
