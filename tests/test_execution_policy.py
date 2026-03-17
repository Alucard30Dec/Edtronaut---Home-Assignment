from datetime import datetime, timedelta, timezone
import unittest

from app.core.execution_policy import (
    build_transition_plan,
    calculate_retry_after_seconds,
    is_language_allowed,
    source_size_bytes,
)


class ExecutionPolicyTestCase(unittest.TestCase):
    def test_runner_error_retries_under_limit(self) -> None:
        plan = build_transition_plan(
            outcome="RUNNER_ERROR",
            retry_count=0,
            max_infra_retries=1,
        )
        self.assertEqual(plan.next_status, "QUEUED")
        self.assertTrue(plan.should_retry)
        self.assertTrue(plan.is_infrastructure_failure)

    def test_runner_error_stops_retry_at_limit(self) -> None:
        plan = build_transition_plan(
            outcome="RUNNER_ERROR",
            retry_count=1,
            max_infra_retries=1,
        )
        self.assertEqual(plan.next_status, "FAILED")
        self.assertFalse(plan.should_retry)
        self.assertTrue(plan.is_infrastructure_failure)

    def test_user_error_does_not_retry(self) -> None:
        plan = build_transition_plan(
            outcome="USER_ERROR",
            retry_count=0,
            max_infra_retries=2,
        )
        self.assertEqual(plan.next_status, "FAILED")
        self.assertFalse(plan.should_retry)
        self.assertFalse(plan.is_infrastructure_failure)

    def test_rate_limit_remaining_seconds(self) -> None:
        now = datetime.now(timezone.utc)
        last_queued_at = now - timedelta(seconds=1)
        remaining = calculate_retry_after_seconds(
            last_queued_at=last_queued_at,
            now=now,
            min_interval_seconds=3,
            now_monotonic=10.0,
            monotonic_clock=lambda: 10.0,
        )
        self.assertAlmostEqual(remaining, 2.0, places=3)

    def test_rate_limit_subsecond_precision_not_floored(self) -> None:
        now = datetime.now(timezone.utc)
        last_queued_at = now - timedelta(seconds=0.25)
        remaining = calculate_retry_after_seconds(
            last_queued_at=last_queued_at,
            now=now,
            min_interval_seconds=1,
            now_monotonic=100.0,
            monotonic_clock=lambda: 100.0,
        )
        self.assertGreater(remaining, 0.7)
        self.assertLess(remaining, 0.8)

    def test_rate_limit_returns_zero_after_window(self) -> None:
        now = datetime.now(timezone.utc)
        last_queued_at = now - timedelta(seconds=1.01)
        remaining = calculate_retry_after_seconds(
            last_queued_at=last_queued_at,
            now=now,
            min_interval_seconds=1,
            now_monotonic=5.0,
            monotonic_clock=lambda: 5.0,
        )
        self.assertEqual(remaining, 0.0)

    def test_rate_limit_uses_monotonic_clock_progress(self) -> None:
        now = datetime.now(timezone.utc)
        last_queued_at = now - timedelta(seconds=0.3)
        ticks = iter([50.0, 50.2])

        remaining = calculate_retry_after_seconds(
            last_queued_at=last_queued_at,
            now=now,
            min_interval_seconds=1,
            monotonic_clock=lambda: next(ticks),
        )
        self.assertAlmostEqual(remaining, 0.5, places=3)

    def test_language_allowlist_and_source_size(self) -> None:
        self.assertTrue(is_language_allowed("Python", ("python",)))
        self.assertFalse(is_language_allowed("javascript", ("python",)))
        self.assertEqual(source_size_bytes("print('hi')"), len("print('hi')".encode("utf-8")))


if __name__ == "__main__":
    unittest.main()
