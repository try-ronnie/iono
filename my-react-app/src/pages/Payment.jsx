import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiUrl } from '../utils/api'
import { getAuthToken, getUserDisplayName, isFarmerUser } from '../utils/session'

export default function Payment() {
  const navigate = useNavigate()
  const [cart, setCart] = useState([])
  const [query, setQuery] = useState('')
  const [showPaid, setShowPaid] = useState(false)
  const [error, setError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('mpesa')
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [isPaying, setIsPaying] = useState(false)
  const [paymentMessage, setPaymentMessage] = useState('')
  const [activeOrderId, setActiveOrderId] = useState(null)
  const [lastOrderId, setLastOrderId] = useState(null)
  const [deliveryAddress, setDeliveryAddress] = useState(null)
  const isFarmer = isFarmerUser()
  const displayName = getUserDisplayName()
  const homeLink = isFarmer ? '/farmer/home' : '/home'
  const marketLink = isFarmer ? '/farmer/inventory' : '/market'
  const dashboardLink = isFarmer ? '/farmer/home' : '/home'
  const token = getAuthToken()

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('cart') || '[]')
      setCart(Array.isArray(stored) ? stored : [])
    } catch {
      setCart([])
    }
  }, [])

  useEffect(() => {
    try {
      setQuery(localStorage.getItem('searchQuery') || '')
    } catch {
      setQuery('')
    }
  }, [])

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('deliveryAddress') || 'null')
      if (stored && typeof stored === 'object') setDeliveryAddress(stored)
    } catch {
      setDeliveryAddress(null)
    }
  }, [])

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const raw = String(item.price || '').replace(/[^0-9.]/g, '')
      const val = raw ? Number(raw) : 0
      const qty = item.qty || 1
      return sum + (Number.isNaN(val) ? 0 : val * qty)
    }, 0)
  }, [cart])

  const shipping = cart.length ? 450 : 0
  const total = subtotal + shipping

  useEffect(() => {
    if (!activeOrderId || !token) return undefined
    let cancelled = false
    let attempts = 0
    const maxAttempts = 24

    const timer = setInterval(async () => {
      attempts += 1
      try {
        const res = await fetch(apiUrl(`/payments/${activeOrderId}/status`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) {
          if (attempts >= maxAttempts) {
            clearInterval(timer)
            if (!cancelled) {
              setIsPaying(false)
              setPaymentMessage('Payment confirmation timed out. Check again in Orders.')
              setActiveOrderId(null)
            }
          }
          return
        }
        const data = await res.json()
        if (data.status === 'SUCCESS') {
          clearInterval(timer)
          if (!cancelled) {
            localStorage.setItem('cart', JSON.stringify([]))
            setCart([])
            setShowPaid(true)
            setIsPaying(false)
            setActiveOrderId(null)
            setPaymentMessage('Payment confirmed.')
            setTimeout(() => {
              setShowPaid(false)
              navigate('/orders')
            }, 1200)
          }
        } else if (data.status === 'FAILED') {
          clearInterval(timer)
          if (!cancelled) {
            setIsPaying(false)
            setActiveOrderId(null)
            setError(data.resultDesc || 'Payment failed. Please try again.')
          }
        } else if (attempts >= maxAttempts) {
          clearInterval(timer)
          if (!cancelled) {
            setIsPaying(false)
            setActiveOrderId(null)
            setPaymentMessage('Payment confirmation timed out. Check again in Orders.')
          }
        }
      } catch {
        if (attempts >= maxAttempts) {
          clearInterval(timer)
          if (!cancelled) {
            setIsPaying(false)
            setActiveOrderId(null)
            setPaymentMessage('Could not confirm payment. Check your order status.')
          }
        }
      }
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [activeOrderId, token, navigate])

  async function handleMpesaPay() {
    setError('')
    setPaymentMessage('')
    const missing = []
    if (!mpesaPhone.trim()) missing.push('M-Pesa phone number')
    if (!deliveryAddress?.line1) missing.push('delivery address')
    if (!deliveryAddress?.city) missing.push('delivery city')
    if (!deliveryAddress?.county) missing.push('delivery county')
    if (!deliveryAddress?.phone) missing.push('delivery phone')
    if (missing.length) {
      setError(`Please enter: ${missing.join(', ')}`)
      return
    }

    const farmerEmails = Array.from(
      new Set((cart || []).map((item) => item.ownerEmail).filter(Boolean))
    )
    const farmerEmail = farmerEmails.length === 1 ? farmerEmails[0] : null

    setIsPaying(true)
    const res = await fetch(apiUrl('/payments/mpesa/stk-push'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        items: cart,
        subtotal,
        shipping,
        total,
        farmerEmail,
        deliveryAddress,
        phoneNumber: mpesaPhone,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Could not start M-Pesa payment')
      setShowPaid(false)
      setIsPaying(false)
      return
    }
    const data = await res.json()
    setPaymentMessage(data.message || 'M-Pesa prompt sent. Confirm on your phone.')
    setLastOrderId(data.order?.id || null)
    if (data.payment?.status === 'SUCCESS') {
      localStorage.setItem('cart', JSON.stringify([]))
      setCart([])
      setShowPaid(true)
      setIsPaying(false)
      setTimeout(() => {
        setShowPaid(false)
        navigate('/orders')
      }, 1200)
      return
    }
    setActiveOrderId(data.order?.id || null)
  }

  async function handleCardPay() {
    setError('')
    setPaymentMessage('')
    const missing = []
    if (!cardNumber.trim()) missing.push('card number')
    if (!expiry.trim()) missing.push('MM/YY')
    if (!cvv.trim()) missing.push('CVV')
    if (!deliveryAddress?.line1) missing.push('delivery address')
    if (!deliveryAddress?.city) missing.push('delivery city')
    if (!deliveryAddress?.county) missing.push('delivery county')
    if (!deliveryAddress?.phone) missing.push('delivery phone')
    if (missing.length) {
      setError(`Please enter: ${missing.join(', ')}`)
      return
    }

    const farmerEmails = Array.from(
      new Set((cart || []).map((item) => item.ownerEmail).filter(Boolean))
    )
    const farmerEmail = farmerEmails.length === 1 ? farmerEmails[0] : null

    setIsPaying(true)
    const res = await fetch(apiUrl('/payments/card/checkout'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        items: cart,
        subtotal,
        shipping,
        total,
        farmerEmail,
        deliveryAddress,
        cardNumber,
        expiry,
        cvv,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setIsPaying(false)
      setError(data.error || 'Card payment failed')
      return
    }
    setPaymentMessage(data.message || 'Card payment successful')
    localStorage.setItem('cart', JSON.stringify([]))
    setCart([])
    setShowPaid(true)
    setIsPaying(false)
    setTimeout(() => {
      setShowPaid(false)
      navigate('/orders')
    }, 1200)
  }

  async function handlePay() {
    if (paymentMethod === 'card') {
      await handleCardPay()
      return
    }
    await handleMpesaPay()
  }

  async function handleRetryPayment() {
    const orderId = activeOrderId || lastOrderId
    if (!orderId) return
    setError('')
    setPaymentMessage('')
    setIsPaying(true)
    const res = await fetch(apiUrl('/payments/mpesa/retry'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        orderId,
        phoneNumber: mpesaPhone,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setIsPaying(false)
      setError(data.error || 'Could not retry payment')
      return
    }
    setPaymentMessage(data.message || 'M-Pesa prompt sent. Confirm on your phone.')
    setLastOrderId(orderId)
    if (data.payment?.status === 'SUCCESS') {
      localStorage.setItem('cart', JSON.stringify([]))
      setCart([])
      setShowPaid(true)
      setIsPaying(false)
      setActiveOrderId(null)
      setTimeout(() => {
        setShowPaid(false)
        navigate('/orders')
      }, 1200)
      return
    }
    setActiveOrderId(orderId)
  }

  function updateQuantity(id, delta) {
    const next = cart.map((item) => {
      if (item.id !== id) return item
      const qty = Math.max(1, (item.qty || 1) + delta)
      return { ...item, qty }
    })
    setCart(next)
    localStorage.setItem('cart', JSON.stringify(next))
  }

  function removeItem(id) {
    const next = cart.filter((i) => i.id !== id)
    setCart(next)
    localStorage.setItem('cart', JSON.stringify(next))
  }

  return (
    <div className="min-h-screen bg-[#f3ffdf] relative">
      {showPaid && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-lg border border-green-100 px-6 py-4 text-center">
            <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-2">
              ✓
            </div>
            <div className="font-semibold text-green-950">Payment successful</div>
            <div className="text-sm text-green-700">Your order has been placed.</div>
          </div>
        </div>
      )}
      <header className="bg-[#071a11] text-white">
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-400 flex items-center justify-center font-bold text-green-950">F</div>
              <div className="font-semibold text-lg tracking-wide">Farmart</div>
            </div>

            <nav className="hidden md:flex items-center gap-10 text-sm font-semibold">
              <Link to={homeLink} className="hover:text-green-300 transition">Home</Link>
              <Link to={marketLink} className="hover:text-green-300 transition">Market</Link>
              <Link to={dashboardLink} className="hover:text-green-300 transition">Dashboard</Link>
              <Link to="/contact" className="hover:text-green-300 transition">Contact</Link>
            </nav>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 bg-[#10291f] border border-[#284b3a] rounded-full px-4 py-2.5 w-64 text-sm">
                <span className="text-green-200">🔍</span>
                <input
                  className="bg-transparent placeholder-green-200/70 outline-none w-full"
                  placeholder="Search livestock..."
                  value={query}
                  onChange={(e) => {
                    const next = e.target.value
                    setQuery(next)
                    localStorage.setItem('searchQuery', next)
                  }}
                />
              </div>
              <Link
                to="/login"
                onClick={() => sessionStorage.removeItem('user')}
                className="rounded-full bg-[#10291f] border border-[#284b3a] px-4 py-2 text-sm flex items-center gap-2 hover:bg-[#143226] transition"
              >
                {displayName}
                <span className="text-green-200">↗</span>
              </Link>
              <div className="relative">
                <Link
                  to="/shipping"
                  onClick={() => localStorage.removeItem('deliveryAddress')}
                  className="w-10 h-10 rounded-full bg-[#10291f] border border-[#284b3a] flex items-center justify-center text-green-200"
                >
                  🛒
                </Link>
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center gap-6 mb-10">
          <div className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold">1</div>
          <div className="h-[2px] w-40 bg-green-600"></div>
          <div className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center font-semibold">2</div>
          <div className="h-[2px] w-40 bg-green-600"></div>
          <div className="w-9 h-9 rounded-full bg-[#071a11] text-white flex items-center justify-center font-semibold">3</div>
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-green-100 p-8">
              <h2 className="text-2xl font-bold text-green-950 mb-6">Payment Details</h2>
              {error && (
                <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {paymentMessage && (
                <div className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  {paymentMessage}
                </div>
              )}

              <div className="mb-6 flex items-center gap-2 bg-green-50 rounded-xl p-2 border border-green-100">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mpesa')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                    paymentMethod === 'mpesa' ? 'bg-[#071a11] text-white' : 'text-green-900'
                  }`}
                >
                  M-Pesa
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                    paymentMethod === 'card' ? 'bg-[#071a11] text-white' : 'text-green-900'
                  }`}
                >
                  Card
                </button>
              </div>

              {paymentMethod === 'mpesa' ? (
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-2">M-Pesa Phone Number</label>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                      <span className="text-gray-400">📱</span>
                      <input
                        className="w-full bg-transparent outline-none text-gray-900"
                        placeholder="07XXXXXXXX or 2547XXXXXXXX"
                        value={mpesaPhone}
                        onChange={(e) => setMpesaPhone(e.target.value)}
                        required
                      />
                    </div>
                    <p className="text-xs text-green-700 mt-2">
                      You will receive an STK prompt on this phone. Enter your M-Pesa PIN to complete payment.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-green-900 mb-2">Card Number</label>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                      <span className="text-gray-400">💳</span>
                      <input
                        className="w-full bg-transparent outline-none text-gray-900"
                        placeholder="0000 0000 0000 0000"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-2">MM/YY</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-900"
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-2">CVV</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-gray-900"
                      placeholder="CVV"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/shipping" className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-full font-semibold text-center">
                  Back
                </Link>
                <button
                  onClick={handlePay}
                  disabled={isPaying || cart.length === 0}
                  className="flex-1 bg-[#071a11] text-white py-3 rounded-full font-semibold flex items-center justify-center gap-2"
                >
                  {isPaying
                    ? paymentMethod === 'mpesa'
                      ? 'Waiting for confirmation...'
                      : 'Processing card...'
                    : `Pay KSh ${total.toLocaleString()}`}
                  <span>🔒</span>
                </button>
              </div>
              {paymentMethod === 'mpesa' && (activeOrderId || lastOrderId) && (
                <button
                  onClick={handleRetryPayment}
                  disabled={isPaying}
                  className="mt-3 w-full border border-green-300 text-green-900 py-3 rounded-full font-semibold disabled:opacity-60"
                >
                  Retry STK Push
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-sm border border-green-100 p-6">
              <div className="flex items-center gap-2 text-green-950 font-semibold mb-4">
                <span>🧾</span>
                Order Summary ({cart.length} items)
              </div>

              <div className="space-y-4">
                {cart.length === 0 && (
                  <div className="text-sm text-green-700">No items in cart.</div>
                )}
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <img
                      src={item.img || item.image || 'https://via.placeholder.com/80'}
                      alt={item.title || item.name}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-green-950">{item.title || item.name}</div>
                      <div className="text-xs text-green-700">{item.age || '8 weeks'} • {item.weight || '5-6 lbs'}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 rounded-full bg-gray-100 text-green-900 font-semibold"
                        >
                          −
                        </button>
                        <span className="text-sm">{item.qty || 1}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-7 rounded-full bg-gray-100 text-green-900 font-semibold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-green-950">{item.price}</div>
                    <button onClick={() => removeItem(item.id)} className="text-red-500 text-sm">🗑</button>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-green-100 pt-4 text-sm text-green-900 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-green-700">Subtotal</span>
                  <span>KSh {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-green-700">Shipping</span>
                  <span>KSh {shipping.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold pt-2">
                  <span>Total</span>
                  <span>KSh {total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
