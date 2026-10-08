import re
import unicodedata
from typing import Optional

BLOCKED_MESSAGE = "[تم حجب معلومات التواصل المباشر لحماية الاتفاقية]"

_ARABIC_NUMBER_WORDS = {
    "صفر": "0",
    "واحد": "1",
    "واحدة": "1",
    "اثنين": "2",
    "اثنان": "2",
    "ثلاثة": "3",
    "ثلاثه": "3",
    "اربعة": "4",
    "أربعة": "4",
    "خمسة": "5",
    "سته": "6",
    "ستة": "6",
    "سبعة": "7",
    "سبعه": "7",
    "ثمانية": "8",
    "ثمانيه": "8",
    "تسعة": "9",
    "تسعه": "9",
}
_PHONE_PATTERN = re.compile(r"(?<!\d)(?:\+?964[\s().-]*)?0?7(?:[\s().-]*\d){9}(?!\d)")
_DOMAIN_PATTERN = re.compile(
    r"(?i)(?:https?://|www\.)\S+|(?<![\w@])(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|ly|me)(?:/\S*)?"
)
_HANDLE_PATTERN = re.compile(r"(?<![\w.])@[A-Za-z0-9_.]{2,}")
_SOCIAL_PATTERN = re.compile(
    r"(?i)\b(?:whats?app|telegram|viber|facebook|instagram|snapchat|"
    r"واتساب|وتساب|تلغرام|تليجرام|فايبر|فيسبوك|انستغرام|إنستغرام|سناب(?:شات)?)\b"
)
_NUMBER_WORD_PATTERN = re.compile(
    r"(?<!\w)(" + "|".join(re.escape(word) for word in sorted(_ARABIC_NUMBER_WORDS, key=len, reverse=True)) + r")(?!\w)"
)


def _ascii_digits(text: str) -> str:
    translated = "".join(
        str(unicodedata.digit(character)) if character.isdigit() else character
        for character in text
    )
    return translated.translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789"))


def detect_contact_violation(message: str) -> Optional[str]:
    """Return a concise moderation category without retaining the supplied text."""
    if _PHONE_PATTERN.search(_ascii_digits(message)):
        return "Attempted phone number sharing in chat"

    spelled_digits = _NUMBER_WORD_PATTERN.sub(
        lambda match: _ARABIC_NUMBER_WORDS[match.group(1)],
        message,
    )
    if _PHONE_PATTERN.search(_ascii_digits(spelled_digits)):
        return "Attempted phone number sharing in chat"

    if _HANDLE_PATTERN.search(message) or _SOCIAL_PATTERN.search(message):
        return "Attempted social media contact sharing in chat"
    if _DOMAIN_PATTERN.search(message):
        return "External link detected"
    return None
