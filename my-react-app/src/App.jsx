import { Routes, Route, Navigate } from 'react-router-dom'
import Homepage from './pages/Homepage'
import AnimalList from './pages/AnimalList'
import Cart from './pages/Cart'
import Shipping from './pages/Shipping'
import Payment from './pages/Payment'
import Login from './pages/Login'
import Register from './pages/Register'
import FarmerHome from './pages/farmer/Home'
import Inventory from './pages/farmer/Inventory'
import AnimalForm from './pages/farmer/AnimalForm'
import OrderManagement from './pages/farmer/OrderManagement'
import FarmerOrderHistory from './pages/farmer/OrderHistory'
import BuyerOrders from './pages/BuyerOrders'
import Delivery from './pages/Delivery'
import Market from './pages/Market'

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* <h1 className="text-3xl font-bold mb-6">Welcome to the Animal Shop</h1> */}

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/home" element={<Homepage />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/shipping" element={<Shipping />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/orders" element={<BuyerOrders />} />
        <Route path="/market" element={<Market />} />

        {/* Farmer routes */}
        <Route path="/farmer/home" element={<FarmerHome />} />
        <Route path="/farmer/inventory" element={<Inventory />} />
        <Route path="/farmer/animals/new" element={<AnimalForm />} />
        <Route path="/farmer/animals/edit/:id" element={<AnimalForm />} />
        <Route path="/farmer/orders" element={<OrderManagement />} />
        <Route path="/farmer/orders/history" element={<FarmerOrderHistory />} />

        {/* Delivery / ordering */}
        <Route path="/delivery/:id" element={<Delivery />} />

        <Route path="*" element={<h2>Page not found</h2>} />
      </Routes>
    </div>
  )
}

export default App
