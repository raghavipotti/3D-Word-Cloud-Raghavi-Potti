# 3D Word Cloud Visualization

This project is a full‑stack demonstration that fetches a news article from the internet, extracts topics/keywords from the text and renders them as an interactive 3D word cloud in your browser.  It consists of a **Python + FastAPI** backend and a **React + React Three Fiber** frontend.

## Features

- **URL input** – Users can enter the URL of a news article (pre‑populated with a couple of example links for convenience).  The backend will fetch the article and extract meaningful text.
- **Topic extraction** – The backend uses a simple TF‑IDF analysis to identify important words in the article.  The result is returned as a list of word/weight pairs.
- **3D word cloud** – The frontend uses React Three Fiber and the `@react-three/drei` helpers to lay words out on the surface of a sphere.  Words are sized and coloured according to their relative importance and gently rotate in space.  Users can orbit around the cloud with the mouse.
- **End‑to‑end flow** – Everything from fetching the article through to rendering the word cloud happens automatically once the URL is submitted.

## Getting Started

These instructions assume you are on macOS with Node.js and Python installed.  The included `setup.sh` script will install all necessary dependencies and run both the backend and frontend concurrently.

1. **Clone the repo** (or unzip the archive) and change into the root directory:

   ```bash
   git clone <your‑repo-url>
   cd 3D-Word-Cloud-<your_name>
   ```

2. **Run the setup script**:

   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

   The script will:

   - Install Python dependencies defined in `backend/requirements.txt`.
   - Install Node.js dependencies for the frontend in `frontend/`.
   - Install the `concurrently` utility globally (if it is not already installed).
   - Start both the FastAPI backend (`http://localhost:8000`) and the Vite dev server for the frontend (`http://localhost:5173`).

3. **Using the app**:

   - Open your browser and navigate to `http://localhost:5173`.
   - Enter a news article URL (or use one of the provided examples) and click **Analyze**.
   - The application will display an animated 3D word cloud once the analysis is complete.

## Project Structure

```
3D-Word-Cloud-<your_name>/
├── backend/
│   ├── main.py            # FastAPI application with `/analyze` endpoint
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── package.json       # Node.js project configuration
│   ├── vite.config.ts     # Vite build and dev server configuration
│   ├── tsconfig.json      # TypeScript configuration
│   └── src/
│       ├── main.tsx       # Entry point that mounts the React app
│       ├── App.tsx        # Root React component containing the UI logic
│       ├── components/
│       │   └── WordCloud.tsx  # Word cloud component using React Three Fiber
│       ├── App.css        # Basic styling for the app
│       └── index.css      # Global CSS resets
├── setup.sh               # Helper script to install deps and run both servers
└── README.md              # This file
```

## Notes

- The backend currently uses a simple TF‑IDF approach for topic extraction.  Feel free to extend it with more advanced NLP techniques (LDA, BERTopic, etc.).
- CORS is enabled globally in the FastAPI app to allow the React dev server to fetch data.  For production deployments you should restrict this.
- The 3D layout algorithm uses a Fibonacci sphere to distribute words evenly across the sphere’s surface.  Word size and colour are driven by the relative weight returned from the backend.
