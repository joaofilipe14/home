import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function ListaCompras({ lista, aoFechar }) {
  // Lista local para refletir a mudança instantaneamente
  const [listaLocal, setListaLocal] = useState(lista)

  const toggleItem = async (categoria, index) => {
    // 1. Encontrar o item
    const novaLista = { ...listaLocal }
    const item = novaLista[categoria][index]
    const novoEstado = !item.comprado

    // 2. Atualizar visualmente (Otimista)
    item.comprado = novoEstado
    setListaLocal(novaLista)

    // 3. Chamar API para salvar na BD (Silencioso)
    try {
      await axios.post('http://127.0.0.1:5000/api/compras/toggle', {
        item_id: item.id,
        comprado: novoEstado
      })
    } catch (e) {
      console.error("Erro ao salvar check", e)
      // Reverter se falhar (opcional)
    }
  }

  // ... (função getIconeCategoria igual) ...
  const getIconeCategoria = (cat) => { /* Copia do anterior */
    if (cat.includes('Talho')) return '🥩'; return '🛒';
  }

  return (
    <div className="animate-fade-in" style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div className="card" style={{width: '90%', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto', padding: '0', display: 'flex', flexDirection: 'column', background: 'white'}}>

        {/* Header (Igual) */}
        <div style={{padding: '20px', background: '#10b981', color: 'white', display:'flex', justifyContent:'space-between'}}>
          <h2>📝 Lista de Compras</h2>
          <button onClick={aoFechar} style={{background:'none', border:'none', color:'white', fontSize:'1.2rem'}}>✕</button>
        </div>

        <div style={{padding: '20px'}}>
          {Object.entries(listaLocal).map(([categoria, ingredientes]) => (
            <div key={categoria} style={{marginBottom: '20px'}}>
              <h3 style={{color: '#059669', textTransform:'capitalize'}}>{categoria.replace('_', ' ')}</h3>

              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {ingredientes.map((item, i) => (
                  <label key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px',
                    background: item.comprado ? '#f3f4f6' : 'white', cursor: 'pointer', border: '1px solid #eee'
                  }}>
                    <input
                      type="checkbox"
                      checked={!!item.comprado}
                      onChange={() => toggleItem(categoria, i)}
                      style={{width: '20px', height: '20px', accentColor: '#10b981'}}
                    />
                    <span style={{textDecoration: item.comprado ? 'line-through' : 'none', color: item.comprado ? '#9ca3af' : '#374151'}}>
                      {item.nome}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}