# ACRIS Phase 1

Autonomous Compliance & Regulatory Intelligence System for PDF-upload mode.

## Stack

- Frontend: React + Vite + Tailwind CSS + Axios + React Query
- Backend: Node.js + Express + MongoDB + Mongoose + JWT + Multer
- Agents: Python + LangChain + Ollama + PyMuPDF + ChromaDB + ReportLab

## Local Setup

1. Install Ollama and pull a model:
   - `ollama pull llama3`
2. Start MongoDB locally or point `MONGODB_URI` at Atlas.
3. Start the backend:
   - `cd acris/backend`
   - `npm install`
   - `node server.js`
4. Start the frontend:
   - `cd acris/frontend`
   - `npm install`
   - `npm run dev`
5. Install Python dependencies:
   - `cd acris/agents`
   - `pip install -r requirements.txt`
6. Upload company policy PDFs first via `POST /api/policies/upload`.
7. Upload a regulatory PDF from the dashboard to run the full six-agent pipeline.

## Environment

Use the root `.env` values:

- `MONGODB_URI=mongodb://localhost:27017/acris`
- `JWT_SECRET=your_jwt_secret_here`
- `OLLAMA_MODEL=llama3`
- `OLLAMA_BASE_URL=http://localhost:11434`
- `CHROMA_PERSIST_DIR=./chroma_db`
- `UPLOADS_DIR=./uploads`
- `REPORTS_DIR=./reports`
- `PORT=5000`

## Reference PDF

The included sample PDF lives in `acris/sample_pdfs/ACRIS (1).pdf`, and `read_pdf.py` extracts it into `pdf_content.txt` for reference.
