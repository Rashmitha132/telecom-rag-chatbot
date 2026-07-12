"""
query.py
--------
Quick test script: given a question, retrieves the most relevant chunks
from ChromaDB (no LLM call, just retrieval) so you can sanity check the
pipeline before wiring it into the chatbot.

Usage:
    python query.py "What is FAF?"
"""

import sys
import chromadb
from llama_index.core import VectorStoreIndex, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore

CHROMA_DIR = "chroma_db"
COLLECTION_NAME = "nokia_testing_docs"


def main():
    if len(sys.argv) < 2:
        print('Usage: python query.py "your question here"')
        sys.exit(1)

    question = sys.argv[1]

    Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
    Settings.llm = None

    chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
    chroma_collection = chroma_client.get_collection(COLLECTION_NAME)
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)

    index = VectorStoreIndex.from_vector_store(vector_store)
    retriever = index.as_retriever(similarity_top_k=3)

    nodes = retriever.retrieve(question)

    print(f"\nQuestion: {question}\n")
    print(f"Top {len(nodes)} retrieved chunks:\n")
    for i, node in enumerate(nodes, 1):
        print(f"--- Chunk {i} (score: {node.score:.3f}) ---")
        print(f"Source: {node.metadata.get('file_name')}")
        print(node.text[:300])
        print()


if __name__ == "__main__":
    main()
