import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiUrl } from '../../utils/api'
import { getAuthToken, getUserDisplayName } from '../../utils/session'
import Footer from '../../components/Footer'

export default function AnimalForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [form, setForm] = useState({
    name: '',
    category: 'Cattle',
    breed: '',
    location: '',
    price: '',
    maxPrice: '',
    weight: '',
    age: '',
    imageUrl: '',
    description: '',
    health: '',
  })
  const [query, setQuery] = useState('')
  const displayName = getUserDisplayName()
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const token = getAuthToken()

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }
  
  React.useEffect(() => {
    try {
      setQuery(localStorage.getItem('searchQuery') || '')
    } catch {
      setQuery('')
    }
  }, [])

  useEffect(() => {
    if (!isEdit) return
    try {
      const stored = JSON.parse(localStorage.getItem('listings') || '[]')
      const list = Array.isArray(stored) ? stored : []
      const found = list.find((item) => String(item.id) === String(id))
      if (found) {
        setForm({
          name: found.title || '',
          category: found.category || 'Cattle',
          breed: found.breed || '',
          location: found.location || '',
          price: found.price || '',
          maxPrice: found.maxPrice || '',
          weight: found.weight || '',
          age: found.age || '',
          imageUrl: found.img || found.image || found.imageUrl || '',
          description: found.description || '',
          health: found.health || '',
        })
      }
    } catch {
      // ignore and keep defaults
    }
  }, [id, isEdit])

  function readListings() {
    try {
      return JSON.parse(localStorage.getItem('listings') || '[]')
    } catch {
      return []
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.name || !form.price) {
      setError('Please enter required fields')
      return
    }

    setSaving(true)

    // Build listing object. Use base64 image preview if provided so it persists in localStorage
    const session = sessionStorage.getItem('user')
    const user = session ? JSON.parse(session) : null

    const listing = {
      id: isEdit ? id : Date.now(),
      title: form.name,
      price: form.price,
      description: form.description,
      category: form.category,
      location: form.location,
      weight: form.weight,
      age: form.age,
      imageUrl: form.imageUrl,
      status: 'Available',
      img: form.imageUrl || null,
      createdAt: new Date().toISOString(),
      ownerEmail: user?.email || 'farmer@example.com',
      ownerName: user?.name || user?.username || 'Farmer',
    }

    const url = isEdit
      ? apiUrl(`/listings/${listing.id}`)
      : apiUrl('/listings')
    const res = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        title: listing.title,
        price: listing.price,
        description: listing.description,
        category: listing.category,
        location: listing.location,
        weight: listing.weight,
        age: listing.age,
        imageUrl: listing.imageUrl,
        status: listing.status,
      }),
    })
    if (!res.ok) {
      setError('Failed to save listing')
      setSaving(false)
      return
    }

    setTimeout(() => {
      setSaving(false)
      navigate('/farmer/inventory')
    }, 500)
  }

  return (
    <div className="min-h-screen bg-[#f3ffdf]">
      {/* Header */}
      <header className="bg-[#071a11] text-white">
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-10">
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
            <h1 className="text-5xl md:text-6xl font-bold tracking-wide">Farmer Dashboard</h1>
            <p className="text-green-300 mt-3">Manage your livestock and orders</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl shadow-sm border border-green-100 p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-green-950 mb-6">
            {isEdit ? 'Edit Listing' : 'Add New Listing'}
          </h1>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-green-900 mb-2">Animal Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g., Premium Angus Cattle"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-900 mb-2">Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 text-gray-900 border border-gray-100"
              >
                <option>Cattle</option>
                <option>Sheep</option>
                <option>Poultry</option>
                <option>Pigs</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-900 mb-2">Breed</label>
              <input
                name="breed"
                value={form.breed}
                onChange={handleChange}
                placeholder="e.g., Angus"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-900 mb-2">Location</label>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g., Midwest Valley"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-900 mb-2">Price (KSh)</label>
              <input
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="2400"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-900 mb-2">Max Price (optional, KSh)</label>
              <input
                name="maxPrice"
                value={form.maxPrice}
                onChange={handleChange}
                placeholder="3200"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-900 mb-2">Weight</label>
              <input
                name="weight"
                value={form.weight}
                onChange={handleChange}
                placeholder="e.g., 1,200 lbs"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-900 mb-2">Age (months)</label>
              <input
                name="age"
                value={form.age}
                onChange={handleChange}
                placeholder="24"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-100"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-green-900 mb-2">Image URL</label>
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                <span className="text-green-500">🖼️</span>
                <input
                  name="imageUrl"
                  value={form.imageUrl}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg (optional)"
                  className="w-full bg-transparent outline-none placeholder-gray-400 text-black"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-green-900 mb-2">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe your livestock..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-100 resize-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-green-900 mb-2">Health Records</label>
              <input
                name="health"
                value={form.health}
                onChange={handleChange}
                placeholder="e.g., Vaccinated, Dewormed, Health Certificate Available"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-100"
              />
            </div>

            {error && <div className="md:col-span-2 text-red-600 text-sm">{error}</div>}

            <div className="md:col-span-2 flex flex-col md:flex-row gap-4 mt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full md:w-1/2 border border-gray-300 text-gray-700 py-3 rounded-full font-semibold"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full md:w-1/2 bg-[#071a11] text-white py-3 rounded-full font-semibold hover:bg-[#0b2417] transition"
                disabled={saving}
              >
                {saving ? 'Adding...' : 'Add Listing'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div id="footer">
        <Footer />
      </div>
    </div>
  )
}
