import os
import sys

# Ensure acris/agents is in sys.path so we can import shared and chroma_store
current_dir = os.path.dirname(os.path.abspath(__file__))
agents_dir = os.path.join(os.path.dirname(current_dir), "agents")
if agents_dir not in sys.path:
    sys.path.append(agents_dir)

from shared import get_db
from chroma_store import embed_document, collection

def main():
    print("Starting policy reindexing script...")
    db = get_db()
    
    # First, let's clear the old collection.
    # Note: ChromaDB might not have a simple truncate, so deleting all items by getting their IDs
    print("Clearing old embeddings...")
    existing_data = collection.get()
    ids_to_delete = existing_data.get("ids", [])
    if ids_to_delete:
        collection.delete(ids=ids_to_delete)
        print(f"Deleted {len(ids_to_delete)} old embeddings.")
    else:
        print("No old embeddings found.")

    docs = list(db.companydocs.find({"content_text": {"$exists": True, "$ne": ""}}))
    print(f"Found {len(docs)} documents to reindex.")
    
    for doc in docs:
        doc_id = str(doc["_id"])
        name = doc.get("name", "Untitled")
        text = doc.get("content_text", "")
        
        print(f"Embedding document: {name} ({doc_id})")
        # embed_document calls the currently configured EMBEDDING_PROVIDER
        embed_document(doc_id=doc_id, doc_name=name, text=text)

    print("Reindexing complete!")

if __name__ == "__main__":
    main()
