import React from 'react'
import '../App.css' // Garante que tens os estilos

export default function Navbar({ ativo, aoMudar }) {
  const itens = [
    { id: 'dashboard', icon: '🏠', label: 'Início' },
    { id: 'planner', icon: '📅', label: 'Planeador' },
    { id: 'perfil', icon: '👤', label: 'Perfil' },
    { id: 'financas', icon: '💰', label: 'Finanças' },
    { id: 'despensa', label: 'Despensa', icon: '🏠' },
    { id: 'compras', label: 'Lista', icon: '🛒' },
    { id: 'saude', label: 'Saúde', icon: '❤️' },
    { id: 'minecraft', label: 'Minecraft', icon: '🎮️' }
  ]

  return (
    <nav className="navbar">
      {itens.map((item) => (
        <button
          key={item.id}
          onClick={() => aoMudar(item.id)}
          className={`nav-item ${ativo === item.id ? 'active' : ''}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}