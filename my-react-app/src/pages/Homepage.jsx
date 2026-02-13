import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiUrl } from '../utils/api'
import { isFarmerUser } from '../utils/session'
import useOrderDecisionCount from '../hooks/useOrderDecisionCount'
import Footer from '../components/Footer'
import cattleImage from '../assets/cattle.jpeg'
import hen from '../assets/hen.jpeg'
import pigs from '../assets/pigs.jpeg'
import sheep from '../assets/sheep.jpeg'

export default function Homepage() {
  const [selectedFilter, setSelectedFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [cartCount, setCartCount] = useState(0)
  const [toast, setToast] = useState('')
  const [allListings, setAllListings] = useState([])
  const isFarmer = isFarmerUser()
  const decisionCount = useOrderDecisionCount()
  const homeLink = isFarmer ? '/farmer/home' : '/home'
  const marketLink = isFarmer ? '/farmer/inventory' : '/market'
  const dashboardLink = isFarmer ? '/farmer/home' : '/home'

  function formatPrice(value) {
    if (value === null || value === undefined) return 'KSh 0'
    const raw = String(value).trim()
    if (!raw) return 'KSh 0'
    if (/contact/i.test(raw)) return raw
    if (/ksh/i.test(raw)) return raw.replace(/\bKSH\b/i, 'KSh')
    if (raw.includes('$')) return raw.replace(/\$/g, 'KSh ')
    const numeric = Number(raw.replace(/[^0-9.]/g, ''))
    if (!Number.isNaN(numeric) && numeric > 0) return `KSh ${numeric.toLocaleString()}`
    return `KSh ${raw}`
  }

  const demoListings = [
    {
      id: 1,
      name: 'Premium Angus Cattle',
      location: 'Midwest Valley',
      weight: '1200 lbs',
      age: '24 months',
      price: 'KSh 2,600 - KSh 3,200',
      category: 'Cattle',
      ownerName: 'Farmart Verified',
      image: cattleImage,
    },
    {
      id: 2,
      name: 'Grassland Highlands',
      location: 'Highland Farm',
      weight: '200 lbs',
      age: '12 months',
      price: 'KSh 450 - KSh 600',
      category: 'Cattle',
      ownerName: 'Highland Farm',
      image: sheep,
    },
    {
      id: 3,
      name: 'British Blue Chickens',
      location: 'Sunshine Poultry',
      weight: '5-8 lbs',
      age: '8 weeks',
      price: 'KSh 12.50/bird',
      category: 'Poultry',
      ownerName: 'Sunshine Poultry',
      image: hen,
    },
    {
      id: 4,
      name: 'Berkshire Pigs',
      location: 'Oak Ridge Farm',
      weight: '250 lbs',
      age: '18 months',
      price: 'KSh 800 - KSh 1,100',
      category: 'Pigs',
      ownerName: 'Oak Ridge Farm',
      image: pigs,
    },
  ]

  useEffect(() => {
    try {
      setQuery(localStorage.getItem('searchQuery') || '')
    } catch {
      setQuery('')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadListings() {
      const res = await fetch(apiUrl('/listings'))
      const data = await res.json()
      const items = Array.isArray(data.items) ? data.items : []
      const normalized = items.map((item) => ({
        id: item.id,
        name: item.title || item.name || 'Livestock Listing',
        location: item.location || 'Local Farm',
        weight: item.weight || 'N/A',
        age: item.age || 'N/A',
        price: item.price || 'Contact for price',
        category: item.category || 'Cattle',
        image: item.imageUrl || item.image || item.img || cattleImage,
        ownerName: item.ownerName || item.ownerEmail || 'Farmer',
        ownerEmail: item.ownerEmail || '',
      }))
      if (!cancelled) setAllListings([...normalized, ...demoListings])
    }
    loadListings()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]')
      setCartCount(Array.isArray(cart) ? cart.length : 0)
    } catch {
      setCartCount(0)
    }
  }, [])

  function addToCart(item) {
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]')
      const next = Array.isArray(cart) ? cart : []
      next.push(item)
      localStorage.setItem('cart', JSON.stringify(next))
      setCartCount(next.length)
    } catch {
      localStorage.setItem('cart', JSON.stringify([item]))
      setCartCount(1)
    }

    setToast(`${item.name} added to cart!`)
    setTimeout(() => setToast(''), 2000)
  }

  const filteredLivestockByCategory =
    selectedFilter === 'All'
      ? allListings
      : allListings.filter((item) => item.category === selectedFilter)

  const normalizedQuery = query.trim().toLowerCase()
  const filteredLivestock = normalizedQuery
    ? filteredLivestockByCategory.filter((item) => {
        const haystack = `${item.name} ${item.category} ${item.location}`.toLowerCase()
        return haystack.includes(normalizedQuery)
      })
    : filteredLivestockByCategory

  if (isFarmer) {
    return (
      <div className="min-h-screen bg-[#0b1f16]">
        <div className="h-screen w-full">
          <img
            src={cattleImage}
            alt="Cattle in the field"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    )
  }

