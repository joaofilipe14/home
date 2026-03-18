import React from 'react'

export default function ReceitaModal({ receita, prato, aoFechar }) {
  if (!receita) return null;

  return (
    <div className="animate-fade-in" style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="card" style={{width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', background: 'white', padding: '0'}}>

        {/* Header com Imagem de fundo (simulada com gradiente) */}
        <div style={{background: 'linear-gradient(to right, #f59e0b, #d97706)', padding: '30px', color: 'white'}}>
          <h2 style={{margin:0, fontSize:'1.8rem'}}>{prato}</h2>
          <div style={{marginTop:'10px', display:'flex', gap:'15px', fontSize:'0.9rem'}}>
            <span style={{background:'rgba(0,0,0,0.2)', padding:'5px 10px', borderRadius:'20px'}}>⏱ {receita.tempo}</span>
            <span style={{background:'rgba(0,0,0,0.2)', padding:'5px 10px', borderRadius:'20px'}}>👨‍🍳 {receita.dificuldade}</span>
          </div>
        </div>

        <div style={{padding: '20px'}}>
          <h3>🛒 Ingredientes</h3>
          <ul style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingLeft: '20px'}}>
            {receita.ingredientes.map((ing, i) => <li key={i}>{ing}</li>)}
          </ul>

          <h3 style={{marginTop: '20px'}}>🔥 Preparação</h3>
          <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
            {receita.passos.map((passo, i) => (
              <div key={i} style={{display:'flex', gap:'15px'}}>
                <div style={{background:'#fffbeb', color:'#d97706', width:'30px', height:'30px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', flexShrink:0}}>
                  {i+1}
                </div>
                <p style={{margin:0, lineHeight:'1.5'}}>{passo}</p>
              </div>
            ))}
          </div>

          <button onClick={aoFechar} className="btn-primary" style={{marginTop:'30px', width:'100%', background:'#4b5563'}}>Fechar Receita</button>
        </div>
      </div>
    </div>
  )
}