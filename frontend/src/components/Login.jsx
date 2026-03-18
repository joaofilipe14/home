import React from 'react'

export default function Login({ listaUsuarios, aoSelecionar, aoCriarNovo }) {
  return (
    <div className="app-container" style={{display:'flex', flexDirection:'column', justifyContent:'center'}}>
      <div style={{textAlign:'center', marginBottom: '40px'}}>
        <span style={{fontSize: '3rem'}}>🥗</span>
        <h1>NutriAgent</h1>
        <p style={{color: '#6b7280'}}>Quem vai comer agora?</p>
      </div>

      <div className="animate-fade-in">
        {listaUsuarios.map(u => (
          <button key={u.id} onClick={() => aoSelecionar(u)} className="btn-profile">
            <span style={{fontWeight: 'bold'}}>👤 {u.nome}</span>
            <span style={{color: '#6366f1', fontSize: '0.9em', fontWeight: 'bold'}}>{u.meta_calorias} kcal</span>
          </button>
        ))}
        <button onClick={aoCriarNovo} className="btn-profile" style={{justifyContent:'center', color: '#6366f1', border: '2px dashed #6366f1'}}>
          + Criar Novo Perfil
        </button>
      </div>
    </div>
  )
}