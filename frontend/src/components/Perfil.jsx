import React, { useState, useEffect } from 'react'
import axios from 'axios'

export default function Perfil({ usuario, aoSair, aoAtualizarDados, API_URL }) {

  // --- MODO DE EDIÇÃO GLOBAL ---
  const [editando, setEditando] = useState(false)
  const [loading, setLoading] = useState(false)

  // Estado que guarda os dados enquanto editamos (antes de gravar)
  const [dadosForm, setDadosForm] = useState({
    altura: 1.75,
    peso: 70, // Adicionei peso também, já que agora a API suporta!
    idade: 30,
    objetivo: 'manter',
    atividade: 'sedentario',
    restricoes: "",
    orcamento_semanal: 50
  })

  // --- ESTADO PARA CONTAS BANCÁRIAS (Separado, pois adiciona-se logo) ---
  const [contas, setContas] = useState([])
  const [novaConta, setNovaConta] = useState({ nome: '', saldo: '' })

  // Carregar dados iniciais
  useEffect(() => {
    if(usuario.id) {
        carregarContas()
        // Preenche o formulário com os dados atuais do utilizador
        setDadosForm({
            nome: usuario.nome || 1.75,
            altura: usuario.altura || 1.75,
            peso: usuario.peso || 70,
            idade: usuario.idade || 30,
            objetivo: usuario.objetivo || 'manter',
            atividade: usuario.atividade || 'sedentario',
            restricoes: usuario.restricoes || "",
            orcamento_semanal: usuario.orcamento_semanal || 50
        })
    }
  }, [usuario])

  const carregarContas = async () => {
    try {
      const res = await axios.get(`${API_URL}/financas/contas?usuario_id=${usuario.id}`)
      if (res.data && Array.isArray(res.data)) setContas(res.data)
    } catch (e) { console.error("Erro contas", e) }
  }

  // --- FUNÇÃO DE GRAVAR TUDO (GLOBAL) ---
  const guardarAlteracoes = async () => {
    setLoading(true)
    try {
      // Envia tudo para a rota inteligente "/perfil"
      const res = await axios.put(`${API_URL}/usuarios/perfil`, {
        usuario_id: usuario.id,
        ...dadosForm // Espalha altura, peso, restricoes, orcamento, etc.
      })

      // Se a API devolver uma nova meta (porque mudámos peso/objetivo), atualizamos
      const novosDadosUsuario = { ...usuario, ...dadosForm }
      if (res.data.nova_meta) {
          novosDadosUsuario.meta_calorias = res.data.nova_meta
          alert(`✅ Perfil atualizado!\nNova Meta Calórica: ${res.data.nova_meta} kcal`)
      } else {
          alert("✅ Perfil atualizado com sucesso!")
      }

      // Atualiza o contexto da App
      if (aoAtualizarDados) aoAtualizarDados(novosDadosUsuario)

      setEditando(false)

    } catch (e) {
      alert("Erro ao gravar perfil. Tenta novamente.")
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const cancelarEdicao = () => {
      // Reverte para os dados originais
      setDadosForm({
        altura: usuario.altura || 1.75,
        peso: usuario.peso || 70,
        idade: usuario.idade || 30,
        objetivo: usuario.objetivo || 'manter',
        atividade: usuario.atividade || 'sedentario',
        restricoes: usuario.restricoes || "",
        orcamento_semanal: usuario.orcamento_semanal || 50
      })
      setEditando(false)
  }

  // Adicionar Conta (Esta mantém-se imediata, pois é uma ação diferente)
  const adicionarConta = async () => {
    if(!novaConta.nome) return;
    try {
      await axios.post(`${API_URL}/financas/contas`, {
        usuario_id: usuario.id, nome: novaConta.nome, saldo_inicial: parseFloat(novaConta.saldo) || 0
      })
      setNovaConta({ nome: '', saldo: '' })
      carregarContas()
    } catch(e) { alert("Erro ao criar conta.") }
  }

  return (
    <div className="animate-fade-in" style={{margin:'40px auto', maxWidth:'1000px'}}>

      {/* 1. CABEÇALHO DO PERFIL */}
      <div className="card" style={{textAlign:'center', marginBottom:'20px', padding:'30px', position:'relative'}}>
        <div style={{width:'80px', height:'80px', background:'#e0e7ff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem', margin:'0 auto 15px auto', color: '#4f46e5'}}>👤</div>
        <h2 style={{margin:0, fontSize:'1.8rem', color:'#1f2937'}}>{usuario.nome}</h2>

        {/* Botão de Editar Global no Topo */}
        <div style={{marginTop:'15px'}}>
            {!editando ? (
                <button onClick={() => setEditando(true)} className="btn-primary" style={{background:'#4f46e5', padding:'8px 20px'}}>
                   ✏️ Editar Perfil
                </button>
            ) : (
                <div style={{display:'flex', gap:'10px', justifyContent:'center'}}>
                    <button onClick={cancelarEdicao} style={{...btnCancelStyle, padding:'8px 20px', fontSize:'1rem'}}>Cancelar</button>
                    <button onClick={guardarAlteracoes} className="btn-primary" style={{background:'#10b981', padding:'8px 20px'}}>
                        {loading ? 'A gravar...' : '💾 Guardar Alterações'}
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* 2. GRID DIVIDIDO */}
      <div style={{display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap:'20px'}}>

        {/* --- COLUNA ESQUERDA: SAÚDE 🥗 --- */}
        <div className="card" style={{height:'fit-content'}}>
          <h3 style={{fontSize:'1.1rem', borderBottom:'2px solid #ecfdf5', paddingBottom:'10px', marginBottom:'20px', color:'#059669', display:'flex', alignItems:'center', gap:'8px'}}>
            🥗 Saúde & Nutrição
          </h3>

          <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>

             {/* Meta (Não editável diretamente, é calculada) */}
             <div style={itemBoxStyle}>
               <span style={{color:'#6b7280', fontSize:'0.9rem'}}>Meta Diária (Calculada)</span>
               <div style={{color:'#10b981', fontSize:'1.4rem', fontWeight:'bold'}}>{usuario.meta_calorias} kcal</div>
             </div>

             {/* DADOS FÍSICOS (Agrupados) */}
             <div style={{...itemBoxStyle, display:'flex', flexDirection:'column', gap:'15px'}}>
                 <h4 style={{margin:0, color:'#374151', fontSize:'1rem'}}>Dados Físicos</h4>

                 <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                     {/* Altura */}
                     <div>
                         <label style={labelStyle}>Altura (m)</label>
                         {editando ? (
                             <input type="number" step="0.01" value={dadosForm.altura} onChange={e=>setDadosForm({...dadosForm, altura: e.target.value})} style={inputStyle} />
                         ) : (
                             <div style={valorStyle}>{dadosForm.altura} m</div>
                         )}
                     </div>
                     {/* Peso */}
                     <div>
                         <label style={labelStyle}>Peso (kg)</label>
                         {editando ? (
                             <input type="number" step="0.1" value={dadosForm.peso} onChange={e=>setDadosForm({...dadosForm, peso: e.target.value})} style={inputStyle} />
                         ) : (
                             <div style={valorStyle}>{dadosForm.peso} kg</div>
                         )}
                     </div>
                     {/* Idade */}
                     <div>
                         <label style={labelStyle}>Idade</label>
                         {editando ? (
                             <input type="number" value={dadosForm.idade} onChange={e=>setDadosForm({...dadosForm, idade: e.target.value})} style={inputStyle} />
                         ) : (
                             <div style={valorStyle}>{dadosForm.idade} anos</div>
                         )}
                     </div>
                     {/* Atividade */}
                     <div>
                         <label style={labelStyle}>Atividade</label>
                         {editando ? (
                             <select value={dadosForm.atividade} onChange={e=>setDadosForm({...dadosForm, atividade: e.target.value})} style={inputStyle}>
                                 <option value="sedentario">Sedentário</option>
                                 <option value="ligeiro">Ligeiro</option>
                                 <option value="moderado">Moderado</option>
                                 <option value="muito_ativo">Muito Ativo</option>
                             </select>
                         ) : (
                             <div style={valorStyle}>{dadosForm.atividade}</div>
                         )}
                     </div>
                 </div>

                 {/* Objetivo */}
                 <div>
                     <label style={labelStyle}>Objetivo Atual</label>
                     {editando ? (
                         <select value={dadosForm.objetivo} onChange={e=>setDadosForm({...dadosForm, objetivo: e.target.value})} style={inputStyle}>
                             <option value="perder">Perder Peso</option>
                             <option value="manter">Manter Peso</option>
                             <option value="ganhar">Ganhar Massa</option>
                         </select>
                     ) : (
                         <div style={{...valorStyle, color:'#4f46e5', fontWeight:'bold'}}>{dadosForm.objetivo.toUpperCase()}</div>
                     )}
                 </div>
             </div>

             {/* Restrições */}
             <div style={itemBoxStyle}>
               <label style={labelStyle}>Restrições Alimentares</label>
               {editando ? (
                 <textarea value={dadosForm.restricoes} onChange={e=>setDadosForm({...dadosForm, restricoes: e.target.value})} style={{...inputStyle, height:'80px'}} />
               ) : (
                 <div style={{color: dadosForm.restricoes ? '#d97706' : '#9ca3af', fontSize:'0.95rem'}}>
                   {dadosForm.restricoes || "Nenhuma restrição definida."}
                 </div>
               )}
             </div>
          </div>
        </div>

        {/* --- COLUNA DIREITA: FINANÇAS 💰 --- */}
        <div className="card" style={{height:'fit-content'}}>
          <h3 style={{fontSize:'1.1rem', borderBottom:'2px solid #eff6ff', paddingBottom:'10px', marginBottom:'20px', color:'#2563eb', display:'flex', alignItems:'center', gap:'8px'}}>
            💰 Finanças da Casa
          </h3>

          <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
             {/* Orçamento */}
             <div style={itemBoxStyle}>
               <label style={labelStyle}>Orçamento Semanal (€)</label>
               {editando ? (
                  <input type="number" value={dadosForm.orcamento_semanal} onChange={e=>setDadosForm({...dadosForm, orcamento_semanal: e.target.value})} style={inputStyle} />
               ) : (
                  <strong style={{fontSize:'1.5rem', color:'#2563eb'}}>{dadosForm.orcamento_semanal} €</strong>
               )}
             </div>

             {/* Contas Bancárias (Mantido igual - gere-se à parte) */}
             <div>
               <span style={{color:'#374151', fontWeight:'600', display:'block', marginBottom:'10px'}}>Contas Bancárias</span>
               <ul style={{listStyle:'none', padding:0, margin:'0 0 15px 0'}}>
                 {Array.isArray(contas) && contas.length > 0 ? (
                     contas.map(c => (
                         <li key={c.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px', background:'#f8fafc', marginBottom:'8px', borderRadius:'8px', border:'1px solid #e2e8f0'}}>
                             <span style={{display:'flex', alignItems:'center', gap:'8px'}}>🏦 {c.nome}</span>
                             <span style={{fontWeight:'bold', color: (c.saldo_atual || 0) >= 0 ? '#374151' : '#ef4444'}}>
                                 {parseFloat(c.saldo_atual || 0).toFixed(2)}€
                             </span>
                         </li>
                     ))
                 ) : (
                     <p style={{color:'#9ca3af', fontStyle:'italic', fontSize:'0.9rem'}}>Nenhuma conta encontrada.</p>
                 )}
               </ul>

               {/* Só mostra adicionar conta se NÃO estivermos a editar o perfil principal, para não confundir */}
               {!editando && (
                   <div style={{background:'#f0f9ff', padding:'15px', borderRadius:'8px', border:'1px dashed #bae6fd'}}>
                     <p style={{margin:'0 0 10px 0', fontSize:'0.85rem', color:'#0284c7', fontWeight:'bold'}}>Adicionar Nova Conta:</p>
                     <div style={{display:'flex', gap:'10px'}}>
                       <input placeholder="Nome" value={novaConta.nome} onChange={e=>setNovaConta({...novaConta, nome:e.target.value})} style={{...inputStyle, flex: 2}} />
                       <input type="number" placeholder="€" value={novaConta.saldo} onChange={e=>setNovaConta({...novaConta, saldo:e.target.value})} style={{...inputStyle, width:'70px'}} />
                       <button onClick={adicionarConta} className="btn-primary" style={{padding:'0', width:'42px', height:'42px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem'}}>+</button>
                     </div>
                   </div>
               )}
             </div>
          </div>
        </div>

      </div>

      {/* Botão Sair */}
      <div style={{textAlign:'center', marginTop:'30px'}}>
        <button onClick={aoSair} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontWeight:'bold', display:'inline-flex', alignItems:'center', gap:'5px'}}>
          🚪 Terminar Sessão
        </button>
      </div>

    </div>
  )
}

// Estilos Auxiliares
const inputStyle = { padding:'8px', borderRadius:'6px', border:'1px solid #d1d5db', width:'100%', boxSizing:'border-box', fontSize:'0.95rem' }
const labelStyle = { display:'block', fontSize:'0.8rem', color:'#6b7280', marginBottom:'4px' }
const valorStyle = { fontSize:'1rem', color:'#1f2937', fontWeight:'500' }
const btnCancelStyle = { background:'white', border:'1px solid #ccc', borderRadius:'6px', cursor:'pointer', color:'#666' }
const itemBoxStyle = { background:'white', border:'1px solid #f3f4f6', padding:'15px', borderRadius:'8px' }