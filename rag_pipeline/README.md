# Task 2 — RAG Pipeline (MT/SAF/FAF retrieval)

This is a working, testable version of Task 2: the chatbot retrieves relevant
MT/SAF/FAF content from a local vector database (ChromaDB) and uses it to
ground its answers, instead of the LLM answering blind.

Currently loaded with **placeholder content** in `documents/` — swap in real
MT/SAF/FAF descriptions once your team/mentor shares them, and nothing else
needs to change.

## 1. Setup (run once)

```bash
py -3.11 -m venv venv
venv\Scripts\activate        # on Windows
pip install -r requirements.txt
```

The first run will download the `bge-small-en-v1.5` embedding model
(~130MB) from Hugging Face — needs internet the first time only, then it's
cached locally.

## 2. Ingest documents (run whenever documents/ changes)

```bash
python ingest.py
```

This reads every file in `documents/`, chunks it, embeds it with
bge-small-en-v1.5, and stores it in a local `chroma_db/` folder (created
automatically, gitignore this — it's a generated database, not source code).

## 3. Test retrieval only (no LLM needed)

```bash
python query.py "What is FAF?"
```

Confirms the right chunks are being retrieved before you involve the LLM at
all — useful for debugging.

## 4. Test the full RAG chatbot (needs LM Studio running)

Make sure LM Studio's local server is running on port 1234 (same as your
Task 1 setup), then:

```bash
python rag_chat.py
```

Ask it things like "What is MT?" or "How is FAF different from SAF?" — it
will retrieve relevant chunks first, then ask the LLM to answer using only
that context.

## 5. Next step: move this into FastAPI

Once this works standalone, `load_retriever()`, `build_prompt()`, and
`ask_lm_studio()` from `rag_chat.py` move into your FastAPI backend as a
`/chat` endpoint, and your React/HTML frontend calls that endpoint instead
of calling LM Studio directly. That's the bridge from Task 2 into Task 3+.

## Files

| File | Purpose |
|---|---|
| `documents/mt.md`, `saf.md`, `faf.md` | Source content (placeholder — replace with real content) |
| `ingest.py` | Chunks + embeds + stores docs in ChromaDB |
| `query.py` | Tests retrieval only |
| `rag_chat.py` | Full pipeline: retrieve + ask LM Studio |
| `chroma_db/` | Generated vector database (created after running ingest.py) |
