import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Despensa({ usuarioId, API_URL }) {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('todos');

  // Novo Item
  const [novoItem, setNovoItem] = useState({ nome: '', categoria: 'armario', quantidade: 1, validade: '' });

  // Magic Chef
  const [loadingReceita, setLoadingReceita] = useState(false);
  const [receitaSugerida, setReceitaSugerida] = useState(null);

  useEffect(() => {
    carregarDespensa();
  }, []);

  const carregarDespensa = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/despensa?usuario_id=${usuarioId}`);
      setItens(res.data);
    } catch (e) {
      console.error("Erro ao carregar despensa", e);
    } finally {
      setLoading(false);
    }
  };

  const adicionarItem = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/despensa`, { ...novoItem, usuario_id: usuarioId });
      // Se o backend devolver o item completo, adicionamos à lista
      if (res.data) {
          setItens([...itens, res.data]);
          setNovoItem({ nome: '', categoria: 'armario', quantidade: 1, validade: '' });
      } else {
          // Fallback se o backend não devolver o objeto
          carregarDespensa();
      }
    } catch (e) {
      alert("Erro ao adicionar item.");
    }
  };

  // --- NOVA FUNÇÃO: ADICIONAR À LISTA DE COMPRAS ---
  const adicionarAListaDeCompras = async (nomeProduto) => {
      try {
          // Vamos usar uma rota específica ou criar um item manual com flag 'a_comprar'
          // Por enquanto, vamos simular criando um item "pendente" ou usando uma rota nova
          // Nota: Precisas de criar esta rota no backend ou adaptar a lógica
          await axios.post(`${API_URL}/compras/adicionar-manual`, {
              usuario_id: usuarioId,
              item: nomeProduto,
              qtd: 1
          });
          alert(`✅ ${nomeProduto} adicionado à lista de compras!`);
      } catch (error) {
          console.error(error);
          alert("Não foi possível adicionar à lista de compras.");
      }
  };

  // --- FUNÇÃO ATUALIZADA ---
  const atualizarQtd = async (id, delta) => {
    // 1. Atualização Otimista (Muda logo na interface)
    let itemNome = "";
    let novoValor = 0;

    const novosItens = itens.map(i => {
      if (i.id === id) {
        itemNome = i.nome;
        const novaQtd = Math.max(0, i.quantidade + delta);
        novoValor = novaQtd;
        return { ...i, quantidade: novaQtd };
      }
      return i;
    });
    setItens(novosItens);

    // 2. Chama a API para gravar
    try {
        await axios.put(`${API_URL}/despensa/${id}`, { quantidade: novoValor });

        // 3. Lógica de Stock Baixo
        // Se estamos a diminuir (delta < 0) e a quantidade ficou baixa (<= 1)
        if (delta < 0 && novoValor <= 1) {
            // Pequeno delay para não ser intrusivo
            setTimeout(() => {
                const confirmar = window.confirm(`⚠️ O stock de "${itemNome}" está baixo (${novoValor}). Quer adicionar à Lista de Compras?`);
                if (confirmar) {
                    adicionarAListaDeCompras(itemNome);
                }
            }, 200);
        }

    } catch (e) {
        console.error("Erro ao atualizar stock", e);
        alert("Erro ao salvar quantidade.");
        // Reverte em caso de erro (opcional)
        carregarDespensa();
    }
  };

  const apagarItem = async (id) => {
    if(!confirm("Remover item permanentemente?")) return;

    // Atualiza UI
    setItens(itens.filter(i => i.id !== id));

    try {
        await axios.delete(`${API_URL}/despensa/${id}`);
    } catch(e) {
        alert("Erro ao apagar");
        carregarDespensa();
    }
  };

  const pedirSugestaoChef = async () => {
    setLoadingReceita(true);
    setReceitaSugerida(null);
    try {
      const res = await axios.post(`${API_URL}/cozinhar-agora`, {
        usuario_id: usuarioId,
        ingredientes: itens.map(i => `${i.quantidade} ${i.nome}`).join(', ')
      });
      setReceitaSugerida(res.data);
    } catch (e) {
      alert("O Chef está a dormir (Erro na API).");
    } finally {
      setLoadingReceita(false);
    }
  };

  // Filtros e Cores
  const itensFiltrados = filtro === 'todos' ? itens : itens.filter(i => i.categoria === filtro);
  const getCorValidade = (data) => {
    if (!data) return '#6b7280';
    const hoje = new Date();
    const validade = new Date(data);
    const diffTime = validade - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return '#ef4444';
    if (diffDays < 7) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="despensa-container">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <h2 style={{margin:0}}>🏠 A Minha Despensa</h2>
        <button
          onClick={pedirSugestaoChef}
          className="btn-primary"
          style={{background: 'linear-gradient(45deg, #FF512F, #DD2476)', border:'none'}}
          disabled={loadingReceita}
        >
          {loadingReceita ? "🍳 A pensar..." : "👨‍🍳 O que posso cozinhar agora?"}
        </button>
      </div>

      {receitaSugerida && (
        <div className="card animate-fade-in" style={{background:'#fff7ed', borderLeft:'4px solid #f97316', marginBottom:'20px'}}>
          <h3 style={{color:'#c2410c'}}>💡 Sugestão: {receitaSugerida.titulo}</h3>
          <p style={{whiteSpace: 'pre-line'}}>{receitaSugerida.preparacao}</p>
          <button onClick={() => setReceitaSugerida(null)} style={{fontSize:'0.8rem', marginTop:'10px'}}>Fechar sugestão</button>
        </div>
      )}

      <form onSubmit={adicionarItem} className="card" style={{display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'end', background:'#f8fafc'}}>
        <div style={{flex:2, minWidth:'150px'}}>
          <label style={{fontSize:'0.8rem'}}>Produto</label>
          <input required type="text" value={novoItem.nome} onChange={e => setNovoItem({...novoItem, nome: e.target.value})} placeholder="Ex: Arroz Basmati" style={{width:'100%', padding:'8px'}}/>
        </div>
        <div style={{flex:1, minWidth:'100px'}}>
          <label style={{fontSize:'0.8rem'}}>Categoria</label>
          <select value={novoItem.categoria} onChange={e => setNovoItem({...novoItem, categoria: e.target.value})} style={{width:'100%', padding:'8px'}}>
            <option value="armario">Armário</option>
            <option value="frigorifico">Frigorífico</option>
            <option value="congelador">Congelador</option>
            <option value="temperos">Temperos</option>
          </select>
        </div>
        <div style={{flex:1}}>
          <label style={{fontSize:'0.8rem'}}>Validade</label>
          <input type="date" value={novoItem.validade} onChange={e => setNovoItem({...novoItem, validade: e.target.value})} style={{width:'100%', padding:'8px'}}/>
        </div>
        <button type="submit" className="btn-primary" style={{height:'38px', marginBottom:'1px'}}>+</button>
      </form>

      <div style={{display:'flex', gap:'10px', marginBottom:'15px', overflowX:'auto', paddingBottom:'5px'}}>
        {['todos', 'frigorifico', 'congelador', 'armario', 'temperos'].map(cat => (
          <button
            key={cat}
            onClick={() => setFiltro(cat)}
            style={{
              padding:'6px 12px', borderRadius:'20px', border:'none', cursor:'pointer',
              background: filtro === cat ? '#6366f1' : '#e2e8f0',
              color: filtro === cat ? 'white' : '#64748b',
              textTransform: 'capitalize'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid-despensa" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'15px'}}>
        {itensFiltrados.map(item => (
          <div key={item.id} className="card" style={{position:'relative', borderTop: `4px solid ${item.categoria === 'frigorifico' ? '#3b82f6' : item.categoria === 'congelador' ? '#0ea5e9' : '#d97706'}`}}>
            <button onClick={() => apagarItem(item.id)} style={{position:'absolute', top:'5px', right:'5px', background:'none', border:'none', color:'#ccc', cursor:'pointer'}}>✕</button>

            <div style={{fontWeight:'bold', fontSize:'1.1rem'}}>{item.nome}</div>
            <div style={{fontSize:'0.8rem', color:'#6b7280', textTransform:'capitalize', marginBottom:'10px'}}>{item.categoria}</div>

            {item.validade && (
              <div style={{fontSize:'0.75rem', color: getCorValidade(item.validade), marginBottom:'10px', fontWeight:'bold'}}>
                Val: {new Date(item.validade).toLocaleDateString()}
              </div>
            )}

            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', background:'#f1f5f9', padding:'5px', borderRadius:'8px'}}>
              <button onClick={() => atualizarQtd(item.id, -1)} style={{border:'none', background:'white', width:'30px', height:'30px', borderRadius:'4px', cursor:'pointer', fontWeight:'bold', fontSize:'1.2rem'}}>-</button>
              <span style={{fontWeight:'bold', fontSize:'1.1rem'}}>{item.quantidade} <small style={{fontSize:'0.8rem', fontWeight:'normal'}}>{item.unidade || 'un'}</small></span>
              <button onClick={() => atualizarQtd(item.id, 1)} style={{border:'none', background:'white', width:'30px', height:'30px', borderRadius:'4px', cursor:'pointer', fontWeight:'bold', fontSize:'1.2rem'}}>+</button>
            </div>
            {/* Botão extra para adicionar à lista manualmente se quiser */}
            {item.quantidade <= 1 && (
                <button onClick={() => adicionarAListaDeCompras(item.nome)} style={{width:'100%', marginTop:'10px', background:'#fee2e2', border:'1px solid #fca5a5', color:'#b91c1c', padding:'5px', borderRadius:'4px', cursor:'pointer', fontSize:'0.8rem'}}>
                    🛒 Adicionar à Lista
                </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}