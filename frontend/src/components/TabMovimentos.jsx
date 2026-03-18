import React, { useState } from 'react';
import axios from 'axios';

export default function TabMovimentos({ movimentos, contas, categorias, API_URL, usuario, carregarDados }) {
    const [filtroData, setFiltroData] = useState({ inicio: '', fim: '' });
    const [uploading, setUploading] = useState(false);

    // NOVO ESTADO DE ORDENAÇÃO
    // Padrão: Ordenar por Data, Descendente (Mais recente primeiro)
    const [ordenacao, setOrdenacao] = useState({ chave: 'data_transacao', direcao: 'desc' });

    const [form, setForm] = useState({ descricao: '', valor: '', tipo: 'DESPESA', conta_id: contas.length>0 ? contas[0].id : '', categoria_id: categorias.length>0 ? categorias[0].id : '' });

    const inputStyle = { padding:'8px', borderRadius:'6px', border:'1px solid #ccc', width:'100%' };

    // --- FUNÇÃO PARA GERIR O CLIQUE NO CABEÇALHO ---
    const lidarComOrdenacao = (chave) => {
        let novaDirecao = 'asc';
        if (ordenacao.chave === chave && ordenacao.direcao === 'asc') {
            novaDirecao = 'desc';
        }
        setOrdenacao({ chave, direcao: novaDirecao });
    };

    // --- LÓGICA DE FILTRAGEM E ORDENAÇÃO ---
    const movimentosProcessados = movimentos
        .filter(m => {
            // 1. Filtragem por Data
            if (!filtroData.inicio && !filtroData.fim) return true;
            const dataMov = new Date(m.data_transacao);
            const inicio = filtroData.inicio ? new Date(filtroData.inicio) : null;
            const fim = filtroData.fim ? new Date(filtroData.fim) : null;

            if (inicio && dataMov < inicio) return false;
            if (fim) { const f = new Date(fim); f.setHours(23,59,59); if (dataMov > f) return false; }
            return true;
        })
        .sort((a, b) => {
            // 2. Ordenação
            if (!ordenacao.chave) return 0;

            let valorA = a[ordenacao.chave];
            let valorB = b[ordenacao.chave];

            // Tratamento especial para datas e strings
            if (ordenacao.chave === 'data_transacao') {
                valorA = new Date(valorA);
                valorB = new Date(valorB);
            } else if (typeof valorA === 'string') {
                valorA = valorA.toLowerCase();
                valorB = valorB.toLowerCase();
            }

            if (valorA < valorB) return ordenacao.direcao === 'asc' ? -1 : 1;
            if (valorA > valorB) return ordenacao.direcao === 'asc' ? 1 : -1;
            return 0;
        });

    // --- FUNÇÕES DE UPLOAD E REGISTO ---
    const handleCsvUpload = async (e) => {
        const file = e.target.files[0]; if(!file) return;
        if (!form.conta_id) { alert("Seleciona conta!"); return; }
        setUploading(true);
        const fd = new FormData(); fd.append('file', file); fd.append('usuario_id', usuario.id); fd.append('conta_id', form.conta_id);
        try { await axios.post(`${API_URL}/financas/upload-csv`, fd); alert("Importado!"); carregarDados(); }
        catch (err) { alert("Erro CSV."); } finally { setUploading(false); e.target.value = null; }
    }

    const enviarTransacao = async (e) => {
        e.preventDefault(); if(!form.valor) return;
        await axios.post(`${API_URL}/financas/transacao`, { usuario_id: usuario.id, ...form })
        setForm(prev => ({...prev, descricao:'', valor:''}));
        carregarDados();
    }

    // Helper para o ícone de ordenação
    const renderIconeOrdenacao = (chave) => {
        if (ordenacao.chave !== chave) return <span style={{opacity:0.3, fontSize:'0.7rem'}}> ⇅</span>;
        return ordenacao.direcao === 'asc' ? ' ⬆️' : ' ⬇️';
    };

    const headerStyle = { padding:'10px', cursor:'pointer', userSelect:'none' };

    return (
        <div className="dashboard-grid" style={{display:'flex', flexDirection:'column', gap:'20px'}}>
            {/* HISTÓRICO E FILTROS */}
            <div className="card">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'10px', marginBottom:'15px'}}>
                    <h3 style={{margin:0}}>📜 Histórico de Movimentos</h3>
                    <div style={{display:'flex', gap:'10px', alignItems:'center', background:'#f8fafc', padding:'8px', borderRadius:'8px', border:'1px solid #e2e8f0'}}>
                        <span style={{fontSize:'0.8rem', color:'#64748b', fontWeight:'bold'}}>📅 Filtrar:</span>
                        <input type="date" value={filtroData.inicio} onChange={e => setFiltroData({...filtroData, inicio: e.target.value})} style={{border:'1px solid #ccc', borderRadius:'4px', padding:'4px', fontSize:'0.8rem'}} />
                        <span style={{fontSize:'0.8rem', color:'#64748b'}}>até</span>
                        <input type="date" value={filtroData.fim} onChange={e => setFiltroData({...filtroData, fim: e.target.value})} style={{border:'1px solid #ccc', borderRadius:'4px', padding:'4px', fontSize:'0.8rem'}} />
                        {(filtroData.inicio || filtroData.fim) && (
                            <button onClick={() => setFiltroData({inicio:'', fim:''})} style={{border:'none', background:'#ef4444', color:'white', borderRadius:'4px', padding:'4px 8px', cursor:'pointer', fontSize:'0.75rem'}}>✕ Limpar</button>
                        )}
                    </div>
                </div>

                <div style={{maxHeight:'500px', overflowY:'auto'}}>
                    <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.9rem'}}>
                        <thead style={{position:'sticky', top:0, background:'white', zIndex:10}}>
                            <tr style={{textAlign:'left', color:'#64748b', borderBottom:'2px solid #f1f5f9'}}>
                                <th style={headerStyle} onClick={() => lidarComOrdenacao('data_transacao')}>
                                    Data {renderIconeOrdenacao('data_transacao')}
                                </th>
                                <th style={headerStyle} onClick={() => lidarComOrdenacao('descricao')}>
                                    Descrição {renderIconeOrdenacao('descricao')}
                                </th>
                                <th style={headerStyle} onClick={() => lidarComOrdenacao('categoria')}>
                                    Categoria {renderIconeOrdenacao('categoria')}
                                </th>
                                <th style={{...headerStyle, textAlign:'right'}} onClick={() => lidarComOrdenacao('valor')}>
                                    Valor {renderIconeOrdenacao('valor')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {movimentosProcessados.map(m => (
                                <tr key={m.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                                    <td style={{padding:'10px', color:'#64748b'}}>{new Date(m.data_transacao).toLocaleDateString('pt-PT')}</td>
                                    <td style={{padding:'10px', fontWeight:'500', color:'#334155'}}>{m.descricao}</td>
                                    <td style={{padding:'10px'}}>
                                        <select value={m.categoria || ''} onChange={async (e) => {
                                            const novoNome = e.target.value; const catObj = categorias.find(c => c.nome === novoNome);
                                            if (catObj) { await axios.put(`${API_URL}/financas/transacao/${m.id}`, { categoria_id: catObj.id }); carregarDados(); }
                                        }} style={{border: '1px solid #e2e8f0', borderRadius: '12px', padding: '4px 8px', fontSize: '0.8rem', fontWeight: '600', color: m.cor_hex || '#64748b', background: (m.cor_hex || '#e2e8f0') + '20', cursor: 'pointer', outline: 'none', maxWidth: '150px'}}>
                                            {!m.categoria && <option value="">Sem Categoria</option>}
                                            {categorias.map(c => <option key={c.id} value={c.nome} style={{color: 'black', background:'white'}}>{c.nome}</option>)}
                                        </select>
                                    </td>
                                    <td style={{padding:'10px', textAlign:'right', fontWeight:'bold', color: m.valor >= 0 ? '#10b981' : '#ef4444'}}>{m.valor > 0 ? '+' : ''}{m.valor.toFixed(2)}€</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* REGISTO E IMPORTAÇÃO */}
            <div className="card" style={{background:'#f8fafc', border:'1px dashed #cbd5e1'}}>
                <h3 style={{marginTop:0, fontSize:'1rem', color:'#475569'}}>➕ Adicionar Novo Movimento</h3>
                <div style={{display:'grid', gridTemplateColumns:'1fr 3fr', gap:'20px', alignItems:'start'}}>
                    <div style={{padding:'15px', background:'white', borderRadius:'8px', border:'1px solid #e2e8f0', textAlign:'center'}}>
                        {uploading ? <span style={{color:'#2563eb', fontWeight:'bold'}}>⏳ A processar...</span> :
                        <>
                            <p style={{margin:'0 0 10px 0', fontSize:'0.85rem', fontWeight:'bold', color:'#334155'}}>📂 Importar Extrato (CSV)</p>
                            <label style={{display:'block', cursor:'pointer', background:'#eff6ff', color:'#2563eb', padding:'8px', borderRadius:'6px', fontSize:'0.85rem', border:'1px solid #bfdbfe'}}>
                                Escolher Ficheiro <input type="file" accept=".csv" onChange={handleCsvUpload} style={{display:'none'}} />
                            </label>
                        </>}
                    </div>
                    <form onSubmit={enviarTransacao} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                        <div style={{display:'flex', gap:'10px'}}>
                            <select style={inputStyle} value={form.conta_id} onChange={e=>setForm({...form, conta_id: e.target.value})}>{contas.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>
                            <select style={inputStyle} value={form.tipo} onChange={e=>setForm({...form, tipo: e.target.value})}><option value="DESPESA">Saída (-)</option><option value="RECEITA">Entrada (+)</option></select>
                            <input type="number" placeholder="Valor (€)" style={{...inputStyle, width:'100px'}} value={form.valor} onChange={e=>setForm({...form, valor:e.target.value})} />
                        </div>
                        <div style={{display:'flex', gap:'10px'}}>
                            <input placeholder="Descrição (Ex: Café)" style={{...inputStyle, flex:2}} value={form.descricao} onChange={e=>setForm({...form, descricao:e.target.value})} />
                            <select style={{...inputStyle, flex:1}} value={form.categoria_id} onChange={e=>setForm({...form, categoria_id:e.target.value})}>{categorias.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select>
                            <button type="submit" className="btn-primary" style={{padding:'0 20px'}}>Gravar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}