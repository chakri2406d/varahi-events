import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Html5Qrcode } from 'html5-qrcode'
import { ScanLine, CheckCircle, XCircle, Play, Square, Camera } from 'lucide-react'
import { applyQrScan } from '../../firebase/firestore'
import toast from 'react-hot-toast'

export default function QrScanner() {
  const scannerRef = useRef(null)
  const lockRef    = useRef(false)     // prevents duplicate scans of the same code
  const [active, setActive] = useState(false)
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState('')
  const [result, setResult] = useState(null)

  const handleDecoded = async (text) => {
    if (lockRef.current) return
    lockRef.current = true
    setBusy(true)
    try {
      const res   = await applyQrScan(text)
      const label = res.action === 'start'
        ? (res.already ? 'Event was already started' : 'Event started')
        : (res.already ? 'Event was already completed' : 'Event completed')
      setResult({ ok: true, action: res.action, msg: label, name: res.name, at: res.at })
      toast.success(`${label}${res.name ? ` — ${res.name}` : ''}`)
    } catch (e) {
      setResult({ ok: false, msg: e.message || 'Invalid QR code' })
      toast.error(e.message || 'Invalid QR code')
    } finally {
      setBusy(false)
      // cooldown so the same code isn't processed repeatedly
      setTimeout(() => { lockRef.current = false }, 2500)
    }
  }

  const start = async () => {
    setError(''); setResult(null)
    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        handleDecoded,
        () => {},          // ignore per-frame decode errors
      )
      setActive(true)
    } catch (e) {
      console.error(e)
      setError('Could not access the camera. Allow camera permission in your browser and make sure you are on https or localhost.')
    }
  }

  const stop = async () => {
    const s = scannerRef.current
    if (s) {
      try { await s.stop() } catch {}
      try { await s.clear() } catch {}
      scannerRef.current = null
    }
    setActive(false)
  }

  // Clean up the camera when leaving the page
  useEffect(() => () => { stop() }, [])

  return (
    <div className="max-w-md mx-auto">
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
          <ScanLine size={22} style={{ color:'#E8B86D' }}/> Scan Event QR
        </h1>
        <p className="text-sm" style={{ color:'#9C7A82' }}>
          Scan a customer's <b>Start</b> code to begin an event, or their <b>End</b> code to finish it.
        </p>
      </motion.div>

      <div className="glass-card p-5">
        {/* Camera viewport */}
        <div id="qr-reader"
          className="rounded-xl overflow-hidden mx-auto"
          style={{ width:'100%', maxWidth:320, minHeight: active ? 'auto' : 220,
                   border:'1px solid rgba(61,30,40,0.8)', background:'rgba(13,5,8,0.6)',
                   display:'flex', alignItems:'center', justifyContent:'center' }}>
          {!active && (
            <div className="text-center py-10" style={{ color:'#9C7A82' }}>
              <Camera size={34} className="mx-auto mb-2" style={{ color:'#C9933A' }}/>
              <p className="text-sm">Camera is off</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-4">
          {!active ? (
            <button onClick={start} className="btn-primary w-full justify-center py-3">
              <Play size={16}/> Start Camera
            </button>
          ) : (
            <button onClick={stop}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
              style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5' }}>
              <Square size={15}/> Stop Camera
            </button>
          )}
        </div>

        {/* Errors */}
        {error && (
          <p className="text-xs mt-3 text-center" style={{ color:'#fca5a5' }}>{error}</p>
        )}

        {/* Scan result */}
        {result && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
            className="mt-4 rounded-xl p-4 flex items-start gap-3"
            style={{
              background: result.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${result.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
            {result.ok
              ? <CheckCircle size={18} style={{ color:'#86efac', flexShrink:0, marginTop:1 }}/>
              : <XCircle size={18} style={{ color:'#fca5a5', flexShrink:0, marginTop:1 }}/>}
            <div>
              <p className="text-sm font-semibold" style={{ color: result.ok ? '#86efac' : '#fca5a5' }}>
                {result.msg}
              </p>
              {result.name && <p className="text-xs mt-0.5" style={{ color:'#9C7A82' }}>{result.name}</p>}
              {result.at && (
                <p className="text-[11px] mt-0.5" style={{ color:'#9C7A82' }}>
                  {new Date(result.at).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          </motion.div>
        )}

        {busy && <p className="text-xs mt-3 text-center" style={{ color:'#9C7A82' }}>Processing…</p>}
      </div>
    </div>
  )
}
