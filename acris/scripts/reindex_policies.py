import os
import sys

# Ensure acris/agents is in sys.path so we can import shared and chroma_store
current_dir = os.path.dirname(os.path.abspath(__file__))
agents_dir = os.path.join(os.path.dirname(current_dir), "agents")
if agents_dir not in sys.path:
    sys.path.append(agents_dir)

from shared import get_db
from chroma_store import collection, embed_chunks, get_embedding_model, get_embedding_version

def main():
    print("Starting policy reindexing script...")
    db = get_db()
    
    versions = list(db.companydocumentversions.find({"isCurrent": True}))
    print(f"Found {len(versions)} current document versions to reindex.")

    for version in versions:
        document = db.companydocuments.find_one({"_id": version["documentId"]})
        if not document:
            continue

        chunks = list(db.documentchunks.find({"documentVersionId": version["_id"]}).sort("chunkIndex", 1))
        vector_chunks = []
        for chunk in chunks:
            vector_chunks.append({
                "text": chunk.get("text", ""),
                "metadata": {
                    "name": document.get("name", "Untitled"),
                    "organizationId": str(document["organizationId"]),
                    "documentId": str(document["_id"]),
                    "documentVersionId": str(version["_id"]),
                    "chunkId": str(chunk["_id"]),
                    "chunkIndex": chunk.get("chunkIndex", 0),
                    "section": chunk.get("section", ""),
                    "page": chunk.get("page") if chunk.get("page") is not None else -1,
                    "embeddingModel": get_embedding_model(),
                    "embeddingVersion": get_embedding_version(),
                    "isCurrentVersion": True,
                },
            })
        embed_chunks(vector_chunks)
        db.documentchunks.update_many(
            {"documentVersionId": version["_id"]},
            {"$set": {"embeddingModel": get_embedding_model(), "embeddingVersion": get_embedding_version()}},
        )

    print("Reindexing complete!")

if __name__ == "__main__":
    main()
