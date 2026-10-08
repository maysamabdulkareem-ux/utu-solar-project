from typing import Literal

VerificationStatus = Literal["pending", "identity_verified", "verified", "rejected"]


def verification_tier(status: str) -> int:
    if status == "verified":
        return 2
    if status == "identity_verified":
        return 1
    return 0


def can_submit_quotes(status: str) -> bool:
    return verification_tier(status) >= 1


def is_gold_verified(status: str) -> bool:
    return verification_tier(status) >= 2
