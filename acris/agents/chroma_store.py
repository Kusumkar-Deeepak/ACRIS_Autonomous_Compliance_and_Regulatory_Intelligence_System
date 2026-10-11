import hashlib
import logging
import math
import os
import re

import chromadb

from shared import resolve_path


import requests

logger = logging.getLogger(__name__)


class HashingEmbeddingFunction:
    def __init__(self, dimensions: int = 384):
        self.dimensions = dimensions
        self._function_name = "hashing-embedding-v1"

    def name(self) -> str:
        return self._function_name

    def __call__(self, input):
        texts = input if isinstance(input, list) else [input]
        return [self._embed_text(text) for text in texts]

    def _embed_text(self, text: str):
        vector = [0.0] * self.dimensions
        tokens = re.findall(r"[A-Za-z0-9]+", text.lower())

        if not tokens:
            return vector

        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
            bucket = int(digest[:8], 16) % self.dimensions
            vector[bucket] += 1.0

        magnitude = math.sqrt(sum(value * value for value in vector)) or 1.0
        return [value / magnitude for value in vector]


class OllamaEmbeddingFunction:
    def __init__(self, model_name: str = "nomic-embed-text", url: str = "http://localhost:11434/api/embeddings"):
        self._model_name = model_name
        self._url = url
        self._function_name = f"ollama-embedding-{model_name}"

    def name(self) -> str:
        return self._function_name

    def __call__(self, input):
        texts = input if isinstance(input, list) else [input]
        embeddings = []
        for text in texts:
            response = requests.post(
                self._url,
                json={"model": self._model_name, "prompt": text},
                timeout=float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "30")),
            )
            response.raise_for_status()
            embedding = response.json().get("embedding")
            if not embedding:
                raise RuntimeError("Ollama returned an empty embedding")
            embeddings.append(embedding)
        return embeddings


def get_embedding_function():
    provider = os.getenv("EMBEDDING_PROVIDER", "ollama").lower()
    if provider == "hashing":
        return HashingEmbeddingFunction()
    
    model = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
    url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434") + "/api/embeddings"
    return OllamaEmbeddingFunction(model_name=model, url=url)


def get_embedding_version() -> str:
    configured = os.getenv("EMBEDDING_VERSION")
    if configured:
        return configured
    if os.getenv("EMBEDDING_PROVIDER", "ollama").lower() == "hashing":
        return "hashing:v1"
    return f"ollama:{os.getenv('OLLAMA_EMBEDDING_MODEL', 'nomic-embed-text')}:v1"


def get_embedding_model() -> str:
    if os.getenv("EMBEDDING_PROVIDER", "ollama").lower() == "hashing":
        return "hashing"
    return os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")


def validate_embedding_configuration() -> None:
    chat_model = os.getenv("OLLAMA_MODEL", "")
    embedding_model = os.getenv("OLLAMA_EMBEDDING_MODEL", "")
    if chat_model and embedding_model and chat_model == embedding_model:
        logger.warning(
            "OLLAMA_EMBEDDING_MODEL matches OLLAMA_MODEL; use a dedicated embedding model"
        )


PERSIST_DIR = resolve_path(os.getenv("CHROMA_PERSIST_DIR", "./chroma_db"))
client = chromadb.PersistentClient(path=PERSIST_DIR)
validate_embedding_configuration()
collection = client.get_or_create_collection(
    name=os.getenv("CHROMA_COLLECTION_NAME", "company_policies_v2"),
    metadata={"hnsw:space": "cosine"},
    embedding_function=get_embedding_function(),
)


def embed_chunks(chunks: list[dict]) -> None:
    if not chunks:
        return

    required_metadata = {
        "organizationId",
        "documentId",
        "documentVersionId",
        "chunkId",
        "chunkIndex",
        "embeddingModel",
        "embeddingVersion",
        "isCurrentVersion",
        "section",
        "page",
    }
    for chunk in chunks:
        metadata = chunk.get("metadata", {})
        missing = required_metadata - metadata.keys()
        if missing:
            raise ValueError(f"Missing vector metadata: {sorted(missing)}")

    collection.upsert(
        documents=[chunk["text"] for chunk in chunks],
        ids=[
            str(chunk.get("vectorId", chunk["metadata"]["chunkId"]))
            for chunk in chunks
        ],
        metadatas=[chunk["metadata"] for chunk in chunks],
    )


def deactivate_version_vectors(document_version_id: str) -> None:
    existing = collection.get(
        where={"documentVersionId": str(document_version_id)},
        include=["metadatas"],
    )
    ids = existing.get("ids", [])
    metadatas = existing.get("metadatas", [])
    if not ids:
        return

    collection.update(
        ids=ids,
        metadatas=[{**metadata, "isCurrentVersion": False} for metadata in metadatas],
    )


def query_similar(
    organization_id: str,
    text: str,
    embedding_version: str,
    *,
    current_version_only: bool = True,
    k: int = 5,
):
    if not organization_id:
        raise ValueError("organization_id is required")
    if not embedding_version:
        raise ValueError("embedding_version is required")
    if k < 1:
        raise ValueError("k must be at least 1")

    filters = [
        {"organizationId": str(organization_id)},
        {"embeddingVersion": str(embedding_version)},
    ]
    if current_version_only:
        filters.append({"isCurrentVersion": True})

    return collection.query(
        query_texts=[text],
        n_results=k,
        where={"$and": filters},
        include=["documents", "metadatas", "distances"],
    )