import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-200 py-12 mt-12">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded flex items-center justify-center bg-gray-800 text-green-400 font-bold">FM</div>
            <div>
              <div className="text-xl font-semibold">FarMart</div>
            </div>
          </div>
          <p className="text-sm text-gray-400">
            THE leading digital marketplace for ethical livestock trading. Empowering farmers to provide stable digital solutions to the problems they face. Direct contribution to the market since 2019.
          </p>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-4">Support</h4>
          <ul className="text-sm text-gray-400 space-y-2">
            <li>1. Farmer faq</li>
            <li>2. Distributor faq</li>
            <li>3. Shipping info</li>
            <li>4. Refund policy</li>
            <li>5. Help center</li>
          </ul>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-4">Links</h4>
          <ul className="text-sm text-gray-400 space-y-2">
            <li>1. Home page</li>
            <li>2. About page</li>
            <li>3. Deliveries</li>
            <li>4. Market page</li>
          </ul>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-4">Contact us</h4>
          <ul className="text-sm text-gray-400 space-y-3">
            <li>📍 mbagathi.street</li>
            <li>📞 +3549948943-23-4</li>
            <li>✉️ farmart@gmail.com</li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
