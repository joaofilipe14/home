import React, { useState } from 'react';
import axios from 'axios';
import WidgetCasa from './WidgetCasa';

export default function TabGestao({ despesasFixas, fixasPagas, toggleFixaPaga, removerFixa, API_URL, usuario, carregarDados }) {
    // --- ESTADOS ---
    const [modoRevisao, setModoRevisao] = useState(false);
    const [dadosRevisao, setDadosRevisao] = useState(null);
    const [imagemTalao, setImagemTalao] = useState(null);
    const [lendoTalao, setLendoTalao] = useState(false);
    const [erroUpload, setErroUpload] = useState(null);

    // --- ESTADOS PARA CONTAS FIXAS ---
    const [novaFixa, setNovaFixa] = useState({ descricao: '', valor: '', dia: 1, meses: '' });
    const [editandoFixaId, setEditandoFixaId] = useState(null);

    // --- HELPER: Extrair números de strings ---
    const extrairNumero = (str) => {
        if (!str) return 1;
        // Substitui virgula por ponto e procura o primeiro numero
        const match = String(str).replace(',', '.').match(/[\d\.]+/);
        return match ? parseFloat(match[0]) : 1;
    };

    // --- UPLOAD E ANÁLISE ---
    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if(!file) return;

        setLendoTalao(true);
        setErroUpload(null);

        const fd = new FormData();
        fd.append('file', file);
        fd.append('usuario_id', usuario.id);

        try {
            const res = await axios.post(`${API_URL}/financas/upload-talao`, fd);

            if (res.data.dados_provisorios) {
                // PREPARAÇÃO DOS DADOS: Calcula unitários iniciais
                const itensProcessados = res.data.dados_provisorios.itens.map(item => {
                    const qtdTexto = item.qtd && item.qtd.toString().trim() !== '' ? item.qtd : "1 un";
                    const qtdNumero = extrairNumero(qtdTexto);

                    // Garante que temos números válidos
                    const precoTotal = parseFloat(item.preco || 0);

                    // Evita divisão por zero
                    const unitarioCalc = qtdNumero > 0 ? (precoTotal / qtdNumero) : precoTotal;

                    return {
                        ...item,
                        qtd: qtdTexto,
                        qtd_numerica: qtdNumero,
                        // Guardamos como string/float para edição, mas backend quer float
                        preco_unitario: parseFloat(unitarioCalc.toFixed(2)),
                        desconto: 0.00,
                        preco_final: precoTotal,
                        categoria_financeira: item.categoria_financeira || 'Outros'
                    };
                });

                setDadosRevisao({
                    ...res.data.dados_provisorios,
                    itens: itensProcessados,
                    total: parseFloat(res.data.dados_provisorios.total)
                });

                const baseUrl = API_URL.replace('/api', '');
                setImagemTalao(`${baseUrl}${res.data.imagem_url}`);
                setModoRevisao(true);
            }

        } catch(err) {
            console.error(err);
            setErroUpload("Erro ao ler talão. Tenta outra imagem.");
        } finally {
            setLendoTalao(false);
            e.target.value = null; // Reset do input file
        }
    }

    // --- LÓGICA DE CÁLCULO (A "CALCULADORA") ---
    const atualizarItem = (index, campo, valor) => {
        // 1. Criar CÓPIA do array e do item (Imutabilidade é crucial no React)
        const novosItens = [...dadosRevisao.itens];
        const itemAtualizado = { ...novosItens[index] };

        // 2. Atualizar o campo que o utilizador mexeu
        if (campo === 'qtd') {
            itemAtualizado.qtd = valor;
            itemAtualizado.qtd_numerica = extrairNumero(valor);
        } else if (campo === 'preco_unitario') {
            // Aceita vírgula ou ponto no input
            itemAtualizado.preco_unitario = valor;
        } else if (campo === 'desconto') {
            itemAtualizado.desconto = valor;
        } else {
            itemAtualizado[campo] = valor;
        }

        // 3. FÓRMULA MÁGICA: (Unitario * Qtd) - Desconto = Final
        // Convertemos para float apenas para o cálculo matemático
        const unitario = parseFloat(String(itemAtualizado.preco_unitario).replace(',', '.') || 0);
        const qtd = parseFloat(itemAtualizado.qtd_numerica || 1);
        const desconto = parseFloat(String(itemAtualizado.desconto).replace(',', '.') || 0);

        const novoTotal = (unitario * qtd) - desconto;

        // 4. Atualiza o Preço Final (Visual e Lógico)
        itemAtualizado.preco_final = parseFloat(novoTotal.toFixed(2));

        // Mantém compatibilidade com campos antigos
        itemAtualizado.preco = itemAtualizado.preco_final;

        // 5. Devolve ao array
        novosItens[index] = itemAtualizado;

        // 6. Recalcula o Total Geral do Talão
        const totalTalao = novosItens.reduce((acc, i) => acc + (i.preco_final || 0), 0);

        setDadosRevisao({
            ...dadosRevisao,
            itens: novosItens,
            total: parseFloat(totalTalao.toFixed(2))
        });
    };

    const removerItem = (index) => {
        const novosItens = dadosRevisao.itens.filter((_, i) => i !== index);
        const totalTalao = novosItens.reduce((acc, i) => acc + (i.preco_final || 0), 0);
        setDadosRevisao({ ...dadosRevisao, itens: novosItens, total: parseFloat(totalTalao.toFixed(2)) });
    };

    const confirmarGravacao = async () => {
        try {
            // Prepara os dados limpos para o Backend
            // Aqui garantimos que enviamos 'preco_unitario' e 'preco_total' separadamente
            const itensParaBackend = dadosRevisao.itens.map(i => ({
                item: i.item,

                // Qtd Texto (ex: "1 kg") e Numérica (ex: 1.0)
                qtd: i.qtd,

                // PREÇOS: Enviamos tudo explícito
                preco: i.preco_final,           // Total da linha (Legacy)
                preco_total: i.preco_final,     // Total da linha (Novo Padrão)

                // Garante que unitário vai como float correto (troca vírgula por ponto)
                preco_unitario: parseFloat(String(i.preco_unitario).replace(',', '.') || 0),

                // Categorias e Metadados
                categoria_financeira: i.categoria_financeira,
                categoria_nutricional: i.categoria_nutricional || 'Indefinido',
                e_essencial: i.e_essencial || false,
                tem_gluten: i.tem_gluten || false,
                nivel_processamento: i.nivel_processamento || 'Desconhecido'
            }));

            const pacoteFinal = {
                loja: dadosRevisao.loja,
                data: dadosRevisao.data,
                total: dadosRevisao.total,
                itens: itensParaBackend
            };

            await axios.post(`${API_URL}/financas/confirmar-talao`, {
                usuario_id: usuario.id,
                dados_finais: pacoteFinal
            });

            alert("Talão guardado com sucesso! 🎉");
            setModoRevisao(false);
            setDadosRevisao(null);
            carregarDados(); // Atualiza gráfico e dashboard
        } catch(err) {
            console.error(err);
            alert("Erro ao gravar. Verifica a consola.");
        }
    };

    // --- FUNÇÕES PARA CONTAS FIXAS ---
    const handleSalvarFixa = async () => {
        if (!novaFixa.descricao || !novaFixa.valor) {
            alert("A descrição e o valor são obrigatórios.");
            return;
        }
        try {
            if (editandoFixaId) {
                // Editar (PUT)
                await axios.put(`${API_URL}/financas/fixas`, {
                    id: editandoFixaId,
                    ...novaFixa,
                    usuario_id: usuario.id
                });
            } else {
                // Criar (POST)
                await axios.post(`${API_URL}/financas/fixas`, {
                    ...novaFixa,
                    usuario_id: usuario.id
                });
            }
            // Limpa o formulário e recarrega
            setNovaFixa({ descricao: '', valor: '', dia: 1, meses: '' });
            setEditandoFixaId(null);
            carregarDados();
        } catch (err) {
            console.error(err);
            alert("Erro ao guardar despesa fixa.");
        }
    };

    const iniciarEdicaoFixa = (f) => {
        setEditandoFixaId(f.id);
        setNovaFixa({
            descricao: f.descricao,
            valor: f.valor,
            dia: f.dia || 1,
            meses: f.meses || ''
        });
    };

    const cancelarEdicao = () => {
        setEditandoFixaId(null);
        setNovaFixa({ descricao: '', valor: '', dia: 1, meses: '' });
    };

    // --- RENDERIZAR O MODAL DE REVISÃO ---
    if (modoRevisao && dadosRevisao) {
        return (
            <div className="animate-fade-in" style={{background:'white', padding:'20px', borderRadius:'10px', boxShadow:'0 4px 20px rgba(0,0,0,0.1)'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>
                    <h2 style={{margin:0, color:'#1e3a8a'}}>📝 Confirmar Dados</h2>
                    <button onClick={() => setModoRevisao(false)} style={{background:'#cbd5e1', border:'none', padding:'8px 15px', borderRadius:'6px', cursor:'pointer'}}>Cancelar</button>
                </div>

                <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
                    {/* ESQUERDA: IMAGEM DO TALÃO */}
                    <div style={{flex:1, minWidth:'350px', height:'75vh', border:'2px solid #e2e8f0', borderRadius:'8px', overflow:'hidden', background:'#f8fafc'}}>
                        {imagemTalao && imagemTalao.endsWith('.pdf') ? (
                            <iframe src={imagemTalao} width="100%" height="100%" style={{border:'none'}} title="PDF Viewer"></iframe>
                        ) : (
                            <img src={imagemTalao} alt="Talão" style={{width:'100%', height:'100%', objectFit:'contain'}} />
                        )}
                    </div>

                    {/* DIREITA: TABELA DE EDIÇÃO */}
                    <div style={{flex:1.5, minWidth:'450px', display:'flex', flexDirection:'column'}}>
                        <div style={{background:'#eff6ff', padding:'15px', borderRadius:'8px', marginBottom:'15px', display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #bfdbfe'}}>
                            <div><strong>{dadosRevisao.loja}</strong></div>
                            <div style={{fontSize:'1.4rem', color:'#2563eb', fontWeight:'bold'}}>Total: {dadosRevisao.total.toFixed(2)}€</div>
                        </div>

                        <div style={{flex:1, overflowY:'auto', border:'1px solid #e2e8f0', borderRadius:'6px', marginBottom:'15px'}}>
                            <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.85rem'}}>
                                <thead style={{background:'#f8fafc', position:'sticky', top:0, zIndex:10}}>
                                    <tr style={{textAlign:'left', color:'#64748b'}}>
                                        <th style={{padding:'10px', width:'60px'}}>Qtd</th>
                                        <th style={{padding:'10px'}}>Produto</th>
                                        <th style={{padding:'10px', width:'80px'}}>Unit.(€)</th>
                                        <th style={{padding:'10px', width:'80px', color:'#dc2626'}}>Desc.(€)</th>
                                        <th style={{padding:'10px', width:'80px'}}>Total(€)</th>
                                        <th style={{padding:'10px'}}>Categoria</th>
                                        <th style={{padding:'10px', width:'30px'}}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dadosRevisao.itens.map((item, idx) => (
                                        <tr key={idx} style={{borderBottom:'1px solid #f1f5f9', background: item.desconto > 0 ? '#f0fdf4' : 'white'}}>
                                            {/* QTD */}
                                            <td style={{padding:'5px'}}>
                                                <input
                                                    value={item.qtd}
                                                    onChange={(e) => atualizarItem(idx, 'qtd', e.target.value)}
                                                    style={{width:'100%', padding:'5px', border:'1px solid #ddd', borderRadius:'4px', textAlign:'center'}}
                                                />
                                            </td>
                                            {/* NOME */}
                                            <td style={{padding:'5px'}}>
                                                <input
                                                    value={item.item}
                                                    onChange={(e) => atualizarItem(idx, 'item', e.target.value)}
                                                    style={{width:'100%', padding:'5px', border:'1px solid #ddd', borderRadius:'4px'}}
                                                />
                                            </td>
                                            {/* PREÇO UNITÁRIO */}
                                            <td style={{padding:'5px'}}>
                                                <input
                                                    type="text" // Text para permitir vírgulas durante a escrita
                                                    value={item.preco_unitario}
                                                    onChange={(e) => atualizarItem(idx, 'preco_unitario', e.target.value)}
                                                    style={{width:'100%', padding:'5px', border:'1px solid #ddd', borderRadius:'4px', textAlign:'right'}}
                                                />
                                            </td>
                                            {/* DESCONTO */}
                                            <td style={{padding:'5px'}}>
                                                <input
                                                    type="text"
                                                    value={item.desconto}
                                                    onChange={(e) => atualizarItem(idx, 'desconto', e.target.value)}
                                                    style={{width:'100%', padding:'5px', border:'1px solid #fca5a5', borderRadius:'4px', color:'#dc2626', fontWeight:'bold', textAlign:'right'}}
                                                />
                                            </td>
                                            {/* TOTAL (Calculado - Read Only) */}
                                            <td style={{padding:'5px'}}>
                                                <div style={{padding:'5px', fontWeight:'bold', color:'#0f172a', background:'#e2e8f0', borderRadius:'4px', textAlign:'right'}}>
                                                    {item.preco_final.toFixed(2)}
                                                </div>
                                            </td>
                                            {/* CATEGORIA */}
                                            <td style={{padding:'5px'}}>
                                                <select value={item.categoria_financeira} onChange={(e) => atualizarItem(idx, 'categoria_financeira', e.target.value)} style={{width:'100%', padding:'5px', borderRadius:'4px', border:'1px solid #ddd'}}>
                                                    <option value="Mercearia">Mercearia</option>
                                                    <option value="Talho">Talho</option>
                                                    <option value="Peixaria">Peixaria</option>
                                                    <option value="Laticínios">Laticínios</option>
                                                    <option value="Fruta">Fruta</option>
                                                    <option value="Vegetais">Vegetais</option>
                                                    <option value="Bebidas">Bebidas</option>
                                                    <option value="Higiene">Higiene</option>
                                                    <option value="Casa">Casa</option>
                                                    <option value="Congelados">Congelados</option>
                                                    <option value="Supérfluos">Supérfluos</option>
                                                </select>
                                            </td>
                                            <td style={{padding:'5px', textAlign:'center'}}>
                                                <button onClick={() => removerItem(idx)} style={{color:'#ef4444', background:'none', border:'none', cursor:'pointer'}}>✕</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <button className="btn-primary" onClick={confirmarGravacao} style={{padding:'15px', fontSize:'1.1rem', background:'#16a34a', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', width:'100%'}}>
                            ✅ Confirmar e Guardar
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // --- RENDER: DASHBOARD NORMAL ---
    return (
        <div className="dashboard-grid animate-fade-in" style={{display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap:'30px'}}>

            {/* DESPESAS FIXAS - AGORA EM CIMA E A OCUPAR A LINHA INTEIRA */}
            <div className="card" style={{ gridColumn: '1 / -1' }}>
                <h3 style={{marginTop:0, color:'#1e3a8a'}}>📅 Contas Fixas</h3>

                {/* FORMULÁRIO ADICIONAR / EDITAR COM LABELS */}
                <div style={{marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                    <div style={{display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap'}}>

                        {/* INPUT: DESCRIÇÃO */}
                        <div style={{flex: 1, minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '5px'}}>
                            <label style={{fontSize: '0.85rem', color: '#475569', fontWeight: 'bold'}}>Descrição</label>
                            <input
                                type="text"
                                placeholder="Ex: Eletricidade"
                                value={novaFixa.descricao}
                                onChange={(e) => setNovaFixa({...novaFixa, descricao: e.target.value})}
                                style={{padding: '8px', borderRadius:'4px', border:'1px solid #cbd5e1'}}
                            />
                        </div>

                        {/* INPUT: VALOR */}
                        <div style={{width: '100px', display: 'flex', flexDirection: 'column', gap: '5px'}}>
                            <label style={{fontSize: '0.85rem', color: '#475569', fontWeight: 'bold'}}>Valor (€)</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={novaFixa.valor}
                                onChange={(e) => setNovaFixa({...novaFixa, valor: e.target.value})}
                                style={{padding: '8px', borderRadius:'4px', border:'1px solid #cbd5e1'}}
                            />
                        </div>

                        {/* INPUT: DIA */}
                        <div style={{width: '80px', display: 'flex', flexDirection: 'column', gap: '5px'}}>
                            <label style={{fontSize: '0.85rem', color: '#475569', fontWeight: 'bold'}}>Dia</label>
                            <input
                                type="number"
                                placeholder="Ex: 1"
                                title="Dia do mês"
                                value={novaFixa.dia}
                                onChange={(e) => setNovaFixa({...novaFixa, dia: e.target.value})}
                                style={{padding: '8px', borderRadius:'4px', border:'1px solid #cbd5e1'}}
                            />
                        </div>

                        {/* INPUT: MESES */}
                        <div style={{flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '5px'}}>
                            <label style={{fontSize: '0.85rem', color: '#475569', fontWeight: 'bold'}}>Meses Específicos</label>
                            <input
                                type="text"
                                placeholder="Ex: 1,7 (Vazio = todos os meses)"
                                value={novaFixa.meses}
                                onChange={(e) => setNovaFixa({...novaFixa, meses: e.target.value})}
                                style={{padding: '8px', borderRadius:'4px', border:'1px solid #cbd5e1'}}
                            />
                        </div>
                    </div>

                    {/* BOTÕES DE AÇÃO DO FORMULÁRIO */}
                    <div style={{display: 'flex', gap: '10px'}}>
                        <button onClick={handleSalvarFixa} style={{flex: 1, padding: '10px', background: editandoFixaId ? '#eab308' : '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight:'bold', transition: 'background 0.2s'}}>
                            {editandoFixaId ? '💾 Atualizar Despesa' : '➕ Adicionar Nova Despesa'}
                        </button>
                        {editandoFixaId && (
                            <button onClick={cancelarEdicao} style={{padding: '10px 20px', background: '#94a3b8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight:'bold', transition: 'background 0.2s'}}>
                                Cancelar
                            </button>
                        )}
                    </div>
                </div>

                {/* LISTA DE CONTAS */}
                <div style={{marginBottom:'15px', maxHeight:'250px', overflowY:'auto'}}>
                    {despesasFixas.map(f => (
                        <div key={f.id} style={{display:'flex', justifyContent:'space-between', padding:'10px 8px', borderBottom:'1px solid #f1f5f9', alignItems:'center'}}>
                            <label style={{flex:1, cursor:'pointer', display:'flex', alignItems:'center'}}>
                                <input type="checkbox" checked={!!fixasPagas[f.id]} onChange={() => toggleFixaPaga(f)} style={{marginRight:'12px', transform: 'scale(1.2)'}} />
                                <span style={{textDecoration: fixasPagas[f.id]?'line-through':'none', color: fixasPagas[f.id]?'#94a3b8':'#334155', fontWeight: fixasPagas[f.id]?'normal':'500'}}>{f.descricao}</span>
                            </label>
                            <strong style={{color: fixasPagas[f.id]?'#94a3b8':'#0f172a', marginRight: '20px', minWidth: '60px', textAlign: 'right'}}>{f.valor}€</strong>

                            {/* BOTÕES DE AÇÃO NA LISTA */}
                            <div style={{display:'flex', gap:'12px'}}>
                                <button onClick={()=>iniciarEdicaoFixa(f)} style={{border:'none', background:'none', cursor:'pointer', fontSize:'1.1rem'}} title="Editar">✏️</button>
                                <button onClick={()=>removerFixa(f.id)} style={{border:'none', background:'none', color:'#ef4444', cursor:'pointer', fontSize:'1.1rem'}} title="Remover">✕</button>
                            </div>
                        </div>
                    ))}
                </div>
                {despesasFixas.length === 0 && <p style={{color:'#94a3b8', fontSize:'0.9rem', textAlign:'center', padding: '10px'}}>Nenhuma conta fixa.</p>}
            </div>

            {/* WIDGET CASA */}
            <div style={{marginBottom: '30px'}}>
                <WidgetCasa usuarioId={usuario.id} API_URL={API_URL} />
            </div>

            {/* SCANNER */}
            <div className="card" style={{border: '2px solid #2563eb', background:'#f8fafc', marginBottom: '30px'}}>
                <h3 style={{color:'#1e3a8a', marginTop:0}}>🧾 Scanner Inteligente</h3>
                <p style={{color:'#64748b', fontSize:'0.9rem'}}>Carrega uma foto ou PDF do talão (Lidl, Continente, etc).</p>

                {lendoTalao ? (
                    <div style={{textAlign:'center', padding:'40px', color:'#2563eb'}}>
                        <div style={{fontSize:'2rem', marginBottom:'10px'}}>🤖</div>
                        <div style={{fontWeight:'bold'}}>A analisar recibo...</div>
                        <div style={{fontSize:'0.8rem', color:'#64748b'}}>Isto pode demorar alguns segundos.</div>
                    </div>
                ) : (
                    <label style={{
                        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                        padding:'40px', border:'2px dashed #93c5fd', borderRadius:'12px',
                        cursor:'pointer', background:'white', transition:'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = '#93c5fd'}
                    >
                        <span style={{fontSize:'2rem', marginBottom:'10px'}}>📷</span>
                        <strong style={{color:'#1e3a8a'}}>Carregar Talão</strong>
                        <span style={{fontSize:'0.8rem', color:'#94a3b8', marginTop:'5px'}}>PDF ou Imagem</span>
                        <input type="file" onChange={handleUpload} style={{display:'none'}} accept=".pdf,image/*" />
                    </label>
                )}
                {erroUpload && <div style={{marginTop:'15px', padding:'10px', background:'#fee2e2', color:'#b91c1c', borderRadius:'6px', fontSize:'0.9rem', textAlign:'center'}}>⚠️ {erroUpload}</div>}
            </div>

        </div>
    )
}