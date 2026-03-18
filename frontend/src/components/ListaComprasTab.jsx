import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ListaComprasTab({ usuarioId, API_URL }) {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [novoItem, setNovoItem] = useState("");

  // --- NOVO ESTADO PARA O AGENTE ---
  const [analise, setAnalise] = useState(null);
  const [loadingAnalise, setLoadingAnalise] = useState(false);

  useEffect(() => {
    carregarLista();
  }, []);

  const carregarLista = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/lista-compras?usuario_id=${usuarioId}`);
      setItens(res.data);
      // Limpa análise antiga se a lista mudou
      if(res.data.length === 0) setAnalise(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // --- FUNÇÃO PARA CHAMAR O AGENTE ---
  const analisarLista = async () => {
    if(itens.length === 0) return alert("Adiciona itens primeiro!");
    setLoadingAnalise(true);
    setAnalise(null);
    try {
        const res = await axios.post(`${API_URL}/lista-compras/analisar`, { usuario_id: usuarioId });
        setAnalise(res.data);
    } catch (e) {
        alert("O Consultor está ocupado. Tenta de novo.");
    } finally {
        setLoadingAnalise(false);
    }
  };

    const aplicarTroca = async (sugestao) => {
    // 1. Tenta encontrar o item original na lista (pelo nome)
    // O backend pode ter nomes ligeiramente diferentes, tentamos 'includes'
    const itemOriginal = itens.find(i =>
        i.item.toLowerCase().includes(sugestao.item_original.toLowerCase()) ||
        sugestao.item_original.toLowerCase().includes(i.item.toLowerCase())
    );

    if (!itemOriginal) {
        alert(`Não encontrei "${sugestao.item_original}" na lista para remover automaticamente.`);
        return;
    }

    if (!window.confirm(`Vais trocar "${itemOriginal.item}" por "${sugestao.item_sugerido}"?`)) return;

    try {
        setLoading(true); // Bloqueia UI

        // 2. Remove o item antigo
        await axios.delete(`${API_URL}/lista-compras/item/${itemOriginal.id}`);

        // 3. Adiciona o novo item
        await axios.post(`${API_URL}/compras/adicionar-manual`, {
            usuario_id: usuarioId,
            item: sugestao.item_sugerido
        });

        // 4. Atualiza a lista visualmente
        alert("Troca efetuada com sucesso! 📉💰");
        await carregarLista(); // Recarrega tudo para ter os IDs certos

    } catch (e) {
        console.error(e);
        alert("Erro ao fazer a troca.");
    } finally {
        setLoading(false);
    }
  };
  // ... (Funções adicionarItem, alterarQuantidade, apagarItem, salvarPreco mantêm-se iguais) ...
  // Vou omiti-las para poupar espaço, mas deves manter o código anterior aqui.
  // Vou focar apenas no RETURN atualizado.

  const adicionarItem = async (e) => { /* ... igual ao anterior ... */ e.preventDefault(); if(!novoItem) return; try { await axios.post(`${API_URL}/compras/adicionar-manual`, { usuario_id: usuarioId, item: novoItem }); setNovoItem(""); carregarLista(); } catch(e){} };
  const alterarQuantidade = async (id, delta) => { /* ... igual ao anterior ... */ const item = itens.find(i=>i.id===id); if(!item) return; const nova = Math.max(1, item.qtd+delta); setItens(itens.map(i=>i.id===id?{...i, qtd:nova}:i)); try{await axios.put(`${API_URL}/lista-compras/item/${id}`, {quantidade:nova})}catch(e){carregarLista()} };
  const salvarPreco = async (id, val) => { /* ... igual ... */ try{await axios.put(`${API_URL}/lista-compras/item/${id}`, {preco:val})}catch(e){} };
  const handlePrecoChange = (id, val) => { setItens(itens.map(i=>i.id===id?{...i, preco_estimado_unitario:parseFloat(val)||0}:i)) };
  const apagarItem = async (id) => { setItens(itens.filter(i=>i.id!==id)); try{await axios.delete(`${API_URL}/lista-compras/item/${id}`)}catch(e){} };
  const marcarComoComprado = async (item) => { apagarItem(item.id); if(window.confirm(`Compraste "${item.item}"?`)){ try{await axios.post(`${API_URL}/despensa`, {usuario_id: usuarioId, nome: item.item, quantidade: item.qtd, categoria: 'armario'})}catch(e){} } };

  // Cálculos
  const totalEstimado = itens.reduce((acc, item) => acc + (item.qtd * item.preco_estimado_unitario), 0);

  return (
    <div className="lista-compras-container animate-fade-in" style={{maxWidth:'800px', margin:'0 auto', paddingBottom:'80px'}}>

      {/* Header com Total */}
      <div className="card" style={{background: '#fff', borderLeft: '5px solid #10b981', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
            <h2 style={{marginTop:0, marginBottom:'5px'}}>🛒 Lista de Compras</h2>
            <p style={{color:'#666', margin:0, fontSize:'0.9rem'}}>Previsão: <strong style={{color:'#10b981'}}>{totalEstimado.toFixed(2)}€</strong></p>
        </div>
        <button
            onClick={analisarLista}
            disabled={loadingAnalise || itens.length === 0}
            className="btn-primary"
            style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border:'none', padding:'10px 20px', display:'flex', alignItems:'center', gap:'8px'}}
        >
            {loadingAnalise ? "🧠 A Pensar..." : "🧠 Analisar Lista"}
        </button>
      </div>

      {/* --- ZONA DO AGENTE (SÓ APARECE SE TIVER ANÁLISE) --- */}
      {analise && (
        <div className="card animate-fade-in" style={{background: '#f0f9ff', border: '2px solid #bae6fd', marginTop:'20px'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                <h3 style={{margin:0, color:'#0369a1'}}>💡 Relatório do Consultor</h3>
                <div style={{
                    background: analise.nota > 75 ? '#22c55e' : analise.nota > 50 ? '#f59e0b' : '#ef4444',
                    color:'white', padding:'5px 10px', borderRadius:'20px', fontWeight:'bold'
                }}>
                    Nota: {analise.nota}/100
                </div>
            </div>
            <p style={{fontStyle:'italic', color:'#334155', marginBottom:'15px'}}>{analise.resumo}</p>

            <div style={{display:'grid', gap:'10px'}}>
                {analise.sugestoes.map((sug, idx) => (
                    <div key={idx} style={{
                        background:'white', padding:'10px', borderRadius:'8px',
                        borderLeft:`4px solid ${sug.tipo === 'SAUDE' ? '#10b981' : '#f59e0b'}`,
                        boxShadow:'0 2px 5px rgba(0,0,0,0.05)',
                        display: 'flex', flexDirection: 'column', gap: '5px' // Ajuste de layout
                    }}>
                        <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.8rem', fontWeight:'bold', color:'#64748b'}}>
                            <span>{sug.tipo === 'SAUDE' ? '❤️ SAÚDE' : '💰 POUPANÇA'}</span>
                            <span>Troca Sugerida</span>
                        </div>

                        <div style={{display:'flex', alignItems:'center', gap:'10px', fontSize:'0.95rem'}}>
                            <span style={{textDecoration:'line-through', color:'#ef4444'}}>{sug.item_original}</span>
                            <span>➡️</span>
                            <span style={{fontWeight:'bold', color:'#0f172a'}}>{sug.item_sugerido}</span>
                        </div>

                        <p style={{margin:'0', fontSize:'0.85rem', color:'#475569', fontStyle:'italic'}}>
                            "{sug.motivo}"
                        </p>

                        {/* BOTÃO MÁGICO DE TROCA */}
                        <button
                            onClick={() => aplicarTroca(sug)}
                            style={{
                                marginTop:'5px',
                                background: sug.tipo === 'SAUDE' ? '#dcfce7' : '#fef3c7',
                                color: sug.tipo === 'SAUDE' ? '#166534' : '#b45309',
                                border: `1px solid ${sug.tipo === 'SAUDE' ? '#86efac' : '#fcd34d'}`,
                                borderRadius: '4px',
                                padding: '5px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                            }}
                        >
                            🔀 Aplicar esta troca
                        </button>
                    </div>
                ))}
            </div>
            <button onClick={() => setAnalise(null)} style={{marginTop:'15px', background:'none', border:'none', color:'#0369a1', cursor:'pointer', fontSize:'0.8rem', width:'100%'}}>Fechar Relatório</button>
        </div>
      )}

      {/* Input Rápido */}
      <form onSubmit={adicionarItem} style={{display:'flex', gap:'10px', marginTop:'20px', marginBottom:'20px'}}>
        <input
          type="text"
          value={novoItem}
          onChange={e => setNovoItem(e.target.value)}
          placeholder="Adicionar item..."
          style={{flex:1, padding:'12px', borderRadius:'8px', border:'1px solid #ddd'}}
        />
        <button type="submit" className="btn-primary" style={{width:'auto'}}>➕</button>
      </form>

      {/* Lista de Itens (A Tabela que já tínhamos) */}
      <ul style={{listStyle:'none', padding:0}}>
          {itens.map(item => (
            <li key={item.id} className="card" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px', padding:'10px'}}>
              <div style={{display:'flex', alignItems:'center', gap:'10px', flex:1}}>
                <input type="checkbox" onChange={() => marcarComoComprado(item)} style={{width:'20px', height:'20px', accentColor:'#10b981'}} />
                <div>
                    <div style={{fontWeight:'bold'}}>{item.item}</div>
                    <div style={{fontSize:'0.75rem', color:'#666'}}>
                        {item.preco_estimado_unitario > 0 ? `~${item.preco_estimado_unitario.toFixed(2)}€/un` : ''}
                    </div>
                </div>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <div style={{background:'#f3f4f6', borderRadius:'8px', display:'flex', alignItems:'center'}}>
                    <button onClick={() => alterarQuantidade(item.id, -1)} style={{border:'none', background:'none', padding:'5px 10px', fontWeight:'bold'}}>-</button>
                    <span>{item.qtd}</span>
                    <button onClick={() => alterarQuantidade(item.id, 1)} style={{border:'none', background:'none', padding:'5px 10px', fontWeight:'bold'}}>+</button>
                </div>
                <div style={{minWidth:'60px', textAlign:'right', fontWeight:'bold'}}>
                    {(item.qtd * item.preco_estimado_unitario).toFixed(2)}€
                </div>
                <button onClick={() => apagarItem(item.id)} style={{border:'none', background:'none', color:'#ef4444'}}>✕</button>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}