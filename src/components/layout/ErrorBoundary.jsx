import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { BUSINESS_INFO } from '../../utils/constants'

/*
  A render error anywhere below this boundary used to blank the entire site —
  the customer saw a white page with no explanation and no way forward.
  Now they get a branded message, a retry, and a way to reach us, and the real
  error is still logged to the console for debugging.

  This must stay a CLASS component: React only supports error catching via
  componentDidCatch / getDerivedStateFromError, which have no hook equivalent.
*/
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Keep the full detail in the console so a real cause is still findable
    console.error('Unhandled UI error:', error, info?.componentStack)

    // A failed dynamic import almost always means the browser is holding a
    // stale build (old chunk filenames after a deploy). Reloading once fetches
    // the new index.html and fixes it — but only once, so a genuine bug can't
    // put us in a reload loop.
    const msg = String(error?.message || '')
    const isStaleChunk = /dynamically imported module|Loading chunk|Importing a module script failed|Failed to fetch/i.test(msg)

    if (isStaleChunk && !sessionStorage.getItem('varahi_chunk_reloaded')) {
      sessionStorage.setItem('varahi_chunk_reloaded', '1')
      // Drop caches and any old service worker before reloading
      Promise.resolve()
        .then(() => (window.caches ? caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))) : null))
        .catch(() => {})
        .finally(() => window.location.reload())
    }
  }

  handleRetry = () => {
    // Clear the one-shot reload guard so a later, unrelated stale-chunk error
    // can still self-heal, then re-render the subtree.
    sessionStorage.removeItem('varahi_chunk_reloaded')
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const wa = `https://wa.me/${BUSINESS_INFO.whatsapp}?text=${encodeURIComponent(
      'Hi, I hit an error on the Varahi Events website.'
    )}`

    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: '#1A0810' }}>
        <div className="w-full max-w-md rounded-2xl p-6 text-center"
          style={{ background: 'rgba(13,5,8,0.9)', border: '1px solid rgba(61,30,40,0.9)' }}>

          <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <AlertTriangle size={26} style={{ color: '#fca5a5' }} />
          </div>

          <h1 className="text-white font-bold text-lg mb-2">Something went wrong</h1>
          <p className="text-sm mb-5" style={{ color: '#9C7A82' }}>
            Sorry — this page ran into an unexpected problem. Your booking data is safe.
            Try again, or head back to the home page.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button onClick={this.handleRetry}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg,#8B1A2C,#C9933A)', color: '#fff' }}>
              <RefreshCw size={15} /> Try Again
            </button>
            {/* A hard location change, not a router link — the router itself
                may be part of what failed. */}
            <button onClick={() => { window.location.href = '/' }}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm"
              style={{ border: '1px solid rgba(61,30,40,0.9)', color: '#9C7A82' }}>
              <Home size={15} /> Go Home
            </button>
          </div>

          <p className="text-xs mt-5" style={{ color: '#6b5158' }}>
            Still stuck?{' '}
            <a href={wa} target="_blank" rel="noopener noreferrer"
              className="underline" style={{ color: '#E8B86D' }}>
              Message us on WhatsApp
            </a>
          </p>

          {import.meta.env.DEV && this.state.error && (
            <pre className="text-[10px] text-left mt-4 p-2 rounded-lg overflow-auto max-h-40"
              style={{ background: '#0D0508', color: '#fca5a5' }}>
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          )}
        </div>
      </div>
    )
  }
}
