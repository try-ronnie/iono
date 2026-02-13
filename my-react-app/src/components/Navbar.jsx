import React from 'react'
import { Link } from 'react-router-dom'
import { isFarmerUser } from '../utils/session'

export default function Navbar() {
  const isFarmer = isFarmerUser()
  const homeLink = isFarmer ? '/farmer/home' : '/home'
  const marketLink = isFarmer ? '/farmer/inventory' : '/market'

  return (
    <nav className="navbar">
      <Link to={homeLink}>Home</Link>
      <Link to="/test">Test</Link>
      <Link to={marketLink}>Market</Link>
      <Link to="/cart">Cart</Link>
    </nav>
  )
}
