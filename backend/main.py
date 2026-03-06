"""
FastAPI application for extracting topics from a news article and returning
word/weight pairs suitable for a 3D word cloud.  The app exposes a single
endpoint at `/analyze` which accepts a JSON payload of the form

    { "url": "<article_url>" }

and returns a JSON response of the form

    { "words": [ { "word": "example", "weight": 0.9 }, ... ] }

Weights are normalised between 0 and 1.  A simple TF–IDF analysis is used
to rank words.  Words are extracted from `<p>` tags and cleaned of scripts,
styles and other extraneous markup.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup
import re
from typing import List, Dict, Any, Optional
from requests.exceptions import SSLError
from urllib.parse import urlparse
import xml.etree.ElementTree as ET
from html import unescape

# Topic modelling libraries.  scikit‑learn is used for a simple TF‑IDF approach.
from sklearn.feature_extraction.text import TfidfVectorizer

try:
    import nltk
    from nltk.corpus import stopwords
except ImportError:
    # If nltk isn't installed the import will fail; users may choose to
    # install it manually or leave stopwords blank.  See requirements.txt.
    nltk = None
    stopwords = None  # type: ignore


class AnalyzeRequest(BaseModel):
    """Model for incoming analyze requests."""

    url: str


def _google_news_fallback_text(source_url: str, headers: Dict[str, str]) -> str:
    """Build analyzable text from Google News RSS when direct article fetch is blocked."""
    parsed = urlparse(source_url)
    host = parsed.netloc.replace("www.", "")
    path_hint = parsed.path.strip("/").split("/")[0] if parsed.path.strip("/") else ""
    q = f"site:{host}"
    if path_hint:
        q += f" {path_hint}"
    rss_url = (
        "https://news.google.com/rss/search?"
        f"q={q.replace(' ', '+')}&hl=en-US&gl=US&ceid=US:en"
    )
    feed = requests.get(rss_url, timeout=15, headers=headers, allow_redirects=True)
    if feed.status_code != 200 or not feed.text.strip():
        return ""
    chunks: List[str] = []
    try:
        root = ET.fromstring(feed.text)
        items = root.findall(".//item")[:40]
        for item in items:
            title_el = item.find("title")
            desc_el = item.find("description")
            title = (title_el.text or "").strip() if title_el is not None else ""
            desc = (desc_el.text or "").strip() if desc_el is not None else ""
            # Remove markup from RSS description payload.
            desc = re.sub(r"<[^>]+>", " ", unescape(desc))
            snippet = re.sub(r"\s+", " ", f"{title}. {desc}").strip()
            if snippet:
                chunks.append(snippet)
    except ET.ParseError:
        return ""
    return re.sub(r"\s+", " ", " ".join(chunks)).strip()


def extract_article_text(url: str) -> str:
    """Fetch a web page and attempt to extract meaningful article text.

    This function uses `requests` to download the page and BeautifulSoup to
    parse the HTML.  It attempts to gather text from `<p>` tags first; if
    nothing meaningful is found it falls back to all text on the page.  It
    also removes scripts, styles, noscript tags, headers and footers.

    Args:
        url: The URL to fetch.

    Returns:
        A single string containing the cleaned article text.

    Raises:
        HTTPException: If the page cannot be fetched or contains no text.
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/123.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }
    def _safe_get(target: str, timeout: int = 10) -> Optional[requests.Response]:
        try:
            return requests.get(target, timeout=timeout, headers=headers, allow_redirects=True)
        except SSLError:
            # Some environments (corporate proxies/self-signed chains) break TLS verification.
            # Retry without certificate verification so local demos continue to work.
            return requests.get(target, timeout=timeout, headers=headers, allow_redirects=True, verify=False)
        except Exception:
            return None

    response = _safe_get(url, timeout=10)
    if response is None:
        raise HTTPException(status_code=500, detail="Failed to fetch URL")

    if response.status_code != 200:
        # Reuters often blocks bot traffic (401/403). Fall back to Reuters headlines via RSS.
        host = urlparse(url).netloc.lower()
        if "reuters.com" in host and response.status_code in (401, 403):
            fallback_text = _google_news_fallback_text(url, headers)
            if fallback_text:
                return fallback_text
        # Fallback: fetch readable mirror text for sites that block direct scraping.
        parsed = urlparse(url)
        stripped = f"{parsed.netloc}{parsed.path or ''}"
        if parsed.query:
            stripped += f"?{parsed.query}"
        fallback_urls = [
            f"https://r.jina.ai/http://{stripped}",
            f"https://r.jina.ai/https://{stripped}",
        ]
        for fallback_url in fallback_urls:
            fallback = _safe_get(fallback_url, timeout=15)
            if fallback is not None and fallback.status_code == 200 and fallback.text.strip():
                text = re.sub(r"\s+", " ", fallback.text).strip()
                if text:
                    return text
        raise HTTPException(
            status_code=502,
            detail=(
                f"Target site returned status {response.status_code}. "
                "Try another public article URL; some sites block automated fetches."
            ),
        )

    soup = BeautifulSoup(response.content, "html.parser")
    # Remove unwanted tags
    for tag in soup(["script", "style", "noscript", "header", "footer"]):
        tag.decompose()

    paragraphs = [p.get_text(separator=" ", strip=True) for p in soup.find_all("p")]
    text = " ".join([p for p in paragraphs if p])
    if not text:
        # Fallback to all visible text
        text = soup.get_text(separator=" ", strip=True)
    text = re.sub(r"\s+", " ", text)
    if not text:
        raise HTTPException(status_code=400, detail="No text found in the provided article.")
    return text


