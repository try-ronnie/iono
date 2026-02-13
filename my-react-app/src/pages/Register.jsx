import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiUrl } from '../utils/api'

export default function Register() {
  const navigate = useNavigate()
  const [role, setRole] = useState('Buyer')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)

  function readUsers() {
    try {
      return JSON.parse(localStorage.getItem('users') || '[]')
    } catch {
      return []
    }
  }

  function saveUser(user) {
    const users = readUsers()
    users.push(user)
    localStorage.setItem('users', JSON.stringify(users))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!name || !email || !password) {
      setError('Please fill all fields')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(apiUrl('/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to create account')
        setLoading(false)
        return
      }
    } catch {
      setError('Failed to create account')
      setLoading(false)
      return
    }

    const existing = readUsers().find((u) => u.email === email)
    if (!existing) {
      const user = { name, email, password, role }
      saveUser(user)
    }

    setSuccess('Account created — redirecting to login...')
    setTimeout(() => navigate('/login'), 800)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-lg overflow-hidden flex">
        <div className="w-full md:w-2/3 p-8 md:p-12 bg-white">
          <h2 className="text-4xl font-bold mb-1 text-black">Create Account</h2>
          <p className="text-gray-500 mb-6">Join our community of farmers and distributors.</p>

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
              <label className="block text-sm text-gray-700 mb-1">Full Name</label>
              <div className="flex items-center bg-gray-50 border rounded-lg px-3 py-2">
                <span className="text-gray-400 mr-3">👤</span>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="w-full bg-transparent focus:outline-none text-black" />
              </div>
            </div>

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

            {error && <p className="text-red-600 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">{success}</p>}

            <button type="submit" disabled={loading} className="w-full bg-green-900 text-white py-3 rounded-full text-lg flex items-center justify-center gap-3">
              <span>{loading ? 'Signing up...' : 'Sign Up'}</span>
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

            <p className="text-center text-sm text-gray-500">Already have an account? <span className="text-green-700 font-semibold cursor-pointer" onClick={() => navigate('/login')}>Sign In</span></p>
          </form>
        </div>

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
