from __future__ import annotations

import os
import subprocess
import tempfile
import textwrap
import time
from dataclasses import dataclass
from typing import Callable

RUN_OUTCOME_COMPLETED = "COMPLETED"
RUN_OUTCOME_USER_ERROR = "USER_ERROR"
RUN_OUTCOME_TIMEOUT = "TIMEOUT"
RUN_OUTCOME_RUNNER_ERROR = "RUNNER_ERROR"


@dataclass
class PythonRunResult:
    outcome: str
    stdout: str
    stderr: str
    execution_time_ms: int
    error_message: str | None = None


def _build_memory_limiter(memory_limit_mb: int | None) -> Callable[[], None] | None:
    if not memory_limit_mb or memory_limit_mb <= 0:
        return None

    if os.name != "posix":
        return None

    try:
        import resource
    except ImportError:
        return None

    if not hasattr(resource, "RLIMIT_AS"):
        return None

    limit_bytes = memory_limit_mb * 1024 * 1024

    def set_limits() -> None:
        resource.setrlimit(resource.RLIMIT_AS, (limit_bytes, limit_bytes))

    return set_limits


def run_python_code(
    source_code: str,
    *,
    timeout_seconds: int,
    memory_limit_mb: int | None,
    python_executable: str,
) -> PythonRunResult:
    code = textwrap.dedent(source_code)
    started = time.monotonic()

    try:
        with tempfile.TemporaryDirectory(prefix="code_exec_") as tmp_dir:
            script_path = os.path.join(tmp_dir, "main.py")
            with open(script_path, "w", encoding="utf-8") as file:
                file.write(code)

            completed = subprocess.run(
                [python_executable, script_path],
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                cwd=tmp_dir,
                preexec_fn=_build_memory_limiter(memory_limit_mb),
            )

            duration_ms = int((time.monotonic() - started) * 1000)
            if completed.returncode == 0:
                return PythonRunResult(
                    outcome=RUN_OUTCOME_COMPLETED,
                    stdout=completed.stdout,
                    stderr=completed.stderr,
                    execution_time_ms=duration_ms,
                )

            return PythonRunResult(
                outcome=RUN_OUTCOME_USER_ERROR,
                stdout=completed.stdout,
                stderr=completed.stderr,
                execution_time_ms=duration_ms,
                error_message=f"User code exited with status {completed.returncode}.",
            )
    except subprocess.TimeoutExpired as exc:
        duration_ms = int((time.monotonic() - started) * 1000)
        return PythonRunResult(
            outcome=RUN_OUTCOME_TIMEOUT,
            stdout=exc.stdout if isinstance(exc.stdout, str) else "",
            stderr=exc.stderr if isinstance(exc.stderr, str) else "",
            execution_time_ms=duration_ms,
            error_message=f"Execution timed out after {timeout_seconds} seconds.",
        )
    except Exception as exc:  # pragma: no cover - defensive fallback
        duration_ms = int((time.monotonic() - started) * 1000)
        return PythonRunResult(
            outcome=RUN_OUTCOME_RUNNER_ERROR,
            stdout="",
            stderr="",
            execution_time_ms=duration_ms,
            error_message=f"Runner infrastructure error: {type(exc).__name__}: {exc}",
        )
