import React, { useEffect, useState } from 'react'
import { apiUrl } from '../../utils/api'
import { getAuthToken } from '../../utils/session'

export default function OrderManagement() {
  const [orders, setOrders] = useState([])
  const [contact, setContact] = useState(null)
  const token = getAuthToken()

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
    localStorage.setItem('orders', JSON.stringify(orders))
  }, [orders])

  const updateStatus = async (id, newStatus) => {
    const res = await fetch(apiUrl(`/orders/${id}/status`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) return
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)))
  }

  const handleAccept = (id) => updateStatus(id, 'Accepted')
  const handleReject = (id) => updateStatus(id, 'Rejected')

  const session = sessionStorage.getItem('user')
  const currentUser = session ? JSON.parse(session) : null

  const filteredOrders = currentUser
    ? currentUser.type === 'Farmer'
      ? orders.filter((o) => o.farmerEmail === currentUser.email)
      : orders.filter((o) => o.buyerEmail === currentUser.email)
    : orders

  const pendingCount = filteredOrders.filter((o) => o.status === 'Pending').length

  return (
    <div className="min-h-screen p-8 bg-gray-50 flex items-start justify-center">
      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-white border-b p-4 flex items-center justify-between">
            <div className="text-xl font-bold">Order Management</div>
            <div className="text-sm text-gray-600">Pending: <span className="font-semibold">{pendingCount}</span></div>
          </div>

          <div className="p-6 space-y-4">
            {filteredOrders.length === 0 && <div className="text-center text-gray-500">No orders yet</div>}

            {filteredOrders.map((o) => (
              <div key={o.id} className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">Order #{o.id}</div>
                    <div className="text-sm text-gray-600">{o.buyerName}</div>
                    <div className="mt-2 text-sm text-gray-700">
                      {o.items.map((it, idx) => (
                        <div key={idx} className="text-sm">{it.qty} × {it.name} — KSh {it.price}</div>
                      ))}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`${o.status === 'Pending' ? 'bg-amber-400 text-amber-900' : o.status === 'Accepted' ? 'bg-green-700 text-white' : 'bg-red-800 text-white'} px-3 py-1 rounded-full text-sm font-semibold inline-block`}>{o.status}</div>
                    <div className="mt-2 font-bold">KSh {o.total}</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(o.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  {o.status === 'Pending' ? (
                    <>
                      <button onClick={() => handleAccept(o.id)} className="flex-1 bg-green-700 text-white py-2 rounded-lg font-semibold">Accept</button>
                      <button onClick={() => handleReject(o.id)} className="flex-1 bg-red-800 text-white py-2 rounded-lg font-semibold">Reject</button>
                    </>
                  ) : (
                    <div className="flex-1 text-sm text-gray-600 py-2">Status: <span className="font-semibold">{o.status}</span></div>
                  )}

                  <button onClick={() => setContact(o)} className="bg-white border px-4 py-2 rounded-lg">Contact Buyer</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {contact && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold">Contact Buyer</div>
                <button onClick={() => setContact(null)} className="text-gray-500">Close</button>
              </div>
              <div className="text-sm text-gray-700">Name: <span className="font-semibold">{contact.buyerName}</span></div>
              <div className="text-sm text-gray-700">Email: <a href={`mailto:${contact.buyerEmail}`} className="text-blue-600">{contact.buyerEmail}</a></div>
              <div className="mt-4">
                <button onClick={() => { window.location.href = `mailto:${contact.buyerEmail}` }} className="bg-green-700 text-white px-4 py-2 rounded-lg mr-2">Open Email</button>
                <button onClick={() => { navigator.clipboard?.writeText(contact.buyerEmail); alert('Email copied') }} className="bg-gray-100 border px-4 py-2 rounded-lg">Copy Email</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
