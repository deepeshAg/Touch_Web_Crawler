![Screenshot 2025-05-31 at 12 01 58 AM](https://github.com/user-attachments/assets/b24d6090-2fe7-4f7b-aa42-6ab9a08ce1d2)

# Touch AI Research Assistant

A modern, web-enabled AI research assistant with real-time web search, citation, and synthesis capabilities. Built with a Next.js + Tailwind frontend and a FastAPI + LangChain backend.
 
---

## Features

<p align="">
  <img src="https://github.com/user-attachments/assets/a936dfb8-028c-4e5e-a05d-b2f74e219836" alt="touch" />
</p>

- **Conversational UI**: Chat with an AI that researches your queries in real time
- **Web Search & Scraping**: Uses Tavily/SerpAPI for up-to-date information
- **Cited Answers**: Every answer includes sources and research steps
- **Markdown Rendering**: Beautiful, readable answers with code, tables, and more
- **Modern UI**: Responsive, dark-mode friendly, and mobile-ready

---

## Tech Stack
- **Frontend**: Next.js, React, Tailwind CSS, Framer Motion
- **Backend**: FastAPI, LangChain, OpenAI, Tavily, SerpAPI, BeautifulSoup

---

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/Touch_Web_Crawler.git
cd Touch_Web_Crawler

```

### 2. Setup the Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

- Create a `.env` file in the `backend` directory:
  ```env
  OPENAI_API_KEY=your_openai_api_key
  TAVILY_API_KEY=your_tavily_api_key
  SERP_API_KEY=your_serp_api_key
  DEBUG=True
  ```
- Start the backend:
  ```bash
  uvicorn app.main:app --reload
  ```

### 3. Setup the Frontend
```bash
cd ../frontend
npm install
npm run dev
```

- The frontend will run at [http://localhost:3000](http://localhost:3000)
- The backend will run at [http://localhost:8000](http://localhost:8000)

---

## Usage
- Open the frontend in your browser
- Ask any research question
- Get answers with sources, research steps, and confidence scores

---

## License
MIT 
