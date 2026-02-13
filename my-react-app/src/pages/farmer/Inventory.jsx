import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiUrl } from '../../utils/api'
import { getAuthToken, getSessionUser, getUserDisplayName } from '../../utils/session'
import Footer from '../../components/Footer'
import cattleImage from '../../assets/cattle.jpeg'
import sheepImage from '../../assets/sheep.jpeg'
import henImage from '../../assets/hen.jpeg'
import pigsImage from '../../assets/pigs.jpeg'

export default function Inventory() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('All')
  const [listings, setListings] = useState([])
  const [query, setQuery] = useState('')
  const displayName = getUserDisplayName()
  const token = getAuthToken()
  const currentUser = getSessionUser()

  React.useEffect(() => {
    let cancelled = false
    async function loadListings() {
      const res = await fetch(apiUrl('/listings'))
      const data = await res.json()
      const items = Array.isArray(data.items) ? data.items : []
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
      const email = currentUser?.email
      const filtered = email
        ? normalized.filter((item) => String(item.ownerEmail || '').toLowerCase() === String(email).toLowerCase())
        : normalized
      if (!cancelled) {
        setListings(filtered)
      }
    }

    loadListings()
    return () => {
      cancelled = true
    }
  }, [])

  async function deleteListing(id) {
    const res = await fetch(apiUrl(`/listings/${id}`), {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return
    const next = listings.filter((l) => l.id !== id)
    setListings(next)
  }

  function editListing(listing) {
    navigate(`/farmer/animals/edit/${listing.id}`)
  }
  
  React.useEffect(() => {
    try {
      setQuery(localStorage.getItem('searchQuery') || '')
    } catch {
      setQuery('')
    }
  }, [])
  


  const filters = ['All', 'Cattle', 'Sheep', 'Poultry', 'Pigs']
  const normalizedQuery = query.trim().toLowerCase()
  const filteredByCategory = filter === 'All' ? listings : listings.filter((i) => i.category === filter)
  const filtered = normalizedQuery
    ? filteredByCategory.filter((i) => {
        const haystack = `${i.title} ${i.category} ${i.location} ${i.description || ''}`.toLowerCase()
        return haystack.includes(normalizedQuery)
      })
    : filteredByCategory

  return (
    <div className="min-h-screen bg-[#f3ffdf]">
      {/* Header */}
      <header className="bg-[#071a11] text-white">
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-12">
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
                <span className="text-green-200">⚙</span>
                {displayName}
                <span className="text-green-200">↗</span>
              </Link>
            </div>
          </div>

          <div className="text-center mt-12">
            <h1 className="text-4xl md:text-5xl font-bold tracking-wide">Livestock Marketplace</h1>
            <p className="text-green-300 mt-3">Find the perfect addition to your herd from our verified sellers.</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-10">
          <div>
            <h2 className="text-3xl font-bold text-green-950 mb-3">Current Listings</h2>
            <p className="text-green-800 text-lg max-w-xl">
              Browse the latest livestock listings from certified local farmers ready for distribution.
            </p>
            <p className="text-green-700 mt-3 font-semibold">
              {filtered.length} listings found
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="px-5 py-2 rounded-full bg-white text-green-900 border border-green-200 shadow-sm font-medium">
              Filters
            </button>
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-2 rounded-full font-semibold transition ${
                  filter === f
                    ? 'bg-green-900 text-white'
                    : 'bg-white text-green-900 border border-green-200 hover:bg-green-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {filtered.map((it) => (
            <div
              key={it.id}
              className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition border border-green-100"
            >
              <div className="relative">
                <img
                  src={it.img || it.image || 'https://via.placeholder.com/400x300'}
                  alt={it.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-green-900">
                  {it.category}
                </div>
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold bg-green-900/90 text-white">
                  {it.location}
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-green-900 mb-1">{it.title}</h3>
                <p className="text-green-700 text-sm mb-4">{it.description || it.location}</p>

                <div className="grid grid-cols-2 gap-y-2 text-sm text-green-800 mb-4">
                  <div>{it.weight}</div>
                  <div>{it.age}</div>
                </div>
                <div className="text-xs text-green-700 mb-3">
                  Owner: {it.ownerName || it.ownerEmail || 'Farmer'}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-green-100">
                  <p className="text-green-900 font-bold">{it.price}</p>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => editListing(it)}
                    className="flex-1 border border-green-300 text-green-900 py-2 rounded-full font-semibold hover:bg-green-50 transition"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteListing(it.id)}
                    className="flex-1 border border-red-300 text-red-600 py-2 rounded-full font-semibold hover:bg-red-50 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div id="footer">
        <Footer />
      </div>
    </div>
  )
}
