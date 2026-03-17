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
        )
        self.assertGreaterEqual(remaining, 1)

    def test_language_allowlist_and_source_size(self) -> None:
        self.assertTrue(is_language_allowed("Python", ("python",)))
        self.assertFalse(is_language_allowed("javascript", ("python",)))
        self.assertEqual(source_size_bytes("print('hi')"), len("print('hi')".encode("utf-8")))


if __name__ == "__main__":
    unittest.main()
