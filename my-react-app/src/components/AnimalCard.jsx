import React from 'react'

export default function AnimalCard({ animal }) {
  return (
    <div className="animal-card">
      <h3>{animal?.name ?? 'Unnamed'}</h3>
      <p>{animal?.description}</p>
    </div>
  )
}
