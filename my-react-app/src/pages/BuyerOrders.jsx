import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiUrl } from '../utils/api'
import { getAuthToken, getUserDisplayName, isFarmerUser } from '../utils/session'
import useOrderDecisionCount from '../hooks/useOrderDecisionCount'

export default function BuyerOrders() {
  const [orders, setOrders] = useState([])
  const [query, setQuery] = useState('')
  const [retryingOrderId, setRetryingOrderId] = useState(null)
  const [retryPhone, setRetryPhone] = useState('')
  const [retryMessage, setRetryMessage] = useState('')
  const [retryError, setRetryError] = useState('')
  const displayName = getUserDisplayName()
  const isFarmer = isFarmerUser()
  const homeLink = isFarmer ? '/farmer/home' : '/home'
  const marketLink = isFarmer ? '/farmer/inventory' : '/market'
  const token = getAuthToken()
  const decisionCount = useOrderDecisionCount()

  useEffect(() => {
    let cancelled = false
    async function loadOrders() {
      const res = await fetch(apiUrl('/orders'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      const items = Array.isArray(data.items) ? data.items : []
      if (!cancelled) setOrders(items)
    }
    loadOrders()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    try {
      setQuery(localStorage.getItem('searchQuery') || '')
    } catch {
      setQuery('')
    }
  }, [])

  const session = sessionStorage.getItem('user')
  const currentUser = session ? JSON.parse(session) : null
  const email = currentUser?.email

  const myOrders = useMemo(() => {
    if (!email) return orders
    return orders.filter((o) => (o.buyerEmail || o.user?.email) === email)
  }, [orders, email])

  const notifications = useMemo(() => {
    return myOrders
      .filter((order) => order.status === 'Accepted' || order.status === 'Rejected')
      .map((order) => ({
        id: `${order.id}-${order.status}`,
        orderId: order.id,
        status: order.status,
        message:
          order.status === 'Accepted'
            ? `Order ${order.id} was accepted. Your order will be processed for delivery.`
            : `Order ${order.id} was rejected. This order will not be delivered.`,
      }))
  }, [myOrders])

  async function retryPayment(orderId) {
    setRetryError('')
    setRetryMessage('')
    setRetryingOrderId(orderId)
    const res = await fetch(apiUrl('/payments/mpesa/retry'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ orderId, phoneNumber: retryPhone || undefined }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setRetryError(data.error || 'Could not retry payment')
      setRetryingOrderId(null)
      return
    }
    setRetryMessage(data.message || 'STK push sent. Confirm on your phone.')
    setRetryingOrderId(null)

    const reload = await fetch(apiUrl('/orders'), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (reload.ok) {
      const payload = await reload.json().catch(() => ({}))
      const items = Array.isArray(payload.items) ? payload.items : []
      setOrders(items)
    }
  }

  return (
    <div className="min-h-screen bg-[#f3ffdf]">
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
              <Link to="/orders" className="hover:text-green-300 transition inline-flex items-center gap-2">
                Orders
                {decisionCount > 0 && (
                  <span className="inline-flex min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] leading-none font-bold items-center justify-center">
                    {decisionCount}
                  </span>
                )}
              </Link>
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
            </div>
          </div>
          <div className="text-center mt-10">
            <h1 className="text-4xl md:text-5xl font-bold tracking-wide">Order History</h1>
            <p className="text-green-300 mt-3">Your previous purchases and order status.</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {(retryError || retryMessage) && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              retryError ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-800'
            }`}
          >
            {retryError || retryMessage}
          </div>
        )}
        {notifications.length > 0 && (
          <div className="mb-6 space-y-3">
            {notifications.map((note) => (
              <div
                key={note.id}
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  note.status === 'Accepted'
                    ? 'border-green-200 bg-green-50 text-green-900'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {note.message}
              </div>
            ))}
          </div>
        )}
        {myOrders.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-green-100 py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-green-100 text-green-500 flex items-center justify-center mx-auto mb-4">
              ⬚
            </div>
            <h3 className="text-lg font-semibold text-green-950">No orders yet</h3>
            <p className="text-sm text-green-700 mt-2">Orders you place will appear here.</p>
            <Link to={marketLink} className="mt-6 inline-block bg-[#071a11] text-white px-6 py-3 rounded-full font-semibold">
              Browse Market
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {myOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-semibold text-green-950">Order {order.id}</div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                    {order.status || 'Pending'}
                  </span>
                </div>
                <div className="space-y-3">
                  {order.items?.map((item, idx) => (
                    <div key={`${order.id}-${idx}`} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-green-950">{item.title || item.name}</div>
                        <div className="text-xs text-green-700">
                          {item.qty || 1} × {item.weight || 'Item'}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-green-950">{item.price}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-green-100 flex items-center justify-between text-sm">
                  <span className="text-green-700">Total</span>
                  <span className="font-semibold text-green-950">KSh {Number(order.total || 0).toLocaleString()}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-green-700">Payment</span>
                  <span
                    className={`px-2 py-1 rounded-full font-semibold ${
                      order.paymentStatus === 'SUCCESS'
                        ? 'bg-green-100 text-green-800'
                        : order.paymentStatus === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : order.paymentStatus === 'FAILED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {order.paymentStatus || 'NOT_INITIATED'}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-green-700">
                  <div>Method: <span className="font-semibold text-green-900">{order.paymentMethod || 'N/A'}</span></div>
                  <div>Receipt: <span className="font-semibold text-green-900">{order.paymentReceipt || 'N/A'}</span></div>
                </div>
                {(order.paymentStatus === 'PENDING' || order.paymentStatus === 'FAILED') && (
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input
                      value={retryPhone}
                      onChange={(e) => setRetryPhone(e.target.value)}
                      placeholder="Use same phone or enter 07XXXXXXXX"
                      className="flex-1 px-3 py-2 border border-green-200 rounded-lg text-sm text-green-950"
                    />
                    <button
                      onClick={() => retryPayment(order.id)}
                      disabled={retryingOrderId === order.id}
                      className="px-4 py-2 rounded-lg bg-[#071a11] text-white text-sm font-semibold disabled:opacity-60"
                    >
                      {retryingOrderId === order.id ? 'Retrying...' : 'Retry M-Pesa'}
                    </button>
                  </div>
                )}
                <div className="mt-2 text-xs text-green-700">
                  Placed on {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
