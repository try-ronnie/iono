import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiUrl } from '../../utils/api'
import cattleImage from '../../assets/cattle.jpeg'
import Footer from '../../components/Footer'
import { getAuthToken, getSessionUser } from '../../utils/session'

export default function FarmerHome() {
  const [activeTab, setActiveTab] = useState('listings')
  const [listings, setListings] = useState([])
  const [query, setQuery] = useState('')
  const [orders, setOrders] = useState([])
  const [paymentSummary, setPaymentSummary] = useState({
    total: 0,
    success: 0,
    pending: 0,
    failed: 0,
    revenue: 0,
  })
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState('')
  const [summaryUpdatedAt, setSummaryUpdatedAt] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const token = getAuthToken()

  useEffect(() => {
    let cancelled = false
    async function loadListings() {
      try {
        const res = await fetch(apiUrl('/listings'))
        const data = await res.json()
        const items = Array.isArray(data.items) ? data.items : []
        const current = getSessionUser()
        const email = current?.email
        const normalized = items.map((item) => ({
          id: item.id,
          title: item.title || item.name || 'Livestock Listing',
          price: item.price || 'Contact for price',
          status: item.status || 'Available',
          category: item.category || 'Cattle',
          location: item.location || 'Local Farm',
          weight: item.weight || 'N/A',
          age: item.age || 'N/A',
          img: item.imageUrl || item.image || item.img || cattleImage,
          description: item.description || '',
          ownerEmail: item.ownerEmail,
          ownerName: item.ownerName,
        }))
        const filtered = email
          ? normalized.filter((item) => String(item.ownerEmail || '').toLowerCase() === String(email).toLowerCase())
          : normalized
        if (!cancelled) setListings(filtered)
      } catch {
        if (!cancelled) setListings([])
      }
    }
    loadListings()
    return () => {
      cancelled = true
    }
  }, [])

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
    let cancelled = false
    async function loadPaymentSummary() {
      if (!token) return
      setSummaryLoading(true)
      setSummaryError('')
      try {
        const res = await fetch(apiUrl('/payments/summary'), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) {
          throw new Error('Could not load payment summary')
        }
        const data = await res.json().catch(() => ({}))
        if (!cancelled) {
          setPaymentSummary({
            total: Number(data.total || 0),
            success: Number(data.success || 0),
            pending: Number(data.pending || 0),
            failed: Number(data.failed || 0),
            revenue: Number(data.revenue || 0),
          })
          setSummaryUpdatedAt(new Date().toLocaleString())
        }
      } catch {
        if (!cancelled) setSummaryError('Could not load payment summary right now.')
      } finally {
        if (!cancelled) setSummaryLoading(false)
      }
    }
    loadPaymentSummary()
    return () => {
      cancelled = true
    }
  }, [token, orders.length])

  async function updateOrderStatus(orderId, status) {
    const res = await fetch(apiUrl(`/orders/${orderId}/status`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) return
    const data = await res.json().catch(() => ({}))
    const updatedOrder = data?.order || { id: orderId, status }
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { ...order, ...updatedOrder, status: updatedOrder.status || status }
          : order
      )
    )
    setSelectedOrder((prev) =>
      prev && prev.id === orderId
        ? { ...prev, ...updatedOrder, status: updatedOrder.status || status }
        : prev
    )
  }
  
  useEffect(() => {
    try {
      setQuery(localStorage.getItem('searchQuery') || '')
    } catch {
      setQuery('')
    }
  }, [])

  const normalizedQuery = query.trim().toLowerCase()
  const filteredListings = normalizedQuery
    ? listings.filter((i) => {
        const haystack = `${i.title} ${i.category || ''} ${i.location || ''} ${i.description || ''}`.toLowerCase()
        return haystack.includes(normalizedQuery)
      })
    : listings

  const pendingOrders = orders.filter((order) => (order.status || 'Pending') === 'Pending')

  return (
    <div className="min-h-screen bg-[#f3ffdf] text-gray-900">
      <header className="relative text-white">
        <div className="min-h-[70vh] grid lg:grid-cols-[1.1fr_1fr]">
          <div className="relative bg-[#0b1f16] overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-10 left-10 grid grid-cols-3 gap-3 opacity-30">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={`farm-dot-a-${i}`} className="w-1.5 h-1.5 rounded-full bg-green-200/70 block" />
                ))}
              </div>
              <div className="absolute top-24 right-16 grid grid-cols-4 gap-3 opacity-30">
                {Array.from({ length: 16 }).map((_, i) => (
                  <span key={`farm-dot-b-${i}`} className="w-1.5 h-1.5 rounded-full bg-green-200/70 block" />
                ))}
              </div>
            </div>

            <div className="relative z-10 px-6 lg:px-16 pt-10 pb-16 min-h-[70vh] flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-400 flex items-center justify-center font-bold text-green-950">F</div>
                  <div className="font-semibold text-lg tracking-wide">Farmart</div>
                </div>

                <nav className="hidden md:flex items-center gap-10 text-sm font-semibold">
                  <Link to="/farmer/home" className="hover:text-green-300 transition">Home</Link>
                  <Link to="/farmer/inventory" className="hover:text-green-300 transition">Market</Link>
                  <Link to="/farmer/home" className="hover:text-green-300 transition">Dashboard</Link>
                  <Link to="/farmer/orders/history" className="hover:text-green-300 transition">Orders</Link>
                  <a href="#footer" className="hover:text-green-300 transition">Contact</a>
                </nav>
              </div>

              <div className="mt-14 flex-1 flex flex-col justify-center">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#213a28] border border-[#2f5d3f] text-xs font-semibold tracking-[0.2em] text-green-200 w-fit">
                  PREMIUM LIVESTOCK
                </span>

                <h1 className="mt-8 text-4xl md:text-6xl font-extrabold leading-tight tracking-wide">
                  THE PLACE WHERE
                  <span className="block text-[#c8f279]">HEALTHY HERDS ARE</span>
                  BORN
                </h1>

                <p className="mt-6 text-green-200/80 max-w-xl leading-relaxed">
                  Connecting dedicated farmers with top-tier distributors. Manage your listings and fulfill orders with
                  clarity, speed, and confidence.
                </p>

                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <Link to="/farmer/inventory" className="px-6 py-3 rounded-full bg-[#7bb046] text-white font-semibold shadow-lg hover:brightness-110 transition">
                    VIEW MARKET
                  </Link>
                  <Link to="/farmer/animals/new" className="px-6 py-3 rounded-full bg-white text-[#0b1f16] font-semibold shadow-lg hover:bg-green-50 transition">
                    ADD LISTING
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-[#4b1fd6] via-[#4a31d9] to-[#2f65f3]">
            <div className="absolute top-10 right-12 flex items-center gap-3 z-10">
              <div className="hidden md:flex items-center gap-2 bg-white/20 border border-white/30 rounded-full px-4 py-2.5 w-64 text-sm text-white backdrop-blur">
                <span>🔍</span>
                <input
                  className="bg-transparent placeholder-white/70 outline-none w-full"
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
                className="w-11 h-11 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition"
              >
                👤
              </Link>
            </div>

            <div className="absolute top-40 right-16 grid grid-cols-4 gap-2 opacity-40">
              {Array.from({ length: 16 }).map((_, i) => (
                <span key={`farm-dot-c-${i}`} className="w-1.5 h-1.5 rounded-full bg-white/70 block" />
              ))}
            </div>

            <div className="h-full w-full flex items-end justify-center p-10">
              <img
                src={cattleImage}
                alt="Cattle in the field"
                className="w-full max-w-2xl object-cover rounded-[32px] shadow-2xl border border-white/20"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center gap-8 border-b border-green-200 pb-4">
          <button
            onClick={() => setActiveTab('listings')}
            className={`pb-3 text-sm font-semibold ${activeTab === 'listings' ? 'text-green-900 border-b-2 border-green-700' : 'text-green-700'}`}
          >
            My Listings ({listings.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 text-sm font-semibold ${activeTab === 'orders' ? 'text-green-900 border-b-2 border-green-700' : 'text-green-700'}`}
          >
            Orders ({pendingOrders.length} pending)
          </button>
        </div>

        <div className="flex items-center justify-between mt-10">
          <h2 className="text-xl font-semibold text-green-950">Your Livestock</h2>
          <Link to="/farmer/animals/new" className="bg-[#071a11] text-white px-5 py-2.5 rounded-full font-semibold flex items-center gap-2">
            <span className="text-lg">+</span>
            Add New Listing
          </Link>
        </div>

        {activeTab === 'orders' ? (
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between text-xs text-green-700">
              <span>{summaryLoading ? 'Loading payment metrics...' : summaryUpdatedAt ? `Last updated: ${summaryUpdatedAt}` : 'Metrics not loaded yet'}</span>
              {summaryError && <span className="text-red-700">{summaryError}</span>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-green-100 p-4">
                <div className="text-xs text-green-700">Successful Payments</div>
                <div className="text-2xl font-bold text-green-900 mt-1">{summaryLoading ? '...' : paymentSummary.success}</div>
              </div>
              <div className="bg-white rounded-xl border border-green-100 p-4">
                <div className="text-xs text-green-700">Pending Payments</div>
                <div className="text-2xl font-bold text-amber-700 mt-1">{summaryLoading ? '...' : paymentSummary.pending}</div>
              </div>
              <div className="bg-white rounded-xl border border-green-100 p-4">
                <div className="text-xs text-green-700">Failed Payments</div>
                <div className="text-2xl font-bold text-red-700 mt-1">{summaryLoading ? '...' : paymentSummary.failed}</div>
              </div>
              <div className="bg-white rounded-xl border border-green-100 p-4">
                <div className="text-xs text-green-700">Revenue (Paid)</div>
                <div className="text-2xl font-bold text-green-900 mt-1">
                  {summaryLoading ? '...' : `KSh ${Number(paymentSummary.revenue || 0).toLocaleString()}`}
                </div>
              </div>
            </div>
            {pendingOrders.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-green-100 py-16 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-green-100 text-green-500 flex items-center justify-center mx-auto mb-4">
                  ⬚
                </div>
                <h3 className="text-lg font-semibold text-green-950">No pending orders</h3>
                <p className="text-sm text-green-700 mt-2">Orders placed by customers will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {pendingOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-semibold text-green-950">Order {order.id}</div>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                        {order.status || 'Pending'}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {order.items?.map((item) => (
                        <div key={`${order.id}-${item.id}`} className="flex items-center gap-3">
                          <img
                            src={item.img || item.image || 'https://via.placeholder.com/60'}
                            alt={item.title || item.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-green-950">{item.title || item.name}</div>
                            <div className="text-xs text-green-700">{item.weight || '5-6 lbs'} • {item.age || '8 weeks'}</div>
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
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => {
                          updateOrderStatus(order.id, 'Accepted')
                          setSelectedOrder(order)
                        }}
                        className="flex-1 bg-green-900 text-white py-2 rounded-full font-semibold hover:bg-green-800 transition"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'Rejected')}
                        className="flex-1 border border-red-300 text-red-600 py-2 rounded-full font-semibold hover:bg-red-50 transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="mt-8 bg-white rounded-3xl shadow-sm border border-green-100 py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-green-100 text-green-500 flex items-center justify-center mx-auto mb-4">
              ⬚
            </div>
            <h3 className="text-lg font-semibold text-green-950">No listings yet</h3>
            <p className="text-sm text-green-700 mt-2">Start by adding your first livestock listing</p>
            <Link to="/farmer/animals/new" className="mt-6 inline-block bg-[#071a11] text-white px-6 py-3 rounded-full font-semibold">
              Add Your First Listing
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
                {item.img ? (
                  <img src={item.img} alt={item.title} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-green-50 flex items-center justify-center text-green-300">
                    No image
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-green-950">{item.title}</h3>
                  <p className="text-sm text-green-700 mt-1">{item.description || 'No description'}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-semibold text-green-900">{item.price}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">{item.status || 'Available'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-green-950">Order Details</div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-green-900 font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 text-sm text-green-800">
              <div>Order ID: {selectedOrder.id}</div>
              <div>Status: {selectedOrder.status || 'Pending'}</div>
              <div>
                Customer: {selectedOrder.user?.name || 'Customer'} ({selectedOrder.user?.email || 'customer@example.com'})
              </div>
            </div>

            <div className="space-y-3">
              {selectedOrder.items?.map((item) => (
                <div key={`${selectedOrder.id}-${item.id}`} className="flex items-center gap-3">
                  <img
                    src={item.img || item.image || 'https://via.placeholder.com/60'}
                    alt={item.title || item.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-green-950">{item.title || item.name}</div>
                    <div className="text-xs text-green-700">{item.weight || '5-6 lbs'} • {item.age || '8 weeks'}</div>
                  </div>
                  <div className="text-sm font-semibold text-green-950">{item.price}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-green-100 flex items-center justify-between text-sm">
              <span className="text-green-700">Total</span>
              <span className="font-semibold text-green-950">KSh {Number(selectedOrder.total || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
      <div id="footer">
        <Footer />
      </div>
    </div>
  )
}
