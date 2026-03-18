import React, { useState } from 'react'

export default function NovoPerfil({ aoSalvar, aoCancelar }) {
  // Estado dos dados do perfil
  const [formData, setFormData] = useState({
    nome: '',
    peso: '',
    altura: '',
    idade: '',
    genero: 'masculino',
    atividade: 'sedentario',
    objetivo: 'manter',
    restricoes: '',
    orcamento_semanal: 50,
    // --- NOVOS CAMPOS FINANCEIROS ---
    salario_base: 0,
    subsidio_alimentacao: 0,
    seguro_capitalizacao: 0
  })

  // Estado para gerir a lista de contas a adicionar
  const [contas, setContas] = useState([
    { nome: 'Carteira (Dinheiro)', saldo: 0 }
  ])
  const [novaContaNome, setNovaContaNome] = useState('')
  const [novaContaSaldo, setNovaContaSaldo] = useState('')

  // Adicionar conta à lista visual
  const adicionarConta = () => {
    if (!novaContaNome) return;
    const saldo = novaContaSaldo ? Number(novaContaSaldo) : 0;
    setContas([...contas, { nome: novaContaNome, saldo: saldo }])
    setNovaContaNome('')
    setNovaContaSaldo('')
  }

  // Remover conta da lista visual
  const removerConta = (index) => {
    const novas = contas.filter((_, i) => i !== index)
    setContas(novas)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Envia tudo junto: Dados Pessoais + Financeiros + Lista de Contas
    aoSalvar({
      ...formData,
      contas_iniciais: contas
    })
  }

  return (
    <div className="app-container">
      <h2>📝 Novo Perfil (Nutrição & Finanças)</h2>
      <div className="card animate-fade-in">
         <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

           {/* --- SECÇÃO 1: DADOS PESSOAIS --- */}
           <div style={{borderBottom:'1px solid #f0f0f0', paddingBottom:'20px'}}>
             <h4 style={{margin:'0 0 15px 0', color:'#4b5563', fontSize: '1.1rem'}}>👤 Dados Pessoais</h4>
             <input placeholder="Nome (Ex: Casa ou Tiago)" required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} style={inputStyle} />

             <div style={{display:'flex', gap:'15px', marginTop:'15px'}}>
               <input type="number" step="0.1" placeholder="Peso (kg)" required value={formData.peso} onChange={e => setFormData({...formData, peso: Number(e.target.value)})} style={{...inputStyle, flex:1}} />
               {/* Mudei o placeholder para Metros para bater certo com o backend */}
               <input type="number" step="0.01" placeholder="Altura (m) ex: 1.75" required value={formData.altura} onChange={e => setFormData({...formData, altura: Number(e.target.value)})} style={{...inputStyle, flex:1}} />
             </div>

             <div style={{display:'flex', gap:'15px', marginTop:'15px'}}>
                <input type="number" placeholder="Idade" required value={formData.idade} onChange={e => setFormData({...formData, idade: Number(e.target.value)})} style={{...inputStyle, flex:1}} />
                <select value={formData.genero} onChange={e => setFormData({...formData, genero: e.target.value})} style={{...inputStyle, flex:1}}>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                </select>
             </div>

             <div style={{display:'flex', gap:'15px', marginTop:'15px'}}>
                <select value={formData.atividade} onChange={e => setFormData({...formData, atividade: e.target.value})} style={{...inputStyle, flex:1}}>
                    <option value="sedentario">Sedentário</option>
                    <option value="ligeiro">Ligeiro</option>
                    <option value="moderado">Moderado</option>
                    <option value="muito_ativo">Muito Ativo</option>
                </select>
                <select value={formData.objetivo} onChange={e => setFormData({...formData, objetivo: e.target.value})} style={{...inputStyle, flex:1}}>
                    <option value="manter">Manter Peso</option>
                    <option value="perder">Perder Peso</option>
                    <option value="ganhar">Ganhar Massa</option>
                </select>
             </div>

             <input
                placeholder="Restrições (Ex: Vegan, Sem Glúten)"
                value={formData.restricoes}
                onChange={e => setFormData({...formData, restricoes: e.target.value})}
                style={{...inputStyle, marginTop:'15px'}}
             />
           </div>

           {/* --- SECÇÃO 2: FINANÇAS --- */}
           <div>
             <h4 style={{margin:'0 0 15px 0', color:'#4b5563', fontSize: '1.1rem'}}>💰 Finanças da Casa</h4>

             {/* NOVO: RENDIMENTOS MENSAIS */}
             <div style={{background:'#f0fdf4', padding:'15px', borderRadius:'8px', border:'1px solid #bbf7d0', marginBottom:'20px'}}>
                <p style={{margin:'0 0 10px 0', fontSize:'0.9rem', color:'#166534', fontWeight:'bold'}}>Rendimentos Fixos (Opcional):</p>
                <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
                    <div style={{flex:1, minWidth:'120px'}}>
                        <label style={labelStyle}>Salário Base</label>
                        <input type="number" step="0.01" value={formData.salario_base} onChange={e => setFormData({...formData, salario_base: Number(e.target.value)})} style={inputStyle} />
                    </div>
                    <div style={{flex:1, minWidth:'120px'}}>
                        <label style={labelStyle}>Sub. Alimentação</label>
                        <input type="number" step="0.01" value={formData.subsidio_alimentacao} onChange={e => setFormData({...formData, subsidio_alimentacao: Number(e.target.value)})} style={inputStyle} />
                    </div>
                    <div style={{flex:1, minWidth:'120px'}}>
                        <label style={labelStyle}>Seguro Capital.</label>
                        <input type="number" step="0.01" value={formData.seguro_capitalizacao} onChange={e => setFormData({...formData, seguro_capitalizacao: Number(e.target.value)})} style={inputStyle} />
                    </div>
                </div>
             </div>

             {/* ORÇAMENTO SEMANAL */}
             <div style={{marginBottom:'20px', display: 'flex', alignItems: 'center'}}>
               <label style={{fontSize:'1rem', marginRight: '10px', color: '#374151'}}>Orçamento Semanal (€):</label>
               <input
                 type="number"
                 value={formData.orcamento_semanal}
                 onChange={e => setFormData({...formData, orcamento_semanal: e.target.value})}
                 style={{...inputStyle, width:'120px', fontSize: '1.1rem'}}
               />
             </div>

             {/* CONTAS BANCÁRIAS */}
             <div style={{background:'#f9fafb', padding:'20px', borderRadius:'12px', border:'1px solid #e5e7eb'}}>
               <p style={{marginTop:0, fontSize:'1rem', fontWeight:'600', color: '#374151', marginBottom: '15px'}}>Contas Bancárias:</p>

               <div style={{display:'flex', gap:'10px', marginBottom:'20px', alignItems: 'flex-end'}}>
                 <div style={{flex: 2}}>
                   <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#6b7280'}}>Nome da Conta</label>
                   <input
                      placeholder="Ex: Santander Tiago"
                      value={novaContaNome}
                      onChange={e => setNovaContaNome(e.target.value)}
                      style={{...inputStyle}}
                   />
                 </div>
                 <div style={{flex: 1}}>
                   <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#6b7280'}}>Saldo Inicial (€)</label>
                   <input
                      type="number" placeholder="0.00"
                      value={novaContaSaldo}
                      onChange={e => setNovaContaSaldo(e.target.value)}
                      style={{...inputStyle}}
                   />
                 </div>
                 <button
                  type="button"
                  onClick={adicionarConta}
                  className="btn-primary"
                  style={{padding:'10px 20px', fontSize:'1.2rem', height: '42px', width: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                 >
                   +
                 </button>
               </div>

               {/* Lista de contas adicionadas */}
               {contas.length > 0 && (
                 <ul style={{listStyle:'none', padding:0, margin:0}}>
                     {contas.map((c, i) => (
                       <li key={i} style={{display:'flex', justifyContent:'space-between', padding:'12px', background:'white', marginBottom:'8px', borderRadius:'8px', border:'1px solid #e5e7eb', alignItems:'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'}}>
                         <span style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#374151'}}>🏦 <strong>{c.nome}</strong> (Saldo: {c.saldo.toFixed(2)}€)</span>
                         <button type="button" onClick={() => removerConta(i)} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer', padding: '5px', fontSize: '1.1rem'}}>✕</button>
                       </li>
                     ))}
                 </ul>
               )}
             </div>
           </div>

           <div style={{display:'flex', gap:'15px', marginTop:'20px'}}>
             <button type="button" onClick={aoCancelar} className="btn-primary" style={{background:'#9ca3af', flex:1, padding: '12px'}}>Cancelar</button>
             <button type="submit" className="btn-primary" style={{flex:1, padding: '12px'}}>Criar Perfil Completo</button>
           </div>
         </form>
      </div>
    </div>
  )
}

const inputStyle = { padding:'10px 12px', border:'1px solid #d1d5db', borderRadius:'8px', width:'100%', boxSizing:'border-box', fontSize: '1rem' }
const labelStyle = { display:'block', marginBottom:'4px', fontSize:'0.8rem', color:'#6b7280'}