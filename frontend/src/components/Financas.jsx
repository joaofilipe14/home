import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function Financas({ usuario, listaCompras, API_URL }) {
  const [orcamento, setOrcamento] = useState(50)
  const [totalGasto, setTotalGasto] = useState(0)
  const [itens, setItens] = useState({})

  useEffect(() => {
    carregarOrcamento()
    if (listaCompras) {
      setItens(listaCompras)
      calcularTotal(listaCompras)
    }
  }, [listaCompras])

  const carregarOrcamento = async () => {
    try {
      const res = await axios.get(`${API_URL}/financas/orcamento?usuario_id=${usuario.id}`)
      setOrcamento(res.data.orcamento)
    } catch(e) {}
  }

  const salvarOrcamento = async () => {
    await axios.post(`${API_URL}/financas/orcamento`, { usuario_id: usuario.id, orcamento: parseFloat(orcamento) })
    alert("Orçamento definido!")
  }

  const calcularTotal = (lista) => {
    let t = 0
    Object.values(lista).forEach(cat => {
      cat.forEach(item => t += (item.preco_real || 0))
    })
    setTotalGasto(t)
  }

  const atualizarPreco = async (categoria, index, novoPreco) => {
    const novaLista = { ...itens }
    const item = novaLista[categoria][index]
    item.preco_real = parseFloat(novoPreco)

    setItens(novaLista)
    calcularTotal(novaLista)

    // Salvar na BD (Debounce idealmente, mas direto serve para agora)
    await axios.put(`${API_URL}/financas/preco`, { item_id: item.id, preco: item.preco_real })
  }

  const percentagem = Math.min((totalGasto / orcamento) * 100, 100)
  const corBarra = totalGasto > orcamento ? '#ef4444' : '#10b981'

  return (
    <div className="animate-fade-in" style={{maxWidth:'800px', margin:'0 auto'}}>

      {/* 1. CARTÃO DE RESUMO */}
      <div className="card" style={{background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color:'white', marginBottom:'30px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'end', marginBottom:'15px'}}>
          <div>
            <h2 style={{margin:0, fontSize:'1.2rem', opacity:0.8}}>Total Estimado</h2>
            <span style={{fontSize:'2.5rem', fontWeight:'bold'}}>{totalGasto.toFixed(2)}€</span>
          </div>
          <div style={{textAlign:'right'}}>
            <label style={{fontSize:'0.9rem', opacity:0.8}}>Orçamento Semanal:</label>
            <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
              <input
                type="number"
                value={orcamento}
                onChange={e => setOrcamento(e.target.value)}
                style={{background:'rgba(255,255,255,0.1)', border:'none', color:'white', width:'70px', padding:'5px', borderRadius:'5px', textAlign:'right'}}
              />
              <span>€</span>
              <button onClick={salvarOrcamento} style={{fontSize:'0.8rem', background:'#3b82f6', border:'none', color:'white', borderRadius:'4px', padding:'5px', cursor:'pointer'}}>OK</button>
            </div>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div style={{background:'rgba(255,255,255,0.2)', height:'10px', borderRadius:'5px', overflow:'hidden'}}>
          <div style={{width: `${percentagem}%`, background: corBarra, height:'100%', transition:'width 0.5s'}}></div>
        </div>
        <div style={{textAlign:'center', marginTop:'5px', fontSize:'0.8rem'}}>
          {totalGasto > orcamento ? `⚠️ Ultrapassaste o orçamento em ${(totalGasto - orcamento).toFixed(2)}€` : `✅ Ainda tens ${(orcamento - totalGasto).toFixed(2)}€ disponíveis`}
        </div>
      </div>

      {/* 2. TABELA DE CUSTOS */}
      {!itens || Object.keys(itens).length === 0 ? (
        <div className="card" style={{textAlign:'center', padding:'40px'}}>
          <p>Gera primeiro uma <strong>Lista de Compras</strong> no Planeador para veres os custos aqui.</p>
        </div>
      ) : (
        <div className="card" style={{padding:'0', overflow:'hidden'}}>
          <div style={{padding:'15px', background:'#f8fafc', borderBottom:'1px solid #eee', fontWeight:'bold'}}>
            Detalhamento de Custos
          </div>

          <div style={{padding:'15px'}}>
            {Object.entries(itens).map(([categoria, lista]) => (
              <div key={categoria} style={{marginBottom:'20px'}}>
                <h3 style={{fontSize:'1rem', color:'#64748b', borderBottom:'1px solid #eee', paddingBottom:'5px', textTransform:'capitalize'}}>
                  {categoria.replace('_', ' ')}
                </h3>

                {lista.map((item, i) => (
                  <div key={item.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f1f5f9'}}>
                    <span style={{flex:1}}>{item.nome}</span>

                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                      <span style={{fontSize:'0.8rem', color:'#94a3b8'}}>Est: {item.preco_estimado}€</span>
                      <div style={{position:'relative'}}>
                        <input
                          type="number"
                          step="0.01"
                          value={item.preco_real}
                          onChange={(e) => atualizarPreco(categoria, i, e.target.value)}
                          style={{
                            width:'70px', padding:'5px', borderRadius:'6px',
                            border: '1px solid #e2e8f0', textAlign:'right', fontWeight:'bold',
                            color: item.preco_real > item.preco_estimado ? '#ef4444' : '#10b981'
                          }}
                        />
                        <span style={{marginLeft:'5px'}}>€</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}