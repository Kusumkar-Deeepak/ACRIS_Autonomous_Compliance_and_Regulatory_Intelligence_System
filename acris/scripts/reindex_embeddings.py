"""Re-index current policy versions into a new embedding generation.

The command is intentionally additive: vectors from the previous generation
remain available for historical evidence, while normal retrieval stays pinned
to EMBEDDING_VERSION until an operator changes that setting.
"""

import argparse
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
agents_dir = os.path.join(os.path.dirname(current_dir), "agents")
if agents_dir not in sys.path:
    sys.path.append(agents_dir)

from chroma_store import (  # noqa: E402
    embed_chunks,
    get_embedding_model,
    get_embedding_version,
)
from shared import get_db, object_id  # noqa: E402


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--organization-id")
    return parser.parse_args()


def main():
    args = parse_args()
    embedding_version = get_embedding_version()
    embedding_model = get_embedding_model()
    db = get_db()

    version_filter = {"isCurrent": True}
    if args.organization_id:
        version_filter["organizationId"] = object_id(args.organization_id)

    processed = 0
    for version in db.companydocumentversions.find(version_filter):
        document = db.companydocuments.find_one(
            {
                "_id": version["documentId"],
                "organizationId": version["organizationId"],
            }
        )
        if not document:
            raise RuntimeError(f"Document not found for version {version['_id']}")

        chunks = list(
            db.documentchunks.find(
                {
                    "organizationId": version["organizationId"],
                    "documentId": document["_id"],
                    "documentVersionId": version["_id"],
                }
            ).sort("chunkIndex", 1)
        )
        vector_chunks = []
        for chunk in chunks:
            chunk_id = str(chunk["_id"])
            vector_chunks.append(
                {
                    "vectorId": f"{chunk_id}:{embedding_version}",
                    "text": chunk.get("text", ""),
                    "metadata": {
                        "name": document["name"],
                        "organizationId": str(version["organizationId"]),
                        "documentId": str(document["_id"]),
                        "documentVersionId": str(version["_id"]),
                        "chunkId": chunk_id,
                        "chunkIndex": chunk["chunkIndex"],
                        "section": chunk.get("section", ""),
                        "page": chunk.get("page") if chunk.get("page") is not None else -1,
                        "embeddingModel": embedding_model,
                        "embeddingVersion": embedding_version,
                        "isCurrentVersion": True,
                    },
                }
            )

        if vector_chunks:
            embed_chunks(vector_chunks)
            db.documentchunks.update_many(
                {
                    "organizationId": version["organizationId"],
                    "documentVersionId": version["_id"],
                },
                {
                    "$set": {
                        "embeddingModel": embedding_model,
                        "embeddingVersion": embedding_version,
                    }
                },
            )
        processed += 1

    print(f"Re-indexed {processed} current document versions with {embedding_version}")


if __name__ == "__main__":
    main()
