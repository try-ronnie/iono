import React from 'react'
import AnimalCard from '../components/AnimalCard'

export default function AnimalList() {
  return (
    <div>
      <h2>Animal List</h2>
      <AnimalCard animal={{ name: 'Sample Animal', description: 'A sample.' }} />
    </div>
  )
}
