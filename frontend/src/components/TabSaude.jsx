import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2'; // <--- IMPORTANTE
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function TabSaude({ usuario, API_URL }) {
    const [historico, setHistorico] = useState([]);
    const [pesoInput, setPesoInput] = useState("");
    const [dataInput, setDataInput] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    // Usa a altura do perfil ou 1.75 como fallback
    const alturaUsuario = usuario?.altura || 1.75;
    const usuarioId = usuario?.id;


console.log("Objeto Usuario:", usuario);
    console.log("ID a pesquisar:", usuarioId);
    console.log("URL da API:", API_URL);

    useEffect(() => {
        if (usuarioId) carregarHistorico();
    }, [usuarioId]);

    const carregarHistorico = async () => {
        try {
            const res = await axios.get(`${API_URL}/saude/peso?usuario_id=${usuarioId}`);
            // Ordenar por data (para o gráfico não ficar riscado)
            const dadosOrdenados = res.data.sort((a, b) => new Date(a.data) - new Date(b.data));
            setHistorico(dadosOrdenados);
        } catch (e) {
            console.error("Erro ao carregar histórico", e);
        }
    };

    const adicionarPeso = async (e) => {
        e.preventDefault();
        if (!pesoInput) return;

        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/saude/peso`, {
                usuario_id: usuarioId,
                peso: parseFloat(pesoInput),
                data: dataInput
            });

            setPesoInput("");
            carregarHistorico(); // Atualiza o gráfico imediatamente

            // --- LÓGICA DO POPUP INTELIGENTE ---
            if (res.data.feedback) {
                // Feedback da IA (HTML Rico)
                Swal.fire({
                    title: '<strong>Treinador NutriAgent 🤖</strong>',
                    html: `<div style="text-align: left; font-size: 1.1rem; color: #4b5563; line-height: 1.6;">${res.data.feedback}</div>`,
                    icon: 'success',
                    confirmButtonText: 'Vamos a isso! 💪',
                    confirmButtonColor: '#10b981',
                    background: '#ffffff',
                    backdrop: `rgba(0,0,123,0.05)`
                });
            } else {
                // Feedback simples
                Swal.fire({
                    icon: 'success',
                    title: 'Peso Registado!',
                    showConfirmButton: false,
                    timer: 1500
                });
            }

        } catch (e) {
            console.error(e);
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Erro ao gravar o peso. Tenta novamente.',
                confirmButtonColor: '#ef4444'
            });
        } finally {
            setLoading(false);
        }
    };

    // Cálculos para os cartões
    const pesoAtual = historico.length > 0 ? historico[historico.length - 1].peso : 0;
    const pesoInicial = historico.length > 0 ? historico[0].peso : 0;
    // Cálculo da diferença (agora comparamos o último com o penúltimo para ver evolução recente, ou total)
    // Aqui mantive "Total" (Primeiro vs Último)
    const diferencaTotal = (pesoAtual - pesoInicial).toFixed(1);

    const imc = pesoAtual > 0 ? (pesoAtual / (alturaUsuario * alturaUsuario)).toFixed(1) : 0;

    let classificacaoIMC = "";
    let corIMC = "#64748b";
    if(imc < 18.5) { classificacaoIMC = "Abaixo do Peso"; corIMC = "#3b82f6"; }
    else if(imc < 25) { classificacaoIMC = "Peso Normal"; corIMC = "#10b981"; }
    else if(imc < 30) { classificacaoIMC = "Sobrepeso"; corIMC = "#f59e0b"; }
    else { classificacaoIMC = "Obesidade"; corIMC = "#ef4444"; }

    return (
        <div className="animate-fade-in" style={{maxWidth:'1000px', margin:'0 auto', paddingBottom:'40px'}}>

            {/* 1. CARTÕES DE RESUMO (KPIs) */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'20px', marginBottom:'30px'}}>

                {/* Peso Atual */}
                <div className="card shadow-hover" style={{borderLeft:'5px solid #6366f1', textAlign:'center', padding:'20px'}}>
                    <h3 style={{margin:0, color:'#64748b', fontSize:'0.85rem', textTransform:'uppercase', letterSpacing:'1px'}}>Peso Atual</h3>
                    <div style={{fontSize:'2.8rem', fontWeight:'800', color:'#1e293b', margin:'10px 0'}}>
                        {pesoAtual > 0 ? pesoAtual : '--'} <span style={{fontSize:'1.2rem', color:'#94a3b8', fontWeight:'normal'}}>kg</span>
                    </div>
                    <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>Meta: {usuario?.meta_calorias} kcal/dia</div>
                </div>

                {/* IMC */}
                <div className="card shadow-hover" style={{borderLeft:`5px solid ${corIMC}`, textAlign:'center', padding:'20px'}}>
                    <h3 style={{margin:0, color:'#64748b', fontSize:'0.85rem', textTransform:'uppercase', letterSpacing:'1px'}}>IMC</h3>
                    <div style={{fontSize:'2.8rem', fontWeight:'800', color: corIMC, margin:'10px 0'}}>
                        {imc > 0 ? imc : '--'}
                    </div>
                    <div style={{fontSize:'0.9rem', color: corIMC, fontWeight:'bold', background: `${corIMC}20`, display:'inline-block', padding:'4px 12px', borderRadius:'20px'}}>
                        {classificacaoIMC}
                    </div>
                </div>

                {/* Variação Total */}
                <div className="card shadow-hover" style={{borderLeft: diferencaTotal <= 0 ? '5px solid #10b981' : '5px solid #ef4444', textAlign:'center', padding:'20px'}}>
                    <h3 style={{margin:0, color:'#64748b', fontSize:'0.85rem', textTransform:'uppercase', letterSpacing:'1px'}}>Evolução Total</h3>
                    <div style={{fontSize:'2.8rem', fontWeight:'800', color: diferencaTotal <= 0 ? '#10b981' : '#ef4444', margin:'10px 0'}}>
                        {diferencaTotal > 0 ? `+${diferencaTotal}` : diferencaTotal} <span style={{fontSize:'1.2rem', fontWeight:'normal'}}>kg</span>
                    </div>
                    <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>Desde o início</div>
                </div>
            </div>

            {/* 2. ÁREA PRINCIPAL (GRÁFICO E FORMULÁRIO) */}
            <div style={{display:'grid', gridTemplateColumns: window.innerWidth < 900 ? '1fr' : '2fr 1fr', gap:'30px', alignItems:'start'}}>

                {/* ESQUERDA: GRÁFICO */}
                <div className="card" style={{height:'400px', padding:'20px', position:'relative'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                         <h3 style={{margin:0, color:'#1f2937'}}>📉 A tua Jornada</h3>
                         {historico.length > 0 && <span style={{fontSize:'0.8rem', color:'#6b7280'}}>{historico.length} registos</span>}
                    </div>

                    {historico.length > 1 ? (
                        <ResponsiveContainer width="100%" height="85%">
                            <LineChart data={historico} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="data"
                                    tickFormatter={(str) => format(parseISO(str), 'dd MMM', { locale: pt })}
                                    stroke="#94a3b8"
                                    tick={{fontSize: 12}}
                                    tickMargin={10}
                                />
                                <YAxis
                                    domain={['auto', 'auto']}
                                    stroke="#94a3b8"
                                    tick={{fontSize: 12}}
                                />
                                <Tooltip
                                    contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                                    labelFormatter={(label) => format(parseISO(label), 'dd de MMMM, yyyy', { locale: pt })}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="peso"
                                    stroke="#6366f1"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 7 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{height:'80%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#94a3b8', textAlign:'center', opacity:0.7}}>
                            <div style={{fontSize:'3rem', marginBottom:'10px'}}>🌱</div>
                            <p>O teu gráfico vai crescer aqui.<br/>Adiciona mais um registo!</p>
                        </div>
                    )}
                </div>

                {/* DIREITA: FORMULÁRIO E MINI-HISTÓRICO */}
                <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>

                    {/* Formulário de Registo */}
                    <div className="card" style={{padding:'25px', background:'linear-gradient(to bottom right, #ffffff, #f8fafc)'}}>
                        <h3 style={{marginTop:0, color:'#1e293b', display:'flex', alignItems:'center', gap:'8px'}}>
                            ⚖️ Registar Peso
                        </h3>
                        <p style={{fontSize:'0.85rem', color:'#64748b', marginBottom:'20px'}}>
                            Mantém o foco! Regista o teu peso regularmente para a IA te ajudar.
                        </p>

                        <form onSubmit={adicionarPeso} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                            <div>
                                <label style={labelStyle}>Data</label>
                                <input
                                    type="date"
                                    required
                                    value={dataInput}
                                    onChange={e => setDataInput(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Peso (kg)</label>
                                <div style={{position:'relative'}}>
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        placeholder="0.00"
                                        value={pesoInput}
                                        onChange={e => setPesoInput(e.target.value)}
                                        style={{...inputStyle, paddingRight:'40px', fontSize:'1.1rem', fontWeight:'bold', color:'#334155'}}
                                    />
                                    <span style={{position:'absolute', right:'15px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8'}}>kg</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary"
                                style={{
                                    padding:'12px',
                                    marginTop:'10px',
                                    background: loading ? '#94a3b8' : '#6366f1',
                                    transition: 'all 0.2s',
                                    transform: loading ? 'none' : 'scale(1)',
                                    cursor: loading ? 'wait' : 'pointer'
                                }}
                            >
                                {loading ? "A processar..." : "💾 Guardar Registo"}
                            </button>
                        </form>
                    </div>

                    {/* Histórico Recente (Lista) */}
                    <div className="card" style={{padding:'20px'}}>
                        <h4 style={{margin:'0 0 15px 0', fontSize:'0.9rem', color:'#64748b', textTransform:'uppercase'}}>Últimos Registos</h4>
                        <div style={{maxHeight:'200px', overflowY:'auto', paddingRight:'5px'}}>
                            {historico.slice().reverse().map((reg, idx) => (
                                <div key={idx} style={{
                                    display:'flex',
                                    justifyContent:'space-between',
                                    alignItems:'center',
                                    padding:'10px 0',
                                    borderBottom:'1px solid #f1f5f9',
                                    fontSize:'0.9rem'
                                }}>
                                    <span style={{color:'#64748b', display:'flex', alignItems:'center', gap:'8px'}}>
                                        📅 {format(parseISO(reg.data), 'dd/MM/yyyy')}
                                    </span>
                                    <strong style={{color:'#334155', background:'#f1f5f9', padding:'2px 8px', borderRadius:'6px'}}>
                                        {reg.peso} kg
                                    </strong>
                                </div>
                            ))}
                            {historico.length === 0 && <p style={{fontSize:'0.85rem', color:'#cbd5e1', fontStyle:'italic'}}>Sem histórico ainda.</p>}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

// Estilos Auxiliares
const inputStyle = {
    width:'100%',
    padding:'12px',
    borderRadius:'8px',
    border:'1px solid #cbd5e1',
    boxSizing:'border-box',
    outlineColor: '#6366f1'
};

const labelStyle = {
    display:'block',
    fontSize:'0.8rem',
    marginBottom:'6px',
    color:'#475569',
    fontWeight:'600'
};