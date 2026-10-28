
import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [apiStatus, setApiStatus] = useState('Checking...');
  const [apiMessage, setApiMessage] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/health')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Backend request failed');
        }
        return response.json();
      })
      .then((data) => {
        setApiStatus('Connected');
        setApiMessage(data.message);
      })
      .catch(() => {
        setApiStatus('Disconnected');
        setApiMessage('Could not connect to the backend.');
      });
  }, []);

  return (
    <main className="app">
      <header className="navbar">
        <h2>🌾 Mandi Connect</h2>
        <span>Farmer • Trader • Market</span>
      </header>

      <section className="hero">
        <p className="eyebrow">A SMARTER MANDI EXPERIENCE</p>
        <h1>Connecting Farmers to Better Markets.</h1>
        <p className="description">
          Discover market prices, list your produce, and connect
          with verified traders through one platform.
        </p>

        <div className="status-card">
          <h3>Backend Connection</h3>
          <p>
            Status:{' '}
            <strong
              className={
                apiStatus === 'Connected' ? 'success' :
                apiStatus === 'Disconnected' ? 'error' : ''
              }
            >
              {apiStatus}
            </strong>
          </p>
          <p>{apiMessage}</p>
        </div>

        <div className="actions">
          <button onClick={() => window.location.reload()}>
            Check Connection Again
          </button>
        </div>
      </section>

      <footer>
        Mandi Connect · Project Development Preview
      </footer>
    </main>
  );
}

export default App;
