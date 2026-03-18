import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function WidgetCasa({ usuarioId, API_URL }) {
    const [dados, setDados] = useState({ meta_valor: 20000, saldo_atual: 0 });
    const [loading, setLoading] = useState(true);
    const [modoEdicao, setModoEdicao] = useState(false);
    const [valorDeposito, setValorDeposito] = useState("");

    // Carregar dados iniciais
    useEffect(() => {
        carregarMeta();
    }, []);

    const carregarMeta = async () => {
        try {
            const res = await axios.get(`${API_URL}/financas/meta-casa?usuario_id=${usuarioId}`);
            setDados(res.data);
            setLoading(false);
        } catch (e) {
            console.error("Erro meta casa", e);
        }
    };

    // Depositar Dinheiro
    const depositar = async (e) => {
        e.preventDefault();
        if (!valorDeposito) return;
        try {
            await axios.post(`${API_URL}/financas/meta-casa`, {
                usuario_id: usuarioId,
                valor: valorDeposito
            });
            setValorDeposito("");
            carregarMeta();
            alert("🧱 Mais um tijolo para a casa!");
        } catch (e) { alert("Erro ao depositar"); }
    };

    // Editar Meta (Configuração)
    const salvarConfig = async () => {
        try {
            await axios.put(`${API_URL}/financas/meta-casa`, {
                usuario_id: usuarioId,
                meta: dados.meta_valor,
                saldo: dados.saldo_atual
            });
            setModoEdicao(false);
        } catch (e) { alert("Erro ao salvar"); }
    };

    // Cálculos
    const percentagem = Math.min(100, (dados.saldo_atual / dados.meta_valor) * 100).toFixed(1);
    const falta = (dados.meta_valor - dados.saldo_atual).toFixed(2);

    if (loading) return <div>A carregar sonho...</div>;

    return (
        <div className="card animate-fade-in" style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
        }}>
            {/* Título e Ícone */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <span style={{fontSize:'2rem'}}>🏠</span>
                    <div>
                        <h3 style={{margin:0, fontSize:'1.1rem', color:'#94a3b8'}}>Projeto Casa</h3>
                        <div style={{fontSize:'0.8rem', color:'#64748b'}}>Objetivo: {dados.meta_valor}€</div>
                    </div>
                </div>
                <button onClick={() => setModoEdicao(!modoEdicao)} style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem'}}>⚙️</button>
            </div>

            {/* MODO EDIÇÃO */}
            {modoEdicao ? (
                <div style={{background:'rgba(255,255,255,0.1)', padding:'10px', borderRadius:'8px', marginBottom:'15px'}}>
                    <div style={{marginBottom:'10px'}}>
                        <label style={{fontSize:'0.8rem', display:'block'}}>Meta Total (€)</label>
                        <input type="number" value={dados.meta_valor} onChange={e => setDados({...dados, meta_valor: e.target.value})} style={{width:'100%', padding:'5px', borderRadius:'4px', border:'none'}} />
                    </div>
                    <div style={{marginBottom:'10px'}}>
                        <label style={{fontSize:'0.8rem', display:'block'}}>Saldo Atual (€)</label>
                        <input type="number" value={dados.saldo_atual} onChange={e => setDados({...dados, saldo_atual: e.target.value})} style={{width:'100%', padding:'5px', borderRadius:'4px', border:'none'}} />
                    </div>
                    <button onClick={salvarConfig} className="btn-primary" style={{width:'100%', fontSize:'0.9rem'}}>💾 Guardar Config</button>
                </div>
            ) : (
                <>
                    {/* Barra de Progresso */}
                    <div style={{marginBottom:'20px'}}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px', fontWeight:'bold'}}>
                            <span style={{fontSize:'1.5rem'}}>{dados.saldo_atual}€</span>
                            <span style={{color:'#38bdf8'}}>{percentagem}%</span>
                        </div>
                        <div style={{width:'100%', height:'12px', background:'#334155', borderRadius:'6px', overflow:'hidden'}}>
                            <div style={{
                                width: `${percentagem}%`,
                                height:'100%',
                                background: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)',
                                transition: 'width 1s ease-in-out'
                            }}></div>
                        </div>
                        <div style={{textAlign:'right', fontSize:'0.8rem', color:'#94a3b8', marginTop:'5px'}}>
                            Faltam: <strong>{falta}€</strong>
                        </div>
                    </div>

                    {/* Adicionar Poupança Rápida */}
                    <form onSubmit={depositar} style={{display:'flex', gap:'10px'}}>
                        <input
                            type="number"
                            placeholder="Depositar (ex: 50)"
                            value={valorDeposito}
                            onChange={e => setValorDeposito(e.target.value)}
                            style={{
                                flex:1, padding:'10px', borderRadius:'8px', border:'none',
                                background:'rgba(255,255,255,0.1)', color:'white'
                            }}
                        />
                        <button type="submit" style={{
                            background:'#10b981', color:'white', border:'none', borderRadius:'8px',
                            padding:'0 15px', cursor:'pointer', fontWeight:'bold'
                        }}>
                            + 💰
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}