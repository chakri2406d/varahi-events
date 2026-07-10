import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import QRCode from 'react-qr-code'
import { Upload, CheckCircle, Copy, AlertCircle, IndianRupee } from 'lucide-react'
import { uploadPaymentProof } from '../../firebase/storage'
import { updateBookingStatus, getBookingById } from '../../firebase/firestore'
import { BUSINESS_INFO, BOOKING_STATUSES } from '../../utils/constants'
import toast from 'react-hot-toast'

export default function PaymentSection({ bookingId }) {
  const [uploading,   setUploading]   = useState(false)
  const [uploaded,    setUploaded]    = useState(false)
  const [dragOver,    setDragOver]    = useState(false)
  const [copiedUpi,   setCopiedUpi]   = useState(false)
  const [previewUrl,  setPreviewUrl]  = useState(null)
  const [file,        setFile]        = useState(null)

  // New fields
  const [txnId,       setTxnId]       = useState('')
  const [amountPaid,  setAmountPaid]  = useState('')
  const [totalAmount, setTotalAmount] = useState(null)

  // Pull the booking's total (set by admin) so we can enforce the 40% advance.
  // Silently ignore if it isn't set yet — the check just won't apply.
  useEffect(() => {
    if (!bookingId) return
    let cancelled = false
    getBookingById(bookingId)
      .then(b => { if (!cancelled && b?.totalAmount) setTotalAmount(Number(b.totalAmount)) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [bookingId])

  const upiLink = `upi://pay?pa=${BUSINESS_INFO.upiId}&pn=Varahi+Events&cu=INR`

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(BUSINESS_INFO.upiId)
    setCopiedUpi(true)
    toast.success('UPI ID copied!')
    setTimeout(() => setCopiedUpi(false), 2500)
  }

  const handleFileSelect = (f) => {
    if (!f || !f.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    if (f.size > 3 * 1024 * 1024) {
      toast.error('File too large. Max 3MB. Please screenshot and crop tightly.')
      return
    }
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files?.[0])
  }

  const handleSubmit = async () => {
    // Validations
    if (!file)       { toast.error('Please upload payment screenshot'); return }
    if (!txnId.trim()){ toast.error('Please enter Transaction ID'); return }
    if (!amountPaid) { toast.error('Please enter amount paid'); return }

    const paid  = Number(amountPaid)
    const total = totalAmount ? Number(totalAmount) : null

    if (paid <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    // 40% advance check — only if admin has set total amount
    if (total && paid < total * 0.4) {
      const minAmount = Math.ceil(total * 0.4)
      toast.error(`Minimum advance is 40% = ₹${minAmount.toLocaleString('en-IN')}. Please pay at least that amount.`)
      return
    }

    setUploading(true)
    try {
      let proofUrl = null

      // Try Firebase upload — fallback gracefully on CORS
      try {
        proofUrl = await uploadPaymentProof(bookingId, file)
      } catch (uploadErr) {
        console.warn('Screenshot upload failed (CORS/Storage issue):', uploadErr)
        // Continue without screenshot URL — admin can follow up
        proofUrl = null
      }

      await updateBookingStatus(bookingId, BOOKING_STATUSES.PAYMENT_PENDING, {
        paymentProofUrl:        proofUrl,
        transactionId:          txnId.trim(),
        amountPaid:             paid,
        paymentSubmittedAt:     new Date().toISOString(),
      })

      setUploaded(true)
      toast.success('Payment details submitted! Admin will verify shortly.')
    } catch (err) {
      console.error(err)
      toast.error('Submission failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (uploaded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
        >
          <CheckCircle size={36} className="text-green-400" />
        </motion.div>

        <h3 className="text-white font-bold text-xl mb-2">Payment Submitted!</h3>
        <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: '#9C7A82' }}>
          Your payment details have been sent to admin. We'll confirm your booking within a few hours.
        </p>

        <div className="rounded-xl p-4 inline-block text-left mb-4"
          style={{ background: 'rgba(13,5,8,0.8)', border: '1px solid rgba(61,30,40,0.8)' }}>
          <p className="text-xs mb-1" style={{ color: '#9C7A82' }}>Booking Reference</p>
          <p className="font-mono font-bold" style={{ color: '#C9933A' }}>
            #{bookingId?.slice(0, 8).toUpperCase()}
          </p>
        </div>

        <p className="text-xs" style={{ color: '#9C7A82' }}>
          Go to{' '}
          <a href="/dashboard" className="underline" style={{ color: '#E8B86D' }}>
            My Dashboard
          </a>{' '}
          to track your booking status.
        </p>
      </motion.div>
    )
  }

  // ── Main payment screen ───────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

      {/* Header */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold mb-3"
          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }}>
          ✓ Slot Held for 30 Minutes
        </div>
        <h3 className="text-white font-bold text-xl">Complete Your Payment</h3>
        <p className="text-sm mt-1" style={{ color: '#9C7A82' }}>
          Scan QR or use UPI ID · Then fill details below
        </p>
      </div>

      {/* Advance notice */}
      <div className="flex items-start gap-2 p-3 rounded-xl mb-5"
        style={{ background: 'rgba(201,147,58,0.08)', border: '1px solid rgba(201,147,58,0.2)' }}>
        <AlertCircle size={14} style={{ color: '#E8B86D', flexShrink: 0, marginTop: 1 }} />
        <p className="text-xs" style={{ color: '#E8B86D' }}>
          <strong>Minimum 40% advance required.</strong> If admin has set a total amount,
          pay at least 40% to confirm your slot. Full amount can be paid on the event day.
        </p>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center mb-5">
        <div className="p-4 rounded-2xl bg-white mb-2">
          <QRCode value={upiLink} size={150} level="M" fgColor="#0D0508" />
        </div>
        <p className="text-xs" style={{ color: '#9C7A82' }}>Scan with any UPI app</p>
      </div>

      {/* UPI ID copy */}
      <div className="flex items-center justify-between p-4 rounded-xl mb-5"
        style={{ background: 'rgba(13,5,8,0.8)', border: '1px solid rgba(61,30,40,0.8)' }}>
        <div>
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#9C7A82' }}>UPI ID</p>
          <p className="font-mono font-semibold text-white">{BUSINESS_INFO.upiId}</p>
        </div>
        <button onClick={handleCopyUpi}
          className="p-2 rounded-lg transition-all"
          style={{
            background: copiedUpi ? 'rgba(34,197,94,0.1)' : 'transparent',
            border: `1px solid ${copiedUpi ? 'rgba(34,197,94,0.4)' : 'rgba(61,30,40,0.8)'}`,
            color: copiedUpi ? '#86efac' : '#9C7A82',
          }}>
          {copiedUpi ? <CheckCircle size={16} /> : <Copy size={16} />}
        </button>
      </div>

      {/* Divider */}
      <div className="h-px mb-5"
        style={{ background: 'linear-gradient(to right, transparent, rgba(201,147,58,0.2), transparent)' }} />

      {/* Transaction ID */}
      <div className="mb-4">
        <label className="label-dark">Transaction ID / UTR Number *</label>
        <input
          className="input-dark"
          placeholder="e.g. 123456789012 (12-digit UTR)"
          value={txnId}
          onChange={e => setTxnId(e.target.value)}
        />
        <p className="text-xs mt-1" style={{ color: '#9C7A82' }}>
          Find this in your UPI app under payment history
        </p>
      </div>

      {/* Amount Paid */}
      <div className="mb-5">
        <label className="label-dark">Amount Paid (₹) *</label>
        <div className="relative">
          <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: '#9C7A82' }} />
          <input
            type="number"
            className="input-dark pl-8"
            placeholder="Enter exact amount you paid"
            value={amountPaid}
            onChange={e => setAmountPaid(e.target.value)}
            min="1"
          />
        </div>
        {totalAmount && Number(amountPaid) > 0 && (
          <div className="mt-2">
            {Number(amountPaid) >= totalAmount * 0.4 ? (
              <p className="text-xs flex items-center gap-1" style={{ color: '#86efac' }}>
                <CheckCircle size={11} /> ✓ Advance amount is sufficient
              </p>
            ) : (
              <p className="text-xs flex items-center gap-1" style={{ color: '#fca5a5' }}>
                <AlertCircle size={11} />
                Minimum required: ₹{Math.ceil(totalAmount * 0.4).toLocaleString('en-IN')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Screenshot upload */}
      <div className="mb-5">
        <label className="label-dark">Payment Screenshot *</label>

        {/* Preview if file selected */}
        {previewUrl ? (
          <div className="relative rounded-xl overflow-hidden mb-2"
            style={{ border: '1px solid rgba(201,147,58,0.3)' }}>
            <img src={previewUrl} alt="Payment proof" className="w-full max-h-48 object-contain"
              style={{ background: '#0D0508' }} />
            <button
              onClick={() => { setFile(null); setPreviewUrl(null) }}
              className="absolute top-2 right-2 px-2 py-1 rounded-lg text-xs"
              style={{ background: 'rgba(239,68,68,0.8)', color: 'white' }}
            >
              Change
            </button>
          </div>
        ) : (
          <div
            className="rounded-xl p-8 text-center cursor-pointer transition-all duration-200"
            style={{
              border: `2px dashed ${dragOver ? 'rgba(201,147,58,0.6)' : 'rgba(61,30,40,0.8)'}`,
              background: dragOver ? 'rgba(201,147,58,0.05)' : 'transparent',
            }}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('paymentFile').click()}
          >
            <input
              id="paymentFile"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handleFileSelect(e.target.files?.[0])}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(201,147,58,0.1)' }}>
                <Upload size={22} style={{ color: '#C9933A' }} />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Tap to upload screenshot</p>
                <p className="text-xs mt-1" style={{ color: '#9C7A82' }}>
                  PNG, JPG · Max 3MB
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={uploading || !file || !txnId || !amountPaid}
        className="btn-primary w-full justify-center py-3.5"
        style={{
          opacity: (uploading || !file || !txnId || !amountPaid) ? 0.5 : 1,
          cursor:  (uploading || !file || !txnId || !amountPaid) ? 'not-allowed' : 'pointer',
        }}
      >
        {uploading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <CheckCircle size={16} />
            Submit Payment Details
          </>
        )}
      </button>

      <p className="text-xs text-center mt-4" style={{ color: '#9C7A82' }}>
        Your slot will be confirmed once admin verifies the payment.
      </p>
    </motion.div>
  )
}