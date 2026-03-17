import unittest

from app.runners.python_runner import (
    RUN_OUTCOME_COMPLETED,
    RUN_OUTCOME_TIMEOUT,
    RUN_OUTCOME_USER_ERROR,
    run_python_code,
)


class PythonRunnerTestCase(unittest.TestCase):
    def test_successful_execution(self) -> None:
        result = run_python_code(
            "print('hello from runner')",
            timeout_seconds=2,
            memory_limit_mb=256,
            python_executable="python3",
        )
        self.assertEqual(result.outcome, RUN_OUTCOME_COMPLETED)
        self.assertIn("hello from runner", result.stdout)
        self.assertEqual(result.stderr, "")

    def test_runtime_error_execution(self) -> None:
        result = run_python_code(
            "raise ValueError('boom')",
            timeout_seconds=2,
            memory_limit_mb=256,
            python_executable="python3",
        )
        self.assertEqual(result.outcome, RUN_OUTCOME_USER_ERROR)
        self.assertIn("ValueError", result.stderr)

    def test_timeout_execution(self) -> None:
        result = run_python_code(
            "while True:\n    pass",
            timeout_seconds=1,
            memory_limit_mb=256,
            python_executable="python3",
        )
        self.assertEqual(result.outcome, RUN_OUTCOME_TIMEOUT)


if __name__ == "__main__":
    unittest.main()