def compute_tfidf_weights(text: str, max_features: int = 50) -> List[Dict[str, float]]:
    """Perform a simple TF–IDF analysis on the supplied text and return weighted words.

    The text is split into sentences (using simple punctuation delimiters) and
    provided to scikit‑learn's `TfidfVectorizer`.  Words are stemmed
    implicitly via the default tokeniser.  Stop words are removed if NLTK is
    available.  The top `max_features` words (by TF–IDF score) are returned
    with scores normalised to the range [0, 1].

    Args:
        text: The article text to analyse.
        max_features: The maximum number of distinct words to return.

    Returns:
        A list of dictionaries with keys `word` and `weight`.
    """
    # Determine stop words
    if stopwords is not None:
        try:
            nltk.download("stopwords", quiet=True)
            sw = set(stopwords.words("english"))
        except Exception:
            sw = set()
    else:
        sw = set()

    # Split into documents – at least two are needed for TF–IDF
    sentences = re.split(r"[.!?]", text)
    documents = [s.strip() for s in sentences if s.strip()]
    if len(documents) < 2:
        documents = [text]

    vectorizer = TfidfVectorizer(
        stop_words=sorted(sw) if sw else None,
        max_features=max_features,
    )
    tfidf_matrix = vectorizer.fit_transform(documents)
    scores = tfidf_matrix.sum(axis=0).A1  # sum across documents
    words = vectorizer.get_feature_names_out()
    pairs = sorted(zip(words, scores), key=lambda x: x[1], reverse=True)
    if not pairs:
        return []
    max_score = pairs[0][1] or 1.0  # avoid divide‑by‑zero
    result = [
        {"word": str(word), "weight": float(round(float(score) / max_score, 3))}
        for word, score in pairs
    ]
    return result


app = FastAPI(title="News Article Topic Extractor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In development we allow all origins; restrict in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/analyze")
async def analyze(request: AnalyzeRequest) -> Dict[str, List[Dict[str, Any]]]:
    """Analyse the article at the given URL and return a list of weighted words.

    Args:
        request: An instance of `AnalyzeRequest` containing the URL to fetch.

    Returns:
        A dictionary with a single key `words` mapping to the list of word/weight pairs.
    """
    url = request.url
    if not url:
        raise HTTPException(status_code=400, detail="No URL provided")
    article_text = extract_article_text(url)
    weighted_words = compute_tfidf_weights(article_text, max_features=50)
    return {"words": weighted_words}


@app.get("/")
async def root() -> Dict[str, str]:
    """Simple health‑check endpoint."""
    return {"message": "Backend is running"}
