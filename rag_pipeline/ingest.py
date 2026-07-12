"""
ingest.py
---------
Reads MT/SAF/FAF documents, chunks them, generates embeddings with
bge-small-en-v1.5, and stores everything in a local ChromaDB vector store.

Run this whenever documents change (new content, edits, etc.).

Usage:
    python ingest.py
"""

import os
import chromadb
from llama_index.core import (
    SimpleDirectoryReader,
    VectorStoreIndex,
    StorageContext,
    Settings,
)
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore

DOCS_DIR = os.path.join(os.path.dirname(__file__), "documents")
CHROMA_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
COLLECTION_NAME = "nokia_testing_docs"


def main():
    print(f"Loading documents from: {DOCS_DIR}")
    documents = SimpleDirectoryReader(DOCS_DIR).load_data()
    print(f"Loaded {len(documents)} document(s).")

    # Embedding model — lightweight, runs fine on CPU-only laptops
    print("Loading embedding model (bge-small-en-v1.5)...")
    Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")

    # We don't need an LLM here, only embeddings — avoid llama-index
    # trying to default to OpenAI.
    Settings.llm = None

    # Set up persistent local ChromaDB
    chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
    chroma_collection = chroma_client.get_or_create_collection(COLLECTION_NAME)
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    print("Building index (chunking + embedding + storing)...")
    index = VectorStoreIndex.from_documents(
        documents,
        storage_context=storage_context,
    )

    print(f"Done. Index stored at: {CHROMA_DIR}")
    print(f"Collection '{COLLECTION_NAME}' now has "
          f"{chroma_collection.count()} chunks.")


if __name__ == "__main__":
    main()
