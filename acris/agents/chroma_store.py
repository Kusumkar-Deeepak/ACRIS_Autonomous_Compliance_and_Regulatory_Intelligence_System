import hashlib
import math
import os
import re

import chromadb

from shared import PROJECT_ROOT, resolve_path


import requests

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
            try:
                response = requests.post(self._url, json={"model": self._model_name, "prompt": text})
                if response.status_code == 200:
                    embeddings.append(response.json().get("embedding", [0.0] * 768))
                else:
                    embeddings.append([0.0] * 768)
            except Exception:
                embeddings.append([0.0] * 768)
        return embeddings


def get_embedding_function():
    provider = os.getenv("EMBEDDING_PROVIDER", "ollama").lower()
    if provider == "hashing":
        return HashingEmbeddingFunction()
    
    model = os.getenv("OLLAMA_MODEL", "llama3")
    url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434") + "/api/embeddings"
    return OllamaEmbeddingFunction(model_name=model, url=url)


PERSIST_DIR = resolve_path(os.getenv("CHROMA_PERSIST_DIR", "./chroma_db"))
client = chromadb.PersistentClient(path=PERSIST_DIR)
collection = client.get_or_create_collection(
    name="company_policies",
    metadata={"hnsw:space": "cosine"},
    embedding_function=get_embedding_function(),
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