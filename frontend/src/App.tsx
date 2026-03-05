import React, { useMemo, useState } from 'react';
import axios from 'axios';
import WordCloudScene from './components/WordCloud';
import './App.css';

interface WordData {
  word: string;
  weight: number;
}

interface ResponseData {
  words: WordData[];
}

interface SampleSource {
  label: string;
  url: string;
}

const sampleSources: SampleSource[] = [
  { label: 'Guardian World', url: 'https://www.theguardian.com/world' },
  { label: 'Wikipedia AI', url: 'https://en.wikipedia.org/wiki/Artificial_intelligence' },
  { label: 'Reuters World', url: 'https://www.reuters.com/world/' },
];

function extractDomain(input: string): string {
  try {
    return new URL(input).hostname.replace('www.', '');
  } catch {
    return 'No domain';
  }
}

export default function App() {
  const [url, setUrl] = useState<string>(sampleSources[0].url);
  const [loading, setLoading] = useState<boolean>(false);
  const [words, setWords] = useState<WordData[]>([]);
  const [error, setError] = useState<string>('');

  const topWords = useMemo(() => words.slice(0, 8), [words]);
  const leadWord = topWords[0];
  const avgWeight = useMemo(() => {
    if (!words.length) return 0;
    const sum = words.reduce((total, item) => total + item.weight, 0);
    return Math.round((sum / words.length) * 100);
  }, [words]);
  const maxWeight = leadWord ? Math.round(leadWord.weight * 100) : 0;
  const signalMeter = `conic-gradient(#f4ad45 0deg ${Math.round(
    (maxWeight / 100) * 360
  )}deg, rgba(255,255,255,0.1) ${Math.round((maxWeight / 100) * 360)}deg 360deg)`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setError('');
    try {
      const response = await axios.post<ResponseData>('http://localhost:8000/analyze', { url });
      setWords(response.data.words.slice(0, 50));
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError(err.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="mesh mesh-a" />
      <div className="mesh mesh-b" />

      <main className="app-container">
        <header className="top-bar">
          <p className="brand">CloudScope</p>
          <div className={`live-pill ${loading ? 'live' : ''}`}>{loading ? 'Analyzing' : 'Live Ready'}</div>
        </header>

        <section className="hero">
          <p className="eyebrow">Semantic Visualization Studio</p>
          <h1>3D News Signal Map</h1>
          <p className="hero-copy">
            Convert long-form articles into a visual intelligence sphere that highlights dominant keywords and topic
            gravity.
          </p>
        </section>

        <section className="dashboard-grid">
          <aside className="left-panel">
            <div className="panel source-panel">
              <h2>Article Source</h2>
              <form onSubmit={handleSubmit} className="url-form">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="url-input"
                  placeholder="Paste a public article URL..."
                />
                <button type="submit" className="submit-button" disabled={loading}>
                  {loading ? 'Analyzing...' : 'Render Cloud'}
                </button>
              </form>

              <div className="sample-links">
                {sampleSources.map((sample) => (
                  <button
                    type="button"
                    key={sample.url}
                    className={`sample-chip ${url === sample.url ? 'active' : ''}`}
                    onClick={() => setUrl(sample.url)}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>

              {error && <p className="error">{error}</p>}
            </div>

            <div className="panel stat-panel">
              <h2>Signal Metrics</h2>
              <div className="stat-grid">
                <div className="metric">
                  <p>Domain</p>
                  <strong>{extractDomain(url)}</strong>
                </div>
                <div className="metric">
                  <p>Words</p>
                  <strong>{words.length}</strong>
                </div>
                <div className="metric">
                  <p>Lead Weight</p>
                  <strong>{maxWeight}%</strong>
                </div>
                <div className="metric">
                  <p>Average</p>
                  <strong>{avgWeight}%</strong>
                </div>
              </div>
              <div className="meter-wrap">
                <div className="meter" style={{ background: signalMeter }}>
                  <div className="meter-core">
                    <span>{maxWeight}%</span>
                    <small>signal</small>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="right-panel panel">
            <div className="panel-header">
              <div>
                <p className="label">3D Render Stage</p>
                <h3>{leadWord ? leadWord.word : 'Waiting for analysis'}</h3>
              </div>
              <p className="sub">{words.length} mapped tokens</p>
            </div>
            <div className="legend">
              <span>Cool = low relevance</span>
              <span>Warm = high relevance</span>
            </div>

            <div className="wordcloud-container">
              {words.length > 0 ? (
                <WordCloudScene words={words} />
              ) : (
                <div className="empty-state">
                  <p>No cloud yet</p>
                  <span>Submit a URL to generate the 3D keyword sphere.</span>
                </div>
              )}
              {loading && <div className="overlay">Extracting content and computing topic weights...</div>}
            </div>

            <div className="ranking">
              {topWords.map((item) => (
                <div key={item.word} className="rank-row">
                  <div className="rank-meta">
                    <strong>{item.word}</strong>
                    <span>{Math.round(item.weight * 100)}%</span>
                  </div>
                  <div className="rank-track">
                    <div className="rank-fill" style={{ width: `${Math.max(6, Math.round(item.weight * 100))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