return (
    <div className="min-h-screen bg-[#f3ffdf]">
        <header className="relative" id="top">
            <div className="min-h-[88vh] grid lg:grid-cols-[1.1fr_1fr]">
                <div className="relative bg-[#0b1f16] text-white overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-10 left-10 grid grid-cols-3 gap-3 opacity-30">
                            {Array.from({ length: 9 }).map((_, i) => (
                                <span key={`dot-a-${i}`} className="w-1.5 h-1.5 rounded-full bg-green-200/70 block" />
                            ))}
                        </div>
                        <div className="absolute bottom-10 left-10 grid grid-cols-3 gap-3 opacity-30">
                            {Array.from({ length: 9 }).map((_, i) => (
                                <span key={`dot-b-${i}`} className="w-1.5 h-1.5 rounded-full bg-green-200/70 block" />
                            ))}
                        </div>
                        <div className="absolute top-32 right-12 grid grid-cols-4 gap-3 opacity-30">
                            {Array.from({ length: 16 }).map((_, i) => (
                                <span key={`dot-c-${i}`} className="w-1.5 h-1.5 rounded-full bg-green-200/70 block" />
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10 px-6 lg:px-16 pt-10 pb-16 min-h-[88vh] flex flex-col">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-green-400 flex items-center justify-center font-bold text-green-950">F</div>
                                <div className="font-semibold text-lg tracking-wide">Farmart</div>
                            </div>

                            <nav className="hidden md:flex items-center gap-10 text-sm font-semibold">
                                <Link to={homeLink} className="hover:text-green-300 transition">Home</Link>
                                <Link to={marketLink} className="hover:text-green-300 transition">Market</Link>
                                <Link to={dashboardLink} className="hover:text-green-300 transition">Dashboard</Link>
                                <a href="#footer" className="hover:text-green-300 transition">Contact</a>
                                <Link to="/orders" className="hover:text-green-300 transition inline-flex items-center gap-2">
                                    Orders
                                    {decisionCount > 0 && (
                                        <span className="inline-flex min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] leading-none font-bold items-center justify-center">
                                            {decisionCount}
                                        </span>
                                    )}
                                </Link>
                            </nav>
                        </div>

                        <div className="mt-16 flex-1 flex flex-col justify-center">
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#213a28] border border-[#2f5d3f] text-xs font-semibold tracking-[0.2em] text-green-200 w-fit">
                                PREMIUM LIVESTOCK
                            </span>

                            <h1 className="mt-8 text-4xl md:text-6xl font-extrabold leading-tight tracking-wide">
                                THE PLACE WHERE
                                <span className="block text-[#c8f279]">HEALTHY HERDS ARE</span>
                                BORN
                            </h1>

                            <p className="mt-6 text-green-200/80 max-w-xl leading-relaxed">
                                Connecting dedicated farmers with top-tier distributors. We ensure your livestock reaches the market
                                with the care, health standards, and quality they deserve.
                            </p>

                            <div className="mt-10 flex flex-wrap items-center gap-4">
                                <Link to={marketLink} className="px-6 py-3 rounded-full bg-[#7bb046] text-white font-semibold shadow-lg hover:brightness-110 transition">
                                    VIEW MARKET
                                </Link>
                                <a href="#current-listings" className="px-6 py-3 rounded-full bg-white text-[#0b1f16] font-semibold shadow-lg hover:bg-green-50 transition">
                                    LEARN MORE
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-[#2f46c7] via-[#2c5ad7] to-[#1e7ddc]">
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
                        <div className="relative">
                            <Link
                              to="/shipping"
                              onClick={() => localStorage.removeItem('deliveryAddress')}
                              className="w-11 h-11 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition"
                            >
                                🛒
                            </Link>
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                    {cartCount}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="absolute top-40 right-16 grid grid-cols-4 gap-2 opacity-40">
                        {Array.from({ length: 16 }).map((_, i) => (
                            <span key={`dot-d-${i}`} className="w-1.5 h-1.5 rounded-full bg-white/70 block" />
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

        <section className="py-20 px-6 bg-green-50" id="current-listings">
            <div className="max-w-6xl mx-auto">
                {/* Title, description, and filters */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-12">
                    <div>
                        <h2 className="text-4xl font-bold text-green-900 mb-3">Current Listings</h2>
                        <p className="text-green-800 text-lg max-w-xl">
                            Browse the latest livestock listings from certified local farmers ready for distribution.
                        </p>
                        <p className="text-green-700 mt-3 font-semibold">
                            {filteredLivestock.length} listings found
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button className="px-5 py-2 rounded-full bg-white text-green-900 border border-green-200 shadow-sm font-medium">
                            Filters
                        </button>
                        {['All', 'Cattle', 'Sheep', 'Poultry', 'Pigs'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setSelectedFilter(filter)}
                                className={`px-5 py-2 rounded-full font-semibold transition ${
                                    selectedFilter === filter
                                        ? 'bg-green-900 text-white'
                                        : 'bg-white text-green-900 border border-green-200 hover:bg-green-100'
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                {toast && (
                    <div className="mb-8 flex justify-center">
                        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-6 py-3 rounded-xl shadow-sm font-semibold">
                            {toast}
                        </div>
                    </div>
                )}

                {/* Livestock cards grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {filteredLivestock.map((livestock, idx) => (
                        <div
                            key={`${livestock.id}-${livestock.ownerName || 'demo'}-${idx}`}
                            className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition border border-green-100"
                        >
                            <div className="relative">
                                <img
                                    src={livestock.image}
                                    alt={livestock.name}
                                    className="w-full h-48 object-cover"
                                />
                                <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-green-900">
                                    {livestock.category}
                                </div>
                                <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold bg-green-900/90 text-white">
                                    {livestock.location}
                                </div>
                                <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-[11px] font-semibold bg-white/90 text-green-900">
                                    {livestock.ownerName || 'Farmer'}
                                </div>
                            </div>
                            <div className="p-5">
                                <h3 className="text-lg font-bold text-green-900 mb-1">{livestock.name}</h3>
                                <p className="text-green-700 text-sm mb-4">{livestock.location}</p>

                                <div className="grid grid-cols-2 gap-y-2 text-sm text-green-800 mb-4">
                                    <div>Weight: {livestock.weight}</div>
                                    <div>Age: {livestock.age}</div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-green-100">
                                    <p className="text-green-900 font-bold">{formatPrice(livestock.price)}</p>
                                    <button
                                        type="button"
                                        onClick={() => addToCart(livestock)}
                                        className="inline-flex items-center bg-green-900 text-white px-4 py-2 rounded-full font-semibold hover:bg-green-800 transition"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        

        {/* Footer */}
        <div id="footer">
            <Footer />
        </div>

    </div>
)
}
