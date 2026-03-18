import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const CORES_PADRAO = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function TabGeral({
    saldoReal, resumo, totalFixasPendentes, podeGastarHoje, diasRestantes,
    dadosGrafico, dadosAnuais, rendimentos, setMostrarModalSalario,
    mesSelecionado, setMesSelecionado, getDetalhesMes, getNomeMes, getTaxaPoupanca
}) {

    // ESTADO PARA SABER QUAL CATEGORIA ESTÁ ABERTA NA LISTA DE DESPESAS
    const [categoriaExpandida, setCategoriaExpandida] = useState(null);

    // METAS (Para as barras de progresso)
    const METAS = {
        'Restaurantes': 100,
        'Supermercado': 200
    };

    // Calcular detalhes se houver mês selecionado
    const detalhes = mesSelecionado ? getDetalhesMes(mesSelecionado) : null;

    return (
        <div className="dashboard-grid" style={{display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap:'20px'}}>

            {/* =================================================================================
                SECÇÃO SUPERIOR: CARTÕES DE RESUMO
               ================================================================================= */}

            {!mesSelecionado ? (
                // --- VISÃO GERAL (HOJE) ---
                <>
                    <div className="card" style={{background: saldoReal > 0 ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : '#ef4444', color:'white'}}>
                        <h3 style={{margin:0, opacity:0.9, fontSize:'1rem'}}>Saldo Livre (Pós-Contas)</h3>
                        <div style={{fontSize:'3rem', fontWeight:'bold', margin:'5px 0'}}>{saldoReal.toFixed(2)}€</div>
                        <p style={{margin:0, opacity:0.9, fontSize:'0.85rem'}}>Banco: {resumo.saldo_total.toFixed(2)}€ | Falta sair: -{totalFixasPendentes.toFixed(2)}€</p>
                    </div>
                    <div className="card" style={{background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color:'white'}}>
                        <h3 style={{margin:0, opacity:0.9, fontSize:'1rem'}}>Podes gastar por dia</h3>
                        <div style={{fontSize:'2.5rem', fontWeight:'bold', margin:'5px 0'}}>{podeGastarHoje.toFixed(2)}€</div>
                        <p style={{margin:0, opacity:0.8, fontSize:'0.85rem'}}>Faltam {diasRestantes} dias para acabar o mês.</p>
                    </div>
                    <div className="card">
                        <h3 style={{margin:0, color:'#64748b'}}>Gastos Variáveis</h3>
                        <div style={{width:'100%', height:'200px'}}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={dadosGrafico} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                        {dadosGrafico.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color || CORES_PADRAO[index]} />)}
                                    </Pie>
                                    <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            ) : (
                // --- DETALHE DO MÊS (CARTÕES DE TOTAL) ---
                <>
                    {/* ENTRADAS */}
                    <div className="card" style={{borderLeft:'5px solid #166534', background:'#f0fdf4'}}>
                        <h3 style={{margin:0, color:'#166534', fontSize:'1rem'}}>💰 Entradas em {getNomeMes(mesSelecionado)}</h3>
                        <div style={{fontSize:'2.5rem', fontWeight:'bold', color:'#14532d', margin:'10px 0'}}>
                            {detalhes.receitaTotalReal ? detalhes.receitaTotalReal.toFixed(2) : detalhes.receita.toFixed(2)}€
                        </div>
                        <p style={{margin:0, fontSize:'0.8rem', color:'#166534'}}>Ordenado + Extras</p>
                    </div>

                    {/* GASTOS */}
                    <div className="card" style={{borderLeft:'5px solid #dc2626', background:'#fef2f2'}}>
                        <h3 style={{margin:0, color:'#991b1b', fontSize:'1rem'}}>💸 Gastos em {getNomeMes(mesSelecionado)}</h3>
                        <div style={{fontSize:'2.5rem', fontWeight:'bold', color:'#7f1d1d', margin:'10px 0'}}>
                            {detalhes.totalDespesas.toFixed(2)}€
                        </div>
                        <p style={{margin:0, fontSize:'0.8rem', color:'#991b1b'}}>Fixas + Variáveis</p>
                    </div>

                    {/* SALDO */}
                    <div className="card" style={{borderLeft:'5px solid #2563eb', background:'#eff6ff'}}>
                        <h3 style={{margin:0, color:'#1e40af', fontSize:'1rem'}}>🏦 Saldo Final</h3>
                        <div style={{fontSize:'2.5rem', fontWeight:'bold', color: detalhes.saldo >= 0 ? '#1e3a8a' : '#dc2626', margin:'10px 0'}}>
                            {detalhes.saldo > 0 ? '+' : ''}{detalhes.saldo.toFixed(2)}€
                        </div>
                        <p style={{margin:0, fontSize:'0.8rem', color:'#1e40af'}}>
                            {detalhes.saldo > 0 ? 'Boa poupança! 🎉' : 'Mês apertado ⚠️'}
                        </p>
                    </div>
                </>
            )}

            {/* =================================================================================
                SECÇÃO INFERIOR: DETALHES OU TABELA
               ================================================================================= */}
            <div className="card" style={{gridColumn: '1 / -1'}}>
                {!mesSelecionado ? (
                    // --- TABELA ANUAL ---
                    <>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                            <h3 style={{marginTop:0, color:'#1e293b'}}>🗓️ Mapa Anual</h3>
                            <div style={{display:'flex', alignItems:'center', gap:'10px', background:'#f1f5f9', padding:'5px 10px', borderRadius:'8px'}}>
                                <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
                                    <span style={{fontSize:'0.75rem', color:'#64748b'}}>Rendimento Mensal</span>
                                    <strong onClick={() => setMostrarModalSalario(true)} style={{cursor:'pointer', color:'#2563eb', borderBottom:'1px dashed #2563eb'}}>
                                        {rendimentos.total.toFixed(2)}€ ✏️
                                    </strong>
                                </div>
                            </div>
                        </div>
                        <div style={{overflowX:'auto'}}>
                            <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.95rem'}}>
                                <thead>
                                    <tr style={{background:'#f8fafc', color:'#64748b', textAlign:'right'}}>
                                        <th style={{padding:'12px', textAlign:'left', borderRadius:'8px 0 0 8px'}}>Mês</th>
                                        <th style={{padding:'12px', color:'#166534'}}>Entradas</th>
                                        <th style={{padding:'12px', color:'#dc2626'}}>Saídas</th>
                                        <th style={{padding:'12px'}}>Saldo</th>
                                        <th style={{padding:'12px', borderRadius:'0 8px 8px 0'}}>Poupança</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dadosAnuais.map((d, index) => {
                                        const saldo = d.receitas - d.despesas;
                                        const taxa = getTaxaPoupanca(d.receitas, d.despesas);
                                        return (
                                            <tr key={index} onClick={() => setMesSelecionado(d.mes)} style={{borderBottom:'1px solid #f1f5f9', cursor:'pointer', transition: 'background 0.2s'}} onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'} onMouseOut={(e) => e.currentTarget.style.background = 'white'}>
                                                <td style={{padding:'15px', fontWeight:'bold', textTransform:'capitalize', color:'#334155'}}>{getNomeMes(d.mes)}</td>
                                                <td style={{padding:'15px', textAlign:'right', color:'#166534', fontWeight:'500'}}>{d.receitas.toFixed(2)}€ {d.eh_previsao && '🔮'}</td>
                                                <td style={{padding:'15px', textAlign:'right', color:'#dc2626', fontWeight:'500'}}>{d.despesas.toFixed(2)}€</td>
                                                <td style={{padding:'15px', textAlign:'right', fontWeight:'bold', color: saldo >= 0 ? '#166534' : '#dc2626'}}>{saldo > 0 ? '+' : ''}{saldo.toFixed(2)}€</td>
                                                <td style={{padding:'15px', textAlign:'right'}}>
                                                    <span style={{padding:'4px 8px', borderRadius:'12px', fontSize:'0.8rem', fontWeight:'bold', background: taxa > 20 ? '#dcfce7' : (taxa > 0 ? '#fef9c3' : '#fee2e2'), color: taxa > 20 ? '#166534' : (taxa > 0 ? '#854d0e' : '#991b1b')}}>
                                                        {taxa.toFixed(0)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    // --- LISTA DETALHADA DO MÊS ---
                    <div>
                        <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>
                            <button onClick={() => setMesSelecionado(null)} style={{padding:'8px 15px', border:'1px solid #cbd5e1', background:'white', borderRadius:'6px', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px', color:'#475569', fontWeight:'500'}}>
                                ⬅ Voltar ao Ano
                            </button>
                            <h3 style={{margin:0, textTransform:'capitalize', color:'#1e293b'}}>Detalhe Completo</h3>
                        </div>

                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'30px'}}>

                            {/* COLUNA RECEITAS (AGORA MOSTRA LISTA DE TUDO!) */}
                            <div style={{background:'#fff', padding:'15px', borderRadius:'8px', border:'1px solid #e2e8f0'}}>
                                <h4 style={{margin:'0 0 10px 0', color:'#166534', borderBottom:'1px solid #f0fdf4', paddingBottom:'5px'}}>Origem das Entradas</h4>

                                <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>

                                    {/* 1. LISTA DE RENDIMENTOS PRINCIPAIS (SALÁRIO + UNA + ETC) */}
                                    <span style={{fontSize:'0.75rem', fontWeight:'bold', color:'#64748b', marginTop:'5px', textTransform:'uppercase'}}>Salários e Base</span>

                                    {/* Se houver lista de salários reais, mostra-os um a um */}
                                    {detalhes.listaSalarios && detalhes.listaSalarios.length > 0 ? (
                                        detalhes.listaSalarios.map(s => (
                                            <div key={s.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.85rem', borderBottom:'1px dashed #eee', paddingBottom:'5px'}}>
                                                <div>
                                                    <span style={{color:'#334155', fontWeight:'500'}}>{s.descricao}</span>
                                                    <div style={{fontSize:'0.75rem', color:'#64748b'}}>
                                                        Recebido a {new Date(s.data_transacao).toLocaleDateString('pt-PT')}
                                                    </div>
                                                </div>
                                                <strong style={{color:'#166534'}}>
                                                    {s.valor.toFixed(2)}€
                                                </strong>
                                            </div>
                                        ))
                                    ) : (
                                        // Se não houver (mês futuro), mostra a Previsão
                                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.9rem', color:'#94a3b8', fontStyle:'italic'}}>
                                            <span>Previsão (Base)</span>
                                            <strong>{rendimentos.total.toFixed(2)}€</strong>
                                        </div>
                                    )}

                                    {/* 2. EXTRAS (MBWay, Vendas, etc) */}
                                    {detalhes.entradasExtras && detalhes.entradasExtras.length > 0 && (
                                        <>
                                            <span style={{fontSize:'0.75rem', fontWeight:'bold', color:'#64748b', marginTop:'15px', textTransform:'uppercase'}}>Outras Entradas (+)</span>
                                            {detalhes.entradasExtras.map(extra => (
                                                <div key={extra.id} style={{display:'flex', justifyContent:'space-between', fontSize:'0.85rem', padding:'2px 0'}}>
                                                    <span style={{color:'#334155'}}>{extra.descricao}</span>
                                                    <span style={{color:'#15803d', fontWeight:'500'}}>+{extra.valor.toFixed(2)}€</span>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* COLUNA DESPESAS (EXPANSÍVEL) */}
                            <div style={{background:'#fff', padding:'0', borderRadius:'8px', border:'1px solid #e2e8f0', boxShadow:'0 2px 5px rgba(0,0,0,0.05)', overflow:'hidden'}}>
                                <div style={{padding:'15px', borderBottom:'1px solid #f1f5f9', background:'#f8fafc'}}>
                                    <h4 style={{margin:0, color:'#dc2626'}}>Mapa de Despesas</h4>
                                </div>

                                <div style={{padding:'15px', maxHeight:'600px', overflowY:'auto'}}>
                                    {/* FIXAS */}
                                    <h5 style={{margin:'0 0 10px 0', fontSize:'0.85rem', color:'#64748b', textTransform:'uppercase'}}>📌 Contas Fixas</h5>
                                    {detalhes.lista.map(f => {
                                        let corFundo = '#fff'; let corBorda = '#e2e8f0'; let icone = '⏳';
                                        if (f.status === 'PAGO') { corFundo = '#f0fdf4'; corBorda = '#bbf7d0'; icone = '✅'; }
                                        else if (f.status === 'NAO_PAGO') { corFundo = '#fef2f2'; corBorda = '#fecaca'; icone = '❌'; }

                                        return (
                                            <div key={f.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px', padding:'8px', background: corFundo, border: `1px solid ${corBorda}`, borderRadius:'6px'}}>
                                                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                                    <span style={{fontSize:'1rem'}}>{icone}</span>
                                                    <div>
                                                        <span style={{display:'block', fontWeight: f.status === 'PENDENTE' ? '400' : '600', color: f.status === 'NAO_PAGO' ? '#991b1b' : '#334155', fontSize:'0.9rem'}}>{f.descricao}</span>
                                                        {f.status === 'PAGO' && f.diferenca !== 0 && (
                                                            <span style={{fontSize:'0.7rem', color: f.diferenca > 0 ? '#dc2626' : '#166534'}}>{f.diferenca > 0 ? `(+${f.diferenca.toFixed(2)}€)` : `(${f.diferenca.toFixed(2)}€ poupado)`}</span>
                                                        )}
                                                        {f.status === 'NAO_PAGO' && <span style={{fontSize:'0.7rem', color:'#dc2626', fontWeight:'bold'}}>Não saiu da conta!</span>}
                                                    </div>
                                                </div>
                                                <strong style={{color: f.status === 'PAGO' ? '#166534' : (f.status === 'NAO_PAGO' ? '#dc2626' : '#64748b')}}>{f.valor.toFixed(2)}€</strong>
                                            </div>
                                        )
                                    })}

                                    {/* VARIÁVEIS */}
                                    {detalhes.topCategorias.length > 0 && (
                                        <>
                                            <h5 style={{margin:'20px 0 10px 0', fontSize:'0.85rem', color:'#64748b', textTransform:'uppercase', borderTop:'1px dashed #e2e8f0', paddingTop:'15px'}}>📊 Variáveis (Clica para ver)</h5>
                                            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                                                {detalhes.topCategorias.map((cat, idx) => {
                                                    const meta = METAS[cat.nome];
                                                    const percentagemMeta = meta ? (cat.total / meta) * 100 : 0;
                                                    const corBarra = meta && cat.total > meta ? '#ef4444' : (meta && cat.total > meta * 0.8 ? '#f59e0b' : '#3b82f6');
                                                    const estaAberto = categoriaExpandida === cat.nome;

                                                    return (
                                                        <div key={idx} onClick={() => setCategoriaExpandida(estaAberto ? null : cat.nome)} style={{background: estaAberto ? '#eff6ff' : '#f8fafc', padding:'8px 10px', borderRadius:'6px', border:'1px solid ' + (estaAberto ? '#bfdbfe' : '#f1f5f9'), cursor:'pointer', transition:'all 0.2s'}}>
                                                            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px', fontSize:'0.9rem'}}>
                                                                <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                                                    <span style={{fontSize:'0.7rem'}}>{estaAberto ? '🔽' : '▶️'}</span>
                                                                    <span style={{fontWeight:'500', color:'#334155'}}>
                                                                        {cat.nome} {meta && <span style={{fontSize:'0.75rem', color:'#64748b'}}>(Meta: {meta}€)</span>}
                                                                    </span>
                                                                </div>
                                                                <span style={{fontWeight:'bold', color: meta && cat.total > meta ? '#dc2626' : '#1e293b'}}>{cat.total.toFixed(2)}€</span>
                                                            </div>
                                                            <div style={{width:'100%', height:'8px', background:'#e2e8f0', borderRadius:'4px', overflow:'hidden', position:'relative'}}>
                                                                <div style={{width: meta ? `${Math.min(percentagemMeta, 100)}%` : `${cat.percentagem}%`, height:'100%', background: corBarra, borderRadius:'4px', transition: 'width 0.5s ease'}}></div>
                                                            </div>
                                                            {estaAberto && (
                                                                <div style={{marginTop:'10px', borderTop:'1px solid #cbd5e1', paddingTop:'5px', paddingLeft:'5px'}}>
                                                                    {detalhes.transacoesVariaveis.filter(t => (t.categoria || 'Outros') === cat.nome).map(t => (
                                                                        <div key={t.id} style={{display:'flex', justifyContent:'space-between', fontSize:'0.8rem', padding:'4px 0', borderBottom:'1px dashed #e2e8f0', color:'#475569'}}>
                                                                            <span>{t.descricao}</span>
                                                                            <span>{Math.abs(t.valor).toFixed(2)}€</span>
                                                                        </div>
                                                                    ))}
                                                                    {detalhes.transacoesVariaveis.filter(t => (t.categoria || 'Outros') === cat.nome).length === 0 && <div style={{fontSize:'0.75rem', color:'#999'}}>Sem movimentos.</div>}
                                                                </div>
                                                            )}
                                                            {meta && cat.total > meta && !estaAberto && <div style={{fontSize:'0.75rem', color:'#dc2626', marginTop:'2px', fontWeight:'bold'}}>⚠️ Ultrapassou o orçamento!</div>}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}