import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import Skin3DViewer from './Skin3DViewer';

export default function TabMinecraft({ API_URL }) {
    // --- ESTADOS ---
    const [activeTab, setActiveTab] = useState('ficha');
    const [logInput, setLogInput] = useState("");
    const [memoria, setMemoria] = useState("");
    const [loadingMemoria, setLoadingMemoria] = useState(false);

    // Estado Visual do Jogador
    const [stats, setStats] = useState({
        nome: 'Ambrósio',
        nick: 'MHF_Steve',
        nivel: '1',
        classe: 'Aldeão',
        inventario: []
    });

    // Estado dos NPCs (NOVO)
    const [npcs, setNpcs] = useState([]);

    useEffect(() => {
        carregarMemoria();
    }, []);

    useEffect(() => {
        if(memoria) parseMemoriaToStats(memoria);
    }, [memoria]);

    const carregarMemoria = async () => {
        try {
            const res = await axios.get(`${API_URL}/minecraft/memoria`);
            setMemoria(res.data.conteudo);
        } catch (e) { console.error("Erro memoria", e); }
    };

    const atualizarMemoria = async () => {
        if (!logInput) return Swal.fire('Aviso', 'Cola primeiro o log do dia!', 'warning');

        setLoadingMemoria(true);
        try {
            const res = await axios.post(`${API_URL}/minecraft/memoria/atualizar`, {
                log: logInput
            });
            setMemoria(res.data.nova_memoria);
            setLogInput("");
            Swal.fire('Sucesso', 'Memória Atualizada!', 'success');
        } catch (e) {
            Swal.fire('Erro', 'Falha ao gravar memória.', 'error');
        } finally {
            setLoadingMemoria(false);
        }
    };

    // --- PARSER INTELIGENTE ---
    const parseMemoriaToStats = (texto) => {
        // 1. Extrair valores simples (Nome, Nível, etc.)
        const extract = (key) => {
            const regex = new RegExp(`${key}[:=]\\s*(.*?)(?:\\||$|\\n)`, 'i');
            const match = texto.match(regex);
            return match ? match[1].trim() : null;
        };

        // 2. Extrair Listas (Inventário vs NPCs)
        const lines = texto.split('\n');
        let currentSection = 'GERAL'; // Secção atual
        let tempInventory = [];
        let tempNpcs = [];

        lines.forEach(line => {
            const l = line.trim();
            const upper = l.toUpperCase();

            // -- DETECTOR DE SECÇÃO --
            // Se a linha tem "INVENTÁRIO", mudamos o modo de leitura para INV
            if (upper.includes('INVENTÁRIO') || upper.includes('ITEMS') || upper.includes('MOCHILA')) {
                currentSection = 'INV';
                return; // Pula a linha do título
            }
            // Se a linha tem "CONHECIDOS", "NPCS" ou "ENTIDADES", mudamos para NPC
            else if (upper.includes('CONHECIDOS') || upper.includes('NPCS') || upper.includes('ENTIDADES')) {
                currentSection = 'NPC';
                return;
            }
            // Se encontrar outro título (ex: DIÁRIO), para de ler listas
            else if (l.startsWith('===') || upper.includes('DIÁRIO') || upper.includes('HISTÓRICO')) {
                currentSection = 'OUTRO';
                return;
            }

            // -- PROCESSADOR DE LINHAS COM TRAÇO (-) --
            if (l.startsWith('-')) {
                const content = l.replace('-', '').trim();

                if (currentSection === 'INV') {
                    // Adiciona ao Inventário
                    tempInventory.push(content);
                }
                else if (currentSection === 'NPC') {
                    // Adiciona aos NPCs (Tenta separar Nome: Descrição)
                    const splitPoint = content.indexOf(':');
                    if (splitPoint > -1) {
                        tempNpcs.push({
                            nome: content.substring(0, splitPoint).trim(),
                            desc: content.substring(splitPoint + 1).trim()
                        });
                    } else {
                        tempNpcs.push({ nome: content, desc: 'Sem detalhes.' });
                    }
                }
            }
        });

        // 3. Atualizar Estado (Se o inventário estiver vazio, mete um aviso)
        if (tempInventory.length === 0) tempInventory = ['Mochila Vazia'];

        setStats({
            nome: extract('Nome') || 'Ambrósio',
            nick: extract('Nick') || extract('IGN') || 'Steve',
            nivel: extract('Nível') || extract('Level') || '1',
            classe: extract('Classe') || 'Sobrevivente',
            inventario: tempInventory
        });

        setNpcs(tempNpcs);
    };

    const getIcon = (nomeItem) => {
        const n = nomeItem.toLowerCase();
        if (n.includes('espada')) return '⚔️';
        if (n.includes('picareta')) return '⛏️';
        if (n.includes('machado')) return '🪓';
        if (n.includes('arco') || n.includes('besta')) return '🏹';
        if (n.includes('queijo')) return '🧀';
        if (n.includes('pão') || n.includes('bife') || n.includes('comida')) return '🍖';
        if (n.includes('poção')) return '🧪';
        if (n.includes('livro') || n.includes('caderno')) return '📘';
        if (n.includes('diamante') || n.includes('esmeralda')) return '💎';
        if (n.includes('madeira') || n.includes('tora')) return '🪵';
        if (n.includes('pedra') || n.includes('bloco')) return '🧱';
        if (n.includes('capacete') || n.includes('peitoral')) return '🛡️';
        return '📦';
    };

    return (
        <div className="animate-fade-in" style={{maxWidth:'1000px', margin:'0 auto'}}>

            {/* TABS NAVEGAÇÃO */}
            <div style={{display:'flex', gap:'5px', marginBottom:'20px', borderBottom:'2px solid #374151'}}>
                <button onClick={() => setActiveTab('ficha')} style={activeTab === 'ficha' ? activeTabStyle : inactiveTabStyle}>🧙‍♂️ Ficha</button>
                <button onClick={() => setActiveTab('npcs')} style={activeTab === 'npcs' ? activeTabStyle : inactiveTabStyle}>👥 Personagens</button>
                <button onClick={() => setActiveTab('logistica')} style={activeTab === 'logistica' ? activeTabStyle : inactiveTabStyle}>📝 Diário</button>
            </div>

            {/* ABA 1: FICHA (JOGADOR) */}
            {activeTab === 'ficha' && (
                <div style={{display:'grid', gridTemplateColumns: '300px 1fr', gap:'30px'}}>
                    <div className="card" style={{background:'#1f2937', color:'white', textAlign:'center', padding:'20px', border:'2px solid #4b5563'}}>
                        <h2 style={{margin:'0 0 5px 0', color:'#fbbf24'}}>{stats.nome}</h2>
                        <div style={{fontSize:'0.8rem', color:'#9ca3af', marginBottom:'15px'}}>{stats.classe} • Nível {stats.nivel}</div>
                        <div style={{marginBottom:'20px'}}>
                            <Skin3DViewer skinUrl="/assets/ambrosio.png" />
                        </div>
                        {/* Barras de Vida/XP... */}
                        <div style={{textAlign:'left'}}>
                            <div style={{height:'8px', background:'#374151', borderRadius:'4px', marginBottom:'5px'}}><div style={{width:'100%', height:'100%', background:'#ef4444', borderRadius:'4px'}}></div></div>
                            <div style={{height:'8px', background:'#374151', borderRadius:'4px'}}><div style={{width:'50%', height:'100%', background:'#10b981', borderRadius:'4px'}}></div></div>
                        </div>
                    </div>

                    <div>
                        <div className="card" style={{background:'#c6c6c6', padding:'10px', border:'4px solid #555'}}>
                            <h3 style={{margin:'0 0 10px 0', color:'#333', fontSize:'1rem'}}>🎒 Inventário</h3>
                            <div style={{display:'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap:'5px', background:'#8b8b8b', padding:'10px', border:'2px solid #fff', borderRightColor:'#555', borderBottomColor:'#555'}}>
                                {stats.inventario.map((item, i) => (
                                    <div key={i} title={item} style={slotStyle}><span style={{fontSize:'1.8rem'}}>{getIcon(item)}</span></div>
                                ))}
                                {[...Array(Math.max(0, 27 - stats.inventario.length))].map((_, i) => <div key={`empty-${i}`} style={slotStyle}></div>)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ABA 2: PERSONAGENS (NPCS) - NOVA! */}
            {activeTab === 'npcs' && (
                <div className="animate-fade-in">
                    <div className="card" style={{marginBottom:'20px', borderLeft:'5px solid #8b5cf6'}}>
                        <h3 style={{marginTop:0, color:'#5b21b6'}}>Base de Dados de Entidades</h3>
                        <p style={{margin:0, color:'#6b7280', fontSize:'0.9rem'}}>Registo de aliados, inimigos e criaturas notáveis encontrados pelo Ambrósio.</p>
                    </div>

                    {npcs.length === 0 ? (
                        <div style={{textAlign:'center', padding:'40px', color:'#9ca3af', fontStyle:'italic'}}>
                            "Ainda não encontrei ninguém digno de nota (ou sobrevivi para contar)."
                        </div>
                    ) : (
                        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))', gap:'20px'}}>
                            {npcs.map((npc, idx) => {
                                // Lógica simples para cor do cartão
                                let borderCor = '#9ca3af'; // Neutro
                                let icon = '😐';
                                if(npc.desc.toLowerCase().includes('inimigo') || npc.desc.toLowerCase().includes('hostil')) {
                                    borderCor = '#ef4444'; // Vermelho
                                    icon = '⚔️';
                                } else if(npc.desc.toLowerCase().includes('aliado') || npc.desc.toLowerCase().includes('amigo')) {
                                    borderCor = '#10b981'; // Verde
                                    icon = '🤝';
                                }

                                return (
                                    <div key={idx} className="card shadow-hover" style={{borderTop:`4px solid ${borderCor}`, padding:'15px'}}>
                                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                                            <h4 style={{margin:0, fontSize:'1.1rem', color:'#1f2937'}}>{npc.nome}</h4>
                                            <span style={{fontSize:'1.5rem'}}>{icon}</span>
                                        </div>
                                        <p style={{fontSize:'0.9rem', color:'#4b5563', lineHeight:'1.5'}}>
                                            {npc.desc}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ABA 3: LOGÍSTICA (DIÁRIO) */}
            {activeTab === 'logistica' && (
                <div style={{display:'flex', gap:'20px'}}>
                    <div style={{flex: 2}}>
                        <div className="card">
                            <h3 style={{marginTop:0}}>📝 Diário de Bordo</h3>
                            <textarea
                                value={logInput}
                                onChange={(e) => setLogInput(e.target.value)}
                                placeholder="Hoje conheci um mercador suspeito..."
                                style={{width:'100%', height:'200px', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}
                            />
                            <button onClick={atualizarMemoria} disabled={loadingMemoria} className="btn-primary" style={{marginTop:'10px', width:'100%'}}>
                                {loadingMemoria ? "A Gravar..." : "💾 Atualizar Tudo"}
                            </button>
                        </div>
                    </div>
                    <div style={{flex: 1}}>
                        <div className="card" style={{height:'100%', background:'#1e1e1e', color:'#10b981', fontFamily:'monospace'}}>
                             <textarea value={memoria} readOnly style={{width:'100%', height:'90%', background:'transparent', border:'none', color:'inherit', resize:'none'}} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ESTILOS (Mantém os anteriores)
const slotStyle = {
    width: '100%', aspectRatio: '1/1', background: '#8b8b8b',
    border: '2px solid #373737', borderRightColor: '#fff', borderBottomColor: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help', boxShadow: 'inset 2px 2px 0px #555'
};
const activeTabStyle = { padding: '10px 20px', background: '#1f2937', color: '#fbbf24', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: 'bold' };
const inactiveTabStyle = { padding: '10px 20px', background: '#e5e7eb', color: '#4b5563', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer' };