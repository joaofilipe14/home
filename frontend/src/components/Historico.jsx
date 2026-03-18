import React from 'react'

export default function Historico({
  lista,
  editingId,
  editValues,
  setEditValues,
  aoRecalcular,
  aoGuardar,
  aoCancelar,
  aoAtivarEdicao,
  aoApagar
}) {

  // Se a lista estiver vazia, mostra a mensagem amigável
  if (lista.length === 0) {
    return (
      <div className="card" style={{textAlign:'center', color:'#9ca3af', padding:'40px'}}>
        <p style={{fontSize:'3rem', margin:0}}>🍽️</p>
        <p>Ainda não comeste nada hoje? 😋</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {lista.map((item) => (
        <div key={item.id} className="card" style={{borderLeft: '4px solid var(--primary)'}}>

          {editingId === item.id ? (
            // --- MODO EDIÇÃO ---
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* Input Nome */}
                <input
                  value={editValues.nome_prato}
                  onChange={e => setEditValues({...editValues, nome_prato: e.target.value})}
                  placeholder="Nome do prato"
                />
                {/* Botão Mágico */}
                <button
                  onClick={aoRecalcular}
                  className="btn-icon"
                  style={{background:'#f3e8ff', color:'#9333ea'}}
                  title="Recalcular com IA"
                >
                  ✨
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems:'center' }}>
                {/* Input Calorias */}
                <input
                  type="number"
                  value={editValues.calorias}
                  onChange={e => setEditValues({...editValues, calorias: e.target.value})}
                  style={{width:'80px'}}
                />
                <span>kcal</span>
                <div style={{flex:1}}></div>

                {/* Botões Ação */}
                <button onClick={() => aoGuardar(item.id)} className="btn-icon" style={{color:'green', background:'#dcfce7'}}>💾</button>
                <button onClick={aoCancelar} className="btn-icon">❌</button>
              </div>
            </div>
          ) : (
            // --- MODO VISUALIZAÇÃO ---
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{fontWeight: 'bold', fontSize:'1.1rem'}}>{item.nome_prato}</div>
                <div style={{fontSize: '0.85em', color: '#9ca3af'}}>
                  {new Date(item.data).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize:'1.2rem' }}>
                  {item.calorias}
                </span>
                <button onClick={() => aoAtivarEdicao(item)} className="btn-icon">✏️</button>
                <button onClick={() => aoApagar(item.id)} className="btn-icon" style={{color:'red', background:'#fee2e2'}}>🗑️</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}