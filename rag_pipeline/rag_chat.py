"""
rag_chat.py
-----------
The core Task 2 logic: given a user question, retrieve relevant chunks from
ChromaDB, then send both the question AND the retrieved context to your
local LLM (via LM Studio) so it answers grounded in MT/SAF/FAF docs instead
of guessing.

This is a CLI test version. Once this works, the same retrieve() +
build_prompt() logic gets moved into your FastAPI backend and called from
your React/HTML frontend instead of this terminal loop.

Prerequisites:
    - LM Studio running locally with the server started on port 1234
      (same as your Task 1 setup)
    - ingest.py already run at least once (so chroma_db/ exists)

Usage:
    python rag_chat.py
"""

import requests
import chromadb
from llama_index.core import VectorStoreIndex, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore

CHROMA_DIR = "chroma_db"
COLLECTION_NAME = "nokia_testing_docs"
LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions"


def load_retriever():
    Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
    Settings.llm = None

    chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
    chroma_collection = chroma_client.get_collection(COLLECTION_NAME)
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    index = VectorStoreIndex.from_vector_store(vector_store)
    return index.as_retriever(similarity_top_k=3)


def build_prompt(question, retrieved_chunks):
    context_text = "\n\n".join(
        f"[Source: {c.metadata.get('file_name')}]\n{c.text}"
        for c in retrieved_chunks
    )

    prompt = f"""You are a helpful assistant that explains Nokia's ABC testing \
frameworks (MT, SAF, FAF) to customers. Answer the question using ONLY the \
context below. If the context doesn't contain the answer, say you don't have \
that information yet rather than guessing.

Context:
{context_text}

Question: {question}

Answer:"""
    return prompt


def ask_lm_studio(prompt):
    response = requests.post(
        LM_STUDIO_URL,
        json={
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
        },
        timeout=120,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


def main():
    retriever = load_retriever()
    print("RAG chatbot ready. Type a question (or 'quit' to exit).\n")

    while True:
        question = input("You: ").strip()
        if question.lower() in ("quit", "exit"):
            break
        if not question:
            continue

        chunks = retriever.retrieve(question)
        prompt = build_prompt(question, chunks)

        try:
            answer = ask_lm_studio(prompt)
        except requests.exceptions.ConnectionError:
            print("\n[Error] Couldn't reach LM Studio at "
                  f"{LM_STUDIO_URL}. Make sure LM Studio's local server "
                  "is running (same setup as Task 1).\n")
            continue

        print(f"\nBot: {answer}\n")


if __name__ == "__main__":
    main()
