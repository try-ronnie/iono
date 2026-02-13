import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import cattleImage from '../assets/cattle.jpeg'
import { apiUrl } from '../utils/api'
import { getAuthToken } from '../utils/session'

export default function Delivery() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [qty, setQty] = useState(1)
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    county: '',
    postalCode: '',
    phone: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const token = getAuthToken()

  useEffect(() => {
    const all = JSON.parse(localStorage.getItem('listings') || '[]')
    let found = all.find((l) => String(l.id) === String(id))
    if (!found) {
      // fallback sample (when visiting homepage samples)
      found = {
        id,
        title: 'Sample Holstein cow',
        price: 1200,
        description: 'Sample listing',
        img: cattleImage,
        ownerEmail: 'farmer@example.com',
      }
    }
    setListing(found)

    const session = sessionStorage.getItem('user')
    if (session) {
      const u = JSON.parse(session)
      if (u && u.email) setBuyerEmail(u.email)
      if (u && u.name) setBuyerName(u.name)
    }
  }, [id])

  function readOrders() {
    try {
      return JSON.parse(localStorage.getItem('orders') || '[]')
    } catch {
      return []
    }
  }

  function saveOrder(order) {
    const list = readOrders()
    list.unshift(order)
    localStorage.setItem('orders', JSON.stringify(list))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const missing = []
    if (!buyerName.trim()) missing.push('name')
    if (!buyerEmail.trim()) missing.push('email')
    if (!address.line1.trim()) missing.push('address line 1')
    if (!address.city.trim()) missing.push('city')
    if (!address.county.trim()) missing.push('county')
    if (!address.phone.trim()) missing.push('phone')
    if (missing.length) {
      setError(`Please enter: ${missing.join(', ')}`)
      return
    }

    setLoading(true)

    const priceNum = typeof listing.price === 'string' ? parseFloat(String(listing.price).replace(/[^0-9.]/g, '')) || 0 : Number(listing.price || 0)
    const total = priceNum * qty

    const order = {
      id: Date.now(),
      listingId: listing.id,
      buyerName,
      buyerEmail,
      deliveryAddress: address,
      farmerEmail: listing.ownerEmail || 'farmer@example.com',
      items: [{ name: listing.title || listing.name || 'Animal', qty, price: priceNum }],
      total,
      status: 'Pending',
      createdAt: Date.now(),
    }

    const res = await fetch(apiUrl('/orders'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        items: order.items,
        total: order.total,
        farmerEmail: order.farmerEmail,
        deliveryAddress: order.deliveryAddress,
      }),
    })
    if (!res.ok) {
      setLoading(false)
      alert('Failed to place order')
      return
    }

    setTimeout(() => {
      setLoading(false)
      alert('Order placed — the farmer will be notified')
      navigate('/')
    }, 500)
  }

  if (!listing) return <div className="min-h-screen p-8">Loading...</div>

  return (
    <div className="min-h-screen p-8 bg-gray-50 flex items-start justify-center">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow p-6">
        <div className="flex gap-6">
          <img src={listing.img || 'https://via.placeholder.com/300x220'} alt={listing.title} className="w-48 h-40 object-cover rounded" />
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{listing.title || listing.name}</h2>
            <div className="text-gray-600 mb-3">{listing.description}</div>
            <div className="font-semibold text-lg mb-3">Price: KSh {typeof listing.price === 'number' ? listing.price : listing.price}</div>
            <div className="text-sm text-gray-500 mb-3">Seller: {listing.ownerEmail || 'farmer@example.com'}</div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-700">Quantity</label>
                <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value || 1))} className="w-28 px-3 py-2 border rounded text-black bg-white" />
              </div>

              <div>
                <label className="block text-sm text-gray-700">Your name</label>
                <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="w-full px-3 py-2 border rounded text-black bg-white" placeholder="Your full name" />
              </div>

              <div>
                <label className="block text-sm text-gray-700">Your email</label>
                <input value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} className="w-full px-3 py-2 border rounded text-black bg-white" placeholder="you@example.com" type="email" />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="text-sm font-semibold text-gray-800 mb-2">Delivery address</div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-700">Address line 1</label>
                    <input
                      value={address.line1}
                      onChange={(e) => setAddress((prev) => ({ ...prev, line1: e.target.value }))}
                      className="w-full px-3 py-2 border rounded text-black bg-white"
                      placeholder="Street address"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Address line 2 (optional)</label>
                    <input
                      value={address.line2}
                      onChange={(e) => setAddress((prev) => ({ ...prev, line2: e.target.value }))}
                      className="w-full px-3 py-2 border rounded text-black bg-white"
                      placeholder="Apartment, suite, etc."
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-700">City/Town</label>
                      <input
                        value={address.city}
                        onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
                        className="w-full px-3 py-2 border rounded text-black bg-white"
                        placeholder="City"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700">County/Region</label>
                      <input
                        value={address.county}
                        onChange={(e) => setAddress((prev) => ({ ...prev, county: e.target.value }))}
                        className="w-full px-3 py-2 border rounded text-black bg-white"
                        placeholder="County"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-700">Postal code (optional)</label>
                      <input
                        value={address.postalCode}
                        onChange={(e) => setAddress((prev) => ({ ...prev, postalCode: e.target.value }))}
                        className="w-full px-3 py-2 border rounded text-black bg-white"
                        placeholder="Postal code"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700">Phone</label>
                      <input
                        value={address.phone}
                        onChange={(e) => setAddress((prev) => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border rounded text-black bg-white"
                        placeholder="Phone number"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-green-700 text-white py-2 rounded" disabled={loading}>{loading ? 'Placing...' : 'Place Order'}</button>
                <button type="button" onClick={() => navigate(-1)} className="flex-1 bg-white border py-2 rounded">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
