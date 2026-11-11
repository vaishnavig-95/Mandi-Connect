
import { useEffect, useState } from 'react';
const API_BASE = import.meta.env.VITE_API_URL || '';
const api = async (path, opts = {}) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...opts.headers
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
};

const inr = n => n == null ? '—' : '₹' + Number(n).toLocaleString('en-IN');
const dateText = d => d ? new Date(d).toLocaleDateString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric'
}) : '—';

function useLoad(path) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);

    try {
      const result = await api(path);

      setData(
        Array.isArray(result)
          ? result
          : Array.isArray(result?.value)
            ? result.value
            : []
      );
    } catch (error) {
      console.error(`Failed to load ${path}:`, error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const result = await api(path);

        if (!cancelled) {
          setData(
            Array.isArray(result)
              ? result
              : Array.isArray(result?.value)
                ? result.value
                : []
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error(`Failed to load ${path}:`, error);
          setData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [path]);

  return [data, load, loading];
}

function Brand({ light = false }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`}>
      <div className="brand-mark">🌾</div>
      <div>
        <strong>Mandi<span>Connect</span></strong>
        <small>INDIA'S DIGITAL MANDI</small>
      </div>
    </div>
  );
}

function Icon({ name }) {
  const icons = {
    wheat: '🌾', market: '📈', shield: '🛡️', truck: '🚚',
    leaf: '🌱', location: '📍', arrow: '↗', search: '⌕',
    clock: '◷', users: '👥', check: '✓', plus: '+',
    home: '⌂', price: '₹', box: '▦', activity: '◉'
  };
  return <span className="ui-icon" aria-hidden="true">{icons[name] || '•'}</span>;
}

function Login({ onLogin, say }) {
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState({
    role: 'farmer', full_name: '', email: '', password: '', district_id: '1'
  });
  const [districts] = useLoad('/districts');
  const [busy, setBusy] = useState(false);

  const update = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      if (register) {
        await api('/auth/register', {
          method: 'POST',
          body: { ...form, district_id: Number(form.district_id) || 1 }
        });
        say('Your account has been created. Please sign in.');
        setRegister(false);
      } else {
        const result = await api('/auth/login', {
          method: 'POST',
          body: { email: form.email, password: form.password }
        });
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        onLogin(result.user);
      }
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(false);
    }
  };

 const demoAccounts = [
  ['Farmer', 'farmer1@demo.com'],
  ['Trader', 'trader1@demo.com'],
  ['Officer', 'officer@demo.com'],
  ['Admin', 'admin@demo.com']
];

 const handleDemoClick = email => {
  setRegister(false);
  setForm(prev => ({
    ...prev,
    email,
    password: 'Demo@1234'
  }));
};
  return (
    <section className="auth-layout">
      <div className="auth-story">
        <div className="eyebrow"><span className="live-dot" /> SMART AGRICULTURE. FAIRER MARKETS.</div>
        <h1>From the farm<br />to a <span>fairer future.</span></h1>
        <p className="auth-description">
          A connected marketplace where farmers find better opportunities,
          traders discover quality produce, and market prices are more transparent.
        </p>
        <div className="auth-benefits">
          <div><span className="benefit-icon">↗</span><span><b>Transparent prices</b><small>Make decisions with market insights.</small></span></div>
          <div><span className="benefit-icon">♧</span><span><b>Direct connections</b><small>Bring farmers and traders closer.</small></span></div>
          <div><span className="benefit-icon">✓</span><span><b>Trusted marketplace</b><small>Role-based access and verification.</small></span></div>
        </div>
        <div className="auth-landscape" aria-hidden="true">
          <div className="sun"></div>
          <div className="field field-one"></div>
          <div className="field field-two"></div>
          <div className="field field-three"></div>
          <div className="landscape-label">GROW TOGETHER <span>✳</span></div>
        </div>
      </div>

      <div className="auth-side">
        <div className="auth-card">
          <div className="auth-card-top">
            <span className="mini-label">{register ? 'JOIN THE NETWORK' : 'WELCOME BACK'}</span>
            <div className="auth-symbol">{register ? '✳' : '↗'}</div>
          </div>
          <h2>{register ? 'Create your account' : 'Good to see you.'}</h2>
          <p className="muted">{register ? 'Start your journey with Mandi Connect.' : 'Sign in to continue to your marketplace.'}</p>

          <form onSubmit={submit} className="auth-form">
            {register && <>
              <label>Full name</label>
              <input name="full_name" value={form.full_name} onChange={update} placeholder="Enter your full name" required />
              <label>I am a</label>
              <select name="role" value={form.role} onChange={update}>
                <option value="farmer">Farmer</option>
                <option value="trader">Trader</option>
              </select>
              <label>District</label>
              <select name="district_id" value={form.district_id} onChange={update}>
                {districts.map(d => <option key={d.district_id} value={d.district_id}>{d.name}</option>)}
                {!districts.length && <option value="1">Prayagraj</option>}
              </select>
            </>}
            <label>Email address</label>
            <input name="email" type="email" value={form.email} onChange={update} placeholder="you@example.com" required />
            <label>Password</label>
            <input name="password" type="password" value={form.password} onChange={update} placeholder={register ? 'At least 8 characters' : 'Enter your password'} minLength={register ? 8 : undefined} required />
            <button className="primary-btn auth-submit" disabled={busy}>
              {busy ? 'Please wait…' : register ? 'Create account →' : 'Sign in to dashboard →'}
            </button>
          </form>

          <div className="auth-switch">
            {register ? 'Already have an account?' : 'New to Mandi Connect?'}
            {' '}
            <button onClick={() => setRegister(!register)}>{register ? 'Sign in' : 'Create account'}</button>
          </div>

          {!register && <div className="demo-login">
            <div className="demo-heading"><span>DEMO ACCESS</span><span className="demo-pill">READY TO TRY</span></div>
            <p>Choose a demo role to fill in the login details.</p>
            <div className="demo-roles">
              {demoAccounts.map(([role, email]) => (
                <button key={role} type="button" onClick={() => handleDemoClick(email)} className={form.email === email ? 'selected' : ''}>
                  {role}<span>↗</span>
                </button>
              ))}
            </div>
            <small className="demo-hint">Demo password: <b>Demo@1234</b></small>
          </div>}
        </div>
        <p className="auth-footnote">Built for India's agricultural community <span>•</span> Local demo environment</p>
      </div>
    </section>
  );
}

function Prices({ compact = false }) {
  const [rows, , loading] = useLoad('/prices');
  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState('All districts');

  const districts = ['All districts', ...new Set(rows.map(r => r.district).filter(Boolean))];
  const filtered = rows.filter(r =>
    `${r.crop} ${r.season} ${r.district}`.toLowerCase().includes(query.toLowerCase()) &&
    (district === 'All districts' || r.district === district)
  );

  return (
    <section className="panel price-panel">
      <div className="section-heading">
        <div>
          <div className="mini-label">MARKET INTELLIGENCE</div>
          <h2>Today's mandi prices</h2>
          <p>Track indicative modal prices by crop and district.</p>
        </div>
        <span className="price-unit">₹ / QUINTAL</span>
      </div>
      <div className="price-tools">
        <div className="search-box"><Icon name="search" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search crop or season..." /></div>
        <select value={district} onChange={e => setDistrict(e.target.value)} aria-label="Filter by district">
          {districts.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Crop & season</th><th>District</th><th>Date</th><th className="align-right">Modal price</th></tr></thead>
          <tbody>
            {filtered.slice(0, compact ? 5 : 50).map((r, i) => (
              <tr key={`${r.crop}-${r.district}-${r.price_date}-${i}`}>
                <td><div className="crop-cell"><span className={`crop-avatar crop-${String(r.crop).toLowerCase().replace(/[^a-z]/g, '')}`}>{({ Wheat: '🌾', Rice: '🌾', Potato: '🥔', Mustard: '🌼', Tomato: '🍅', Sugarcane: '🎋' })[r.crop] || '🌱'}</span><span><b>{r.crop}</b><small>{r.season || 'Seasonal crop'}</small></span></div></td>
                <td><span className="district-text"><Icon name="location" /> {r.district}</span></td>
                <td>{dateText(r.price_date)}</td>
                <td className="align-right"><b className="price-value">{inr(r.modal_price)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && <div className="empty-state"><span>🌱</span><b>No prices found</b><p>Try another crop or district.</p></div>}
        {loading && <div className="empty-state">Loading market prices…</div>}
      </div>
      <div className="table-footer"><span><span className="live-dot" /> Demo market data</span><span>{filtered.length} records</span></div>
    </section>
  );
}

function DashboardHome({ user, say }) {
  const [prices] = useLoad('/prices');
  const [listings] = useLoad('/listings');
  const role = user.role;
  const greetings = {
    farmer: ['Your farm, your opportunities.', 'Manage your produce and follow incoming bids.'],
    trader: ['Find your next opportunity.', 'Explore available produce and place competitive bids.'],
    officer: ['Market oversight, simplified.', 'Keep local market prices current and verify traders.'],
    admin: ['Your marketplace at a glance.', 'Monitor activity and manage open market listings.']
  };
  const [title, subtitle] = greetings[role] || greetings.farmer;

  return (
    <>
      <section className="welcome-banner">
        <div className="welcome-copy">
          <div className="eyebrow"><span className="live-dot" /> YOUR MANDI WORKSPACE</div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          <div className="welcome-meta"><span>✳</span> Welcome, {user.name || user.full_name || 'Member'}</div>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="art-sun"></div>
          <div className="art-hill hill-back"></div>
          <div className="art-hill hill-front"></div>
          <div className="art-stalk stalk-one">♧</div>
          <div className="art-stalk stalk-two">♧</div>
          <div className="art-stalk stalk-three">♧</div>
          <div className="art-stamp">GROW<br />TOGETHER</div>
        </div>
      </section>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-top"><span>Market price records</span><span className="stat-icon mint"><Icon name="price" /></span></div><strong>{prices.length}</strong><small>Across available districts</small></div>
        <div className="stat-card"><div className="stat-top"><span>Open listings</span><span className="stat-icon lime"><Icon name="box" /></span></div><strong>{listings.length}</strong><small>Produce available to explore</small></div>
        <div className="stat-card"><div className="stat-top"><span>Your role</span><span className="stat-icon cream"><Icon name="shield" /></span></div><strong className="role-stat">{role.charAt(0).toUpperCase() + role.slice(1)}</strong><small>Role-based demo access</small></div>
      </div>

      <div className="content-grid">
        <Prices compact />
        <aside className="side-column">
          <div className="panel quick-panel">
            <div className="mini-label">QUICK ACCESS</div>
            <h3>Make things happen.</h3>
            <p>Jump straight into your marketplace tools.</p>
            {role === 'farmer' && <QuickAction icon="🌾" title="List your produce" text="Offer a crop to the market" onClick={() => say('Open My listings in the navigation to create a listing.')} />}
            {role === 'trader' && <QuickAction icon="🛒" title="Explore listings" text="Find crops and place bids" onClick={() => say('Open Listings in the navigation to browse produce.')} />}
            {role === 'officer' && <QuickAction icon="📋" title="Officer workspace" text="Update prices and verify traders" onClick={() => say('Open Officer panel in the navigation.')} />}
            {role === 'admin' && <QuickAction icon="🛡️" title="Activity overview" text="Review the latest platform actions" onClick={() => say('Open Activity log in the navigation.')} />}
            <div className="quick-tip"><span>✦</span><span><b>Demo tip</b><small>Try the different role accounts to explore each workflow.</small></span></div>
          </div>
          <div className="trust-panel"><span className="trust-icon">🌱</span><div><b>Better connections. Fairer trade.</b><p>Designed to make agricultural markets easier to navigate.</p></div></div>
        </aside>
      </div>
    </>
  );
}

function QuickAction({ icon, title, text, onClick }) {
  return <button className="quick-action" onClick={onClick}><span className="quick-action-icon">{icon}</span><span><b>{title}</b><small>{text}</small></span><span className="quick-arrow">↗</span></button>;
}

function Market({ user, say }) {
  const [rows, load] = useLoad('/listings');
  const [bids, loadBids] = useLoad(user.role === 'trader' ? '/bids/mine' : '/crops');
  const [amounts, setAmounts] = useState({});
  const [query, setQuery] = useState('');
  const act = async (fn, message) => {
    try { await fn(); say(message); load(); if (user.role === 'trader') loadBids(); }
    catch (e) { say(e.message); }
  };
  const filtered = rows.filter(r => `${r.crop} ${r.farmer_name}`.toLowerCase().includes(query.toLowerCase()));

  return <>
    <div className="page-intro"><div><div className="mini-label">LIVE MARKETPLACE</div><h1>Produce listings</h1><p>Discover crops available for trade and follow competitive bids.</p></div><span className="page-count">{filtered.length} OPEN LISTINGS</span></div>
    <section className="panel">
      <div className="panel-toolbar"><div className="search-box"><Icon name="search" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search crops or farmers..." /></div><span className="status-open"><span className="live-dot" /> Market open</span></div>
      <div className="table-wrap"><table><thead><tr><th>Produce</th><th>Farmer</th><th>Quantity</th><th>Grade</th><th>Base price</th><th>Highest bid</th><th>Bids</th><th>Closes</th><th>Action</th></tr></thead>
        <tbody>{filtered.map(r => <tr key={r.listing_id}>
          <td><b>{r.crop}</b></td><td>{r.farmer_name}</td><td>{Number(r.quantity_kg).toLocaleString('en-IN')} kg</td><td><span className="grade-tag">{r.grade}</span></td><td>{inr(r.base_price)}</td><td><b>{inr(r.highest_bid)}</b></td><td>{r.bid_count ?? 0}</td><td>{dateText(r.closing_time)}</td>
          <td>{user.role === 'trader' && <div className="bid-action"><input aria-label="Bid amount" type="number" min={r.highest_bid || r.base_price} placeholder="₹ amount" value={amounts[r.listing_id] || ''} onChange={e => setAmounts({ ...amounts, [r.listing_id]: e.target.value })} /><button className="small-btn" onClick={() => act(() => api(`/listings/${r.listing_id}/bids`, { method: 'POST', body: { bid_amount: Number(amounts[r.listing_id]) } }), 'Bid placed successfully.')}>Bid</button></div>}
          {user.role === 'admin' && <button className="small-btn" onClick={() => act(() => api(`/listings/${r.listing_id}/close`, { method: 'POST' }), 'Listing closed.')}>Close</button>}
          {user.role !== 'trader' && user.role !== 'admin' && <span className="tag">Open</span>}</td>
        </tr>)}</tbody></table>
        {filtered.length === 0 && <div className="empty-state">No matching listings found.</div>}
      </div>
    </section>
    {user.role === 'trader' && <section className="panel"><div className="section-heading"><div><div className="mini-label">YOUR ACTIVITY</div><h2>My bids</h2></div></div><div className="table-wrap"><table><thead><tr><th>Crop</th><th>Bid amount</th><th>Time</th><th>Status</th></tr></thead><tbody>{bids.map(b => <tr key={b.bid_id}><td>{b.crop}</td><td>{inr(b.bid_amount)}</td><td>{dateText(b.bid_time)}</td><td><span className="tag">{b.status}</span></td></tr>)}</tbody></table>{!bids.length && <div className="empty-state">Your bids will appear here.</div>}</div></section>}
  </>;
}

function MyListings({ say }) {
  const [rows, load] = useLoad('/listings/mine');
  const [crops] = useLoad('/crops');
  const [form, setForm] = useState({ grade: 'A', crop_id: '1' });
  const [minClosingTime] = useState(
  () => new Date(Date.now() + 60000).toISOString().slice(0, 16)
);
  const [busy, setBusy] = useState(false);
  const update = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/listings', {
        method: 'POST',
        body: { ...form, crop_id: Number(form.crop_id || crops[0]?.crop_id), quantity_kg: Number(form.quantity_kg), base_price: Number(form.base_price), closing_time: new Date(form.closing_time).toISOString() }
      });
      say('Your produce listing has been created.');
      load();
      setForm({ grade: 'A', crop_id: '1' });
    } catch (err) { say(err.message); }
    finally { setBusy(false); }
  };

  return <>
    <div className="page-intro"><div><div className="mini-label">FARMER WORKSPACE</div><h1>My produce</h1><p>List your harvest and manage offers from traders.</p></div></div>
    <form className="panel listing-form" onSubmit={submit}>
      <div className="section-heading"><div><div className="mini-label">NEW LISTING</div><h2>Bring your produce to market</h2><p>Enter the crop details to create a listing.</p></div><span className="form-deco">🌾</span></div>
      <div className="form-grid">
        <div><label>Crop</label><select name="crop_id" value={form.crop_id} onChange={update} required>{crops.map(c => <option key={c.crop_id} value={c.crop_id}>{c.name}</option>)}</select></div>
        <div><label>Quantity (kg)</label><input name="quantity_kg" type="number" min="1" value={form.quantity_kg || ''} onChange={update} placeholder="e.g. 500" required /></div>
        <div><label>Quality grade</label><select name="grade" value={form.grade} onChange={update}><option value="A">Grade A — Premium</option><option value="B">Grade B — Standard</option><option value="C">Grade C — Basic</option></select></div>
        <div><label>Base price (₹ / quintal)</label><input name="base_price" type="number" min="1" value={form.base_price || ''} onChange={update} placeholder="e.g. 2400" required /></div>
        <div className="full-field"><label>Listing closes at</label><input name="closing_time" type="datetime-local" min={minClosingTime} value={form.closing_time || ''} onChange={update} required /></div>
      </div>
      <button className="primary-btn" disabled={busy}>{busy ? 'Creating listing…' : '+ Create produce listing'}</button>
    </form>
    <section className="panel"><div className="section-heading"><div><div className="mini-label">YOUR INVENTORY</div><h2>My listings</h2></div><span className="page-count">{rows.length} TOTAL</span></div>
      <div className="table-wrap"><table><thead><tr><th>Crop</th><th>Quantity</th><th>Grade</th><th>Base price</th><th>Highest bid</th><th>Closing date</th><th>Status</th></tr></thead><tbody>{rows.map(r => <tr key={r.listing_id}><td><b>{r.crop}</b></td><td>{Number(r.quantity_kg).toLocaleString('en-IN')} kg</td><td>{r.grade}</td><td>{inr(r.base_price)}</td><td>{inr(r.highest_bid)}</td><td>{dateText(r.closing_time)}</td><td><span className="tag">{r.status}</span></td></tr>)}</tbody></table>{!rows.length && <div className="empty-state">Your listings will appear here after you create one.</div>}</div>
    </section>
  </>;
}

function Officer({ say }) {
  const [crops] = useLoad('/crops');
  const [districts] = useLoad('/districts');
  const [pending, loadPending] = useLoad('/traders/pending');
  const [prices, loadPrices] = useLoad('/prices');
  const [form, setForm] = useState({ price_date: new Date().toISOString().slice(0, 10), crop_id: '1', district_id: '1' });
  const update = e => setForm({ ...form, [e.target.name]: e.target.value });

  const save = async e => {
    e.preventDefault();
    try {
      await api('/prices', { method: 'POST', body: { ...form, crop_id: Number(form.crop_id), district_id: Number(form.district_id), modal_price: Number(form.modal_price) } });
      say('Market price saved.');
      loadPrices();
    } catch (err) { say(err.message); }
  };
  const verify = async id => {
    try { await api(`/traders/${id}/verify`, { method: 'PATCH' }); say('Trader verified.'); loadPending(); }
    catch (err) { say(err.message); }
  };

  return <>
    <div className="page-intro"><div><div className="mini-label">MANDI OPERATIONS</div><h1>Officer workspace</h1><p>Keep market information updated and help maintain a trusted network.</p></div></div>
    <div className="stats-grid two-stats"><div className="stat-card"><div className="stat-top"><span>Price records</span><span className="stat-icon mint">₹</span></div><strong>{prices.length}</strong><small>Published demo prices</small></div><div className="stat-card"><div className="stat-top"><span>Pending traders</span><span className="stat-icon lime">♧</span></div><strong>{pending.length}</strong><small>Awaiting verification</small></div></div>
    <form className="panel listing-form" onSubmit={save}><div className="section-heading"><div><div className="mini-label">MARKET DATA</div><h2>Publish a mandi price</h2><p>Prices are shown in rupees per quintal.</p></div></div>
      <div className="form-grid"><div><label>Crop</label><select name="crop_id" value={form.crop_id} onChange={update}>{crops.map(c => <option key={c.crop_id} value={c.crop_id}>{c.name}</option>)}</select></div><div><label>District</label><select name="district_id" value={form.district_id} onChange={update}>{districts.map(d => <option key={d.district_id} value={d.district_id}>{d.name}</option>)}</select></div><div><label>Price date</label><input name="price_date" type="date" value={form.price_date} onChange={update} required /></div><div><label>Modal price (₹ / quintal)</label><input name="modal_price" type="number" min="1" value={form.modal_price || ''} onChange={update} placeholder="Enter price" required /></div></div>
      <button className="primary-btn">Save market price →</button>
    </form>
    <section className="panel"><div className="section-heading"><div><div className="mini-label">TRADER MANAGEMENT</div><h2>Verification queue</h2></div><span className="page-count">{pending.length} PENDING</span></div>
      {pending.length ? <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Action</th></tr></thead><tbody>{pending.map(t => <tr key={t.user_id}><td><b>{t.full_name}</b></td><td>{t.email}</td><td><button className="small-btn" onClick={() => verify(t.user_id)}>Verify trader ✓</button></td></tr>)}</tbody></table></div> : <div className="empty-state"><span>✓</span><b>You're all caught up</b><p>No traders are waiting for verification.</p></div>}
    </section>
  </>;
}

function Audit() {
  const [rows] = useLoad('/audit');
  return <><div className="page-intro"><div><div className="mini-label">PLATFORM OVERSIGHT</div><h1>Activity log</h1><p>Review recent activity recorded during this demo session.</p></div></div>
    <section className="panel"><div className="table-wrap"><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead><tbody>{rows.map(r => <tr key={r.log_id}><td>{new Date(r.created_at).toLocaleString()}</td><td>{r.full_name || 'System'}</td><td><span className="tag">{r.action}</span></td><td>{r.details}</td></tr>)}</tbody></table>{!rows.length && <div className="empty-state">Activity will appear here as you use the demo.</div>}</div></section>
  </>;
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); }
    catch { return null; }
  });
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState('home');

  const say = text => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 3500);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setTab('home');
    say('You have signed out.');
  };

  const tabs = [
    { id: 'home', label: 'Overview', icon: 'home' },
    { id: 'prices', label: 'Market prices', icon: 'price' },
    ...(user?.role === 'farmer' ? [{ id: 'mine', label: 'My produce', icon: 'wheat' }] : []),
    ...(user && ['trader', 'admin'].includes(user.role) ? [{ id: 'market', label: 'Listings', icon: 'box' }] : []),
    ...(user?.role === 'officer' ? [{ id: 'officer', label: 'Officer panel', icon: 'shield' }] : []),
    ...(user?.role === 'admin' ? [{ id: 'audit', label: 'Activity log', icon: 'activity' }] : [])
  ];

  return <div className="app-shell">
    <header className="site-header">
      <Brand light />
      <div className="header-right">
        <span className="header-status"><span className="live-dot" /> LOCAL DEMO</span>
        {user ? <><div className="user-chip"><span className="user-avatar">{(user.name || user.full_name || 'M').charAt(0).toUpperCase()}</span><span><b>{user.name || user.full_name}</b><small>{user.role}</small></span></div><button className="header-logout" onClick={logout}>Sign out ↗</button></> : <span className="header-tagline">A better way to trade.</span>}
      </div>
    </header>

    {message && <div className="toast-message" role="status"><span>✳</span>{message}<button onClick={() => setMessage('')} aria-label="Dismiss message">×</button></div>}

    {!user ? <main className="public-main">
      <Login onLogin={u => { setUser(u); setTab('home'); }} say={say} />
      <div className="public-prices"><Prices compact /></div>
      <footer className="site-footer"><Brand /><span>Local demo • Sample data for presentation purposes</span></footer>
    </main> : <>
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-label">WORKSPACE</div>
          <nav className="side-nav">
            {tabs.map(t => <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}><Icon name={t.icon} /><span>{t.label}</span>{tab === t.id && <span className="nav-indicator">•</span>}</button>)}
          </nav>
          <div className="sidebar-bottom"><div className="sidebar-leaf">🌱</div><b>Rooted in trust.</b><p>Bringing India's agricultural community closer, one connection at a time.</p><span>MANDI CONNECT · DEMO</span></div>
        </aside>
        <main className="dashboard-main">
          <div className="dashboard-topline"><span>Workspace <span>/</span> {tabs.find(t => t.id === tab)?.label || 'Overview'}</span><span className="date-label">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
          {tab === 'home' && <DashboardHome user={user} say={say} />}
          {tab === 'prices' && <><div className="page-intro"><div><div className="mini-label">MARKET INTELLIGENCE</div><h1>Market prices</h1><p>Explore the latest sample mandi prices by crop and district.</p></div></div><Prices /></>}
          {tab === 'market' && <Market user={user} say={say} />}
          {tab === 'mine' && <MyListings say={say} />}
          {tab === 'officer' && <Officer say={say} />}
          {tab === 'audit' && <Audit />}
          <footer className="dashboard-footer"><span>🌾 Mandi Connect</span><span>Demo environment · Data resets when the server restarts</span></footer>
        </main>
      </div>
    </>}

  </div>;
}
