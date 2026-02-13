import React from 'react'

export default function FilterBar({ children }) {
  return (
    <div className="filter-bar">
      {children ?? <span>Filters go here</span>}
    </div>
  )
}
