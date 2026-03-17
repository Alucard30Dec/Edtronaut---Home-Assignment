from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class TransitionPlan:
    next_status: str
    should_retry: bool
    is_infrastructure_failure: bool


def build_transition_plan(
    *,
    outcome: str,
    retry_count: int,
    max_infra_retries: int,
) -> TransitionPlan:
    if outcome == "COMPLETED":
        return TransitionPlan(
            next_status="COMPLETED",
            should_retry=False,
            is_infrastructure_failure=False,
        )

    if outcome == "TIMEOUT":
        return TransitionPlan(
            next_status="TIMEOUT",
            should_retry=False,
            is_infrastructure_failure=False,
        )

    if outcome == "USER_ERROR":
        return TransitionPlan(
            next_status="FAILED",
            should_retry=False,
            is_infrastructure_failure=False,
        )

    if outcome == "RUNNER_ERROR":
        if retry_count < max_infra_retries:
            return TransitionPlan(
                next_status="QUEUED",
                should_retry=True,
                is_infrastructure_failure=True,
            )

        return TransitionPlan(
            next_status="FAILED",
            should_retry=False,
            is_infrastructure_failure=True,
        )

    return TransitionPlan(
        next_status="FAILED",
        should_retry=False,
        is_infrastructure_failure=True,
    )


def is_language_allowed(language: str, allowed_languages: tuple[str, ...]) -> bool:
    normalized_language = language.strip().lower()
    normalized_allowlist = tuple(item.strip().lower() for item in allowed_languages)
    return normalized_language in normalized_allowlist


def source_size_bytes(source_code: str) -> int:
    return len(source_code.encode("utf-8"))


def calculate_retry_after_seconds(
    *,
    last_queued_at: datetime | None,
    now: datetime,
    min_interval_seconds: float,
    now_monotonic: float | None = None,
    monotonic_clock: Callable[[], float] = time.monotonic,
) -> float:
    if min_interval_seconds <= 0 or last_queued_at is None:
        return 0.0

    if last_queued_at.tzinfo is None:
        last_queued_at = last_queued_at.replace(tzinfo=timezone.utc)

    elapsed_seconds = max(0.0, (now - last_queued_at).total_seconds())
    remaining_seconds = float(min_interval_seconds) - elapsed_seconds
    if remaining_seconds <= 0:
        return 0.0

    reference_monotonic = now_monotonic if now_monotonic is not None else monotonic_clock()
    deadline_monotonic = reference_monotonic + remaining_seconds
    return max(0.0, deadline_monotonic - monotonic_clock())
