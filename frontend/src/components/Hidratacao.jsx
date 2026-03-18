import React from 'react'

export default function Hidratacao({ copos, aoMudar }) {
  // Array de 8 copos
  const totalCopos = 8;

  return (
    <div className="card" style={{marginTop:'20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
        <h3 style={{margin:0, fontSize:'1rem'}}>💧 Hidratação</h3>
        <span style={{fontWeight:'bold', color:'#3b82f6'}}>{copos} / {totalCopos}</span>
      </div>

      <div style={{display:'flex', justifyContent:'space-between', gap:'5px'}}>
        {[...Array(totalCopos)].map((_, i) => (
          <button
            key={i}
            onClick={() => aoMudar(i + 1)} // Clicar no 3º copo define total como 3
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              opacity: i < copos ? 1 : 0.3,
              transition: 'transform 0.2s',
              padding: 0
            }}
            className="copo-btn"
          >
            🥤
          </button>
        ))}
      </div>
    </div>
  )
}