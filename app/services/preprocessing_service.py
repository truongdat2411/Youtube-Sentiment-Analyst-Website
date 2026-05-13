import re
import unicodedata


URL_PATTERN = re.compile(r"https?://\S+|www\.\S+")
EMOJI_PATTERN = re.compile(
    "["
    "\U0001F300-\U0001F5FF"
    "\U0001F600-\U0001F64F"
    "\U0001F680-\U0001F6FF"
    "\U0001F700-\U0001F77F"
    "\U0001F780-\U0001F7FF"
    "\U0001F800-\U0001F8FF"
    "\U0001F900-\U0001F9FF"
    "\U0001FA00-\U0001FA6F"
    "\U0001FA70-\U0001FAFF"
    "\u2600-\u26FF"
    "\u2700-\u27BF"
    "]+",
    flags=re.UNICODE,
)
SPECIAL_CHAR_PATTERN = re.compile(r"[^0-9a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s]")
MULTI_SPACE_PATTERN = re.compile(r"\s+")


def normalize_unicode(text: str) -> str:
    return unicodedata.normalize("NFC", text)


def lowercase_text(text: str) -> str:
    return text.lower()


def remove_urls(text: str) -> str:
    return URL_PATTERN.sub(" ", text)


def remove_emojis(text: str) -> str:
    return EMOJI_PATTERN.sub(" ", text)


def remove_special_characters(text: str) -> str:
    return SPECIAL_CHAR_PATTERN.sub(" ", text)


def normalize_whitespace(text: str) -> str:
    return MULTI_SPACE_PATTERN.sub(" ", text).strip()


def simple_vi_tokenize(text: str) -> str:
    """
    Optional lightweight tokenization placeholder for Vietnamese text.
    This keeps compatibility without forcing extra tokenizer dependencies.
    """
    return " ".join(text.split())


def preprocess_comment(text: str, enable_tokenization: bool = False) -> str:
    cleaned = normalize_unicode(text)
    cleaned = lowercase_text(cleaned)
    cleaned = remove_urls(cleaned)
    cleaned = remove_emojis(cleaned)
    cleaned = remove_special_characters(cleaned)
    cleaned = normalize_whitespace(cleaned)

    if enable_tokenization:
        cleaned = simple_vi_tokenize(cleaned)
        cleaned = normalize_whitespace(cleaned)

    return cleaned


def preprocess_comments_batch(texts: list[str], enable_tokenization: bool = False) -> list[str]:
    return [preprocess_comment(text, enable_tokenization=enable_tokenization) for text in texts]
