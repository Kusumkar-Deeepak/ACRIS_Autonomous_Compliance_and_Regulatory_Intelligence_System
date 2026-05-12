import hashlib
import math
import os
import re

import chromadb

from shared import PROJECT_ROOT, resolve_path


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


PERSIST_DIR = resolve_path(os.getenv("CHROMA_PERSIST_DIR", "./chroma_db"))
client = chromadb.PersistentClient(path=PERSIST_DIR)
collection = client.get_or_create_collection(
    name="company_policies",
    metadata={"hnsw:space": "cosine"},
    embedding_function=HashingEmbeddingFunction(),
)


def embed_document(doc_id: str, doc_name: str, text: str, extra_metadata: dict | None = None):
    metadata = {"name": doc_name, "doc_id": doc_id}
    if extra_metadata:
        metadata.update(extra_metadata)

    collection.upsert(
        documents=[text],
        ids=[doc_id],
        metadatas=[metadata],
    )


def query_similar(text: str, n_results: int = 5):
    return collection.query(
        query_texts=[text],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
    )