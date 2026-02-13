import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiUrl } from '../utils/api'

const DEMO_ACCOUNTS = {
  Farmer: { email: 'farmer@example.com', password: 'farmer123' },
  User: { email: 'user@example.com', password: 'user123' },
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState('Buyer')
  const [remember, setRemember] = useState(false)

  function readUsers() {
    try {
      return JSON.parse(localStorage.getItem('users') || '[]')
    } catch {
      return []
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Please enter email and password')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        const data = await res.json()
        sessionStorage.setItem('token', data.access_token)
        sessionStorage.setItem('user', JSON.stringify(data.user))
        if (data.user?.role === 'farmer' || data.user?.role === 'Farmer') {
          navigate('/farmer/home')
        } else {
          navigate('/home')
        }
        setLoading(false)
        return
      }
      const data = await res.json().catch(() => ({}))
      setError(data.detail || data.error || 'Invalid credentials')
      setLoading(false)
      return
    } catch {
      // fall through to local/demo login
    }

    // fallback to local/demo accounts
    const registered = readUsers().find((u) => u.email === email && u.password === password)
    if (registered) {
      const role = registered.role || 'User'
      sessionStorage.setItem('user', JSON.stringify({ email: registered.email, type: role, name: registered.name }))
      if (role === 'Farmer') navigate('/farmer/home')
      else navigate('/')
      setLoading(false)
      return
    }

    const found = Object.entries(DEMO_ACCOUNTS).find(([, acct]) => acct.email === email && acct.password === password)
    if (found) {
      const [type, acct] = found
      sessionStorage.setItem('user', JSON.stringify({ email: acct.email, type }))
      if (type === 'Farmer') navigate('/farmer/home')
      else navigate('/')
    } else {
      setError('Invalid credentials')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-lg overflow-hidden flex">
        {/* Left: Form */}
        <div className="w-full md:w-2/3 p-8 md:p-12 bg-white">
          <h2 className="text-3xl font-bold mb-1 text-black">Login</h2>
          <p className="text-gray-500 mb-6">Welcome back! Please enter your details.</p>

          <div className="flex gap-4 mb-6">
            <button type="button" onClick={() => setRole('Buyer')} className={`flex-1 border rounded-lg py-3 px-4 flex items-center gap-3 justify-center ${role === 'Buyer' ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'}`}>
              <span className="p-2 bg-white rounded-full text-green-600">🛒</span>
              <div className="text-left">
                <div className="text-sm text-gray-500">I am a:</div>
                <div className="font-semibold">Buyer</div>
              </div>
            </button>

            <button type="button" onClick={() => setRole('Farmer')} className={`flex-1 border rounded-lg py-3 px-4 flex items-center gap-3 justify-center ${role === 'Farmer' ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'}`}>
              <span className="p-2 bg-white rounded-full text-green-600">🚜</span>
              <div className="text-left">
                <div className="text-sm text-gray-500">&nbsp;</div>
                <div className="font-semibold">Farmer</div>
              </div>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Email Address</label>
              <div className="flex items-center bg-gray-50 border rounded-lg px-3 py-2">
                <span className="text-gray-400 mr-3">📧</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" className="w-full bg-transparent focus:outline-none text-black" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Password</label>
              <div className="flex items-center bg-gray-50 border rounded-lg px-3 py-2">
                <span className="text-gray-400 mr-3">🔒</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent focus:outline-none text-black" />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="form-checkbox h-4 w-4 text-green-600" />
                <span className="text-gray-700">Remember me</span>
              </label>
              <Link to="/forgot" className="text-green-700 hover:underline">Forgot Password?</Link>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button type="submit" disabled={loading} className="w-full bg-green-900 text-white py-3 rounded-full text-lg flex items-center justify-center gap-3">
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px bg-gray-200 flex-1" />
              <div className="text-sm text-gray-400 uppercase">or continue with</div>
              <div className="h-px bg-gray-200 flex-1" />
            </div>

            <div className="flex gap-3">
              <button type="button" className="flex-1 border rounded-lg py-2 flex items-center justify-center gap-2 bg-white"> 
                <span className="text-sm">Google</span>
              </button>
              <button type="button" className="flex-1 border rounded-lg py-2 flex items-center justify-center gap-2 bg-white"> 
                <span className="text-sm">Github</span>
              </button>
            </div>

            <p className="text-center text-sm text-gray-500">Don't have an account? <Link to="/register" className="text-green-700 font-semibold">Create one now</Link></p>
          </form>
        </div>

        {/* Right: Promo */}
        <div className="hidden md:block w-1/3 bg-gradient-to-b from-[#0f3a22] to-[#072013] text-white p-10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-green-400 flex items-center justify-center font-bold text-green-900">F</div>
            <h3 className="text-3xl font-bold leading-tight">Grow Your Herd<br/>With Confidence</h3>
          </div>

          <div className="mt-8">
            <div className="bg-white bg-opacity-10 p-4 rounded-lg">
              <p className="italic">"The most transparent livestock marketplace I've ever used. The health records verification is a game changer."</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-green-200" />
                <div className="text-sm">
                  <div className="font-semibold">Samuel Thompson</div>
                  <div className="text-xs opacity-80">Cattle Farmer, Montana</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
