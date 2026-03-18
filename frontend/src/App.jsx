import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

// COMPONENTES
// Certifica-te que a pasta 'components' está dentro de 'src'
import Login from './components/Login'
import EmentaSemanal from './components/EmentaSemanal'
import Historico from './components/Historico'
import ListaCompras from './components/ListaCompras'
import Hidratacao from './components/Hidratacao'
import ReceitaModal from './components/ReceitaModal'
import Perfil from './components/Perfil'
import NovoPerfil from './components/NovoPerfil'
import Financas from './components/Financas'
import FinancasDashboard from './components/FinancasDashboard'
import Despensa from './components/Despensa'
import ListaComprasTab from './components/ListaComprasTab'
import TabSaude from './components/TabSaude'
import TabMinecraft from './components/TabMinecraft'
import Navbar from './components/Navbar'

// URL da API (Ajusta o IP se estiveres a testar no telemóvel)
const API_URL = 'http://127.0.0.1:5000/api'

function App() {
  // --- ESTADOS GERAIS ---
  const [usuarios, setUsuarios] = useState([])
  const [usuarioAtual, setUsuarioAtual] = useState(null)
  const [criandoNovo, setCriandoNovo] = useState(false)
const [coposAgua, setCoposAgua] = useState(0)

  // --- NAVEGAÇÃO ---
  const [tabAtual, setTabAtual] = useState('dashboard') // 'dashboard', 'planner', 'perfil'

  // --- DADOS DASHBOARD ---
  const [imagem, setImagem] = useState(null)
  const [historico, setHistorico] = useState([])
  const [progresso, setProgresso] = useState({ total: 0, meta: 2000, percentagem: 0, restante: 0 })
  const [loading, setLoading] = useState(false)

  // --- DADOS PLANEADOR & COMPRAS ---
  const [ementa, setEmenta] = useState(null)
  const [loadingEmenta, setLoadingEmenta] = useState(false)

  const [listaCompras, setListaCompras] = useState(null)
  const [loadingCompras, setLoadingCompras] = useState(false)
  const [mostrarCompras, setMostrarCompras] = useState(false)

const [receitaAtual, setReceitaAtual] = useState(null)
const [modalReceitaAberto, setModalReceitaAberto] = useState(false)
const [pratoReceita, setPratoReceita] = useState("")


  // --- DADOS FORMULÁRIOS & EDIÇÃO ---
  const [formData, setFormData] = useState({
    nome: '', peso: '', altura: '', idade: '', genero: 'masculino', atividade: 'sedentario', objetivo: 'manter'
  })
  const [editValues, setEditValues] = useState({ nome_prato: '', calorias: 0 })
  const [editingId, setEditingId] = useState(null)

  // --- LIFECYCLE ---
  useEffect(() => { carregarUsuarios() }, [])

  useEffect(() => {
    if (usuarioAtual) atualizarDados()
  }, [usuarioAtual])

  const atualizarDados = () => {
    carregarHistorico();
    carregarProgresso();
    carregarEmentaSalva();
    carregarAgua();
  }

  // --- CHAMADAS API: LEITURA ---
  const carregarUsuarios = async () => { try { const res = await axios.get(`${API_URL}/usuarios`); setUsuarios(res.data) } catch (e) {} }
  const carregarHistorico = async () => { try { const res = await axios.get(`${API_URL}/historico?usuario_id=${usuarioAtual.id}`); setHistorico(res.data) } catch (e) {} }
  const carregarProgresso = async () => { try { const res = await axios.get(`${API_URL}/progresso?usuario_id=${usuarioAtual.id}`); setProgresso(res.data) } catch (e) {} }
  const carregarEmentaSalva = async () => { try { const res = await axios.get(`${API_URL}/planear?usuario_id=${usuarioAtual.id}`); if(res.data) setEmenta(res.data) } catch (e) {} }
const carregarAgua = async () => { try { const res = await axios.get(`${API_URL}/agua?usuario_id=${usuarioAtual.id}`); setCoposAgua(res.data.copos) } catch(e){} }
const atualizarAgua = async (n) => { setCoposAgua(n); await axios.post(`${API_URL}/agua`, {usuario_id: usuarioAtual.id, copos: n}); }
  // --- CHAMADAS API: AÇÕES GERAIS ---
  const criarPerfil = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/usuarios`, formData);
      setCriandoNovo(false);
      carregarUsuarios();
    } catch (e) { alert("Erro ao criar perfil") }
  }


const verReceita = async (prato) => {
  setPratoReceita(prato)
  setReceitaAtual(null) // Limpa anterior
  setModalReceitaAberto(true)
  try {
    const res = await axios.post(`${API_URL}/receita`, { prato })
    setReceitaAtual(res.data)
  } catch (e) { alert("Erro ao carregar receita") }
}
  const handleUpload = async () => {
    if (!imagem) return alert("Escolhe uma foto")
    const fd = new FormData();
    fd.append('imagem', imagem);
    fd.append('usuario_id', usuarioAtual.id)

    setLoading(true)
    try {
      await axios.post(`${API_URL}/analisar`, fd);
      atualizarDados();
      alert("Refeição registada com sucesso!")
    } catch (e) {
      alert("Erro ao analisar imagem")
    } finally {
      setLoading(false)
    }
  }

  // --- CHAMADAS API: PLANEADOR ---
  const gerarEmenta = async () => {
    setLoadingEmenta(true);
    setEmenta(null)
    try {
      const res = await axios.post(`${API_URL}/planear`, { usuario_id: usuarioAtual.id });
      setEmenta(res.data)
    } catch (e) {
      alert("Erro ao gerar ementa. Tenta novamente.")
    } finally {
      setLoadingEmenta(false)
    }
  }

  const abrirListaCompras = async () => {
    setLoadingCompras(true)
    try {
      const res = await axios.get(`${API_URL}/compras?usuario_id=${usuarioAtual.id}`)
      setListaCompras(res.data)
      setMostrarCompras(true)
    } catch (e) {
      alert("Erro ao gerar lista de compras.")
    } finally {
      setLoadingCompras(false)
    }
  }

  // --- CHAMADAS API: EDIÇÃO ---
  const ativarEdicao = (item) => { setEditingId(item.id); setEditValues({ nome_prato: item.nome_prato, calorias: item.calorias }) }
  const cancelarEdicao = () => { setEditingId(null) }
  const guardarEdicao = async (id) => { try { await axios.put(`${API_URL}/refeicao/${id}`, editValues); setEditingId(null); atualizarDados() } catch (e) {} }
  const apagarItem = async (id) => { if (confirm("Apagar?")) try { await axios.delete(`${API_URL}/refeicao/${id}`); atualizarDados() } catch (e) {} }

  const recalcularNutricao = async () => {
    if (!editValues.nome_prato) return;
    const original = editValues.nome_prato;
    setEditValues({ ...editValues, nome_prato: "A calcular..." });
    try {
      const res = await axios.post(`${API_URL}/estimar`, { nome_prato: original });
      setEditValues({ nome_prato: original, calorias: res.data.calorias });
    } catch (e) {
      setEditValues({ ...editValues, nome_prato: original });
    }
  };

const handleCriarPerfil = async (dadosCompletos) => {
    try {
      await axios.post(`${API_URL}/usuarios/`, dadosCompletos)

      alert("Perfil criado com sucesso!")
      setCriandoNovo(false)
      carregarUsuarios()
    } catch (error) {
      console.error(error)
      alert("Erro ao criar perfil.")
    }
  }

  // ===================== RENDERIZAÇÃO =====================

  // 1. ECRÃ DE LOGIN
  if (!usuarioAtual && !criandoNovo) {
    return <Login listaUsuarios={usuarios} aoSelecionar={setUsuarioAtual} aoCriarNovo={() => setCriandoNovo(true)} />
  }

  // 2. ECRÃ DE NOVO PERFIL
  if (criandoNovo) {
    return (
      <NovoPerfil
              aoSalvar={handleCriarPerfil}
              aoCancelar={() => setCriandoNovo(false)}
            />
    )
  }

  // 3. APLICAÇÃO PRINCIPAL (COM NAVBAR)
  return (
    <div>
      {/* Navbar Fixa */}
      <Navbar ativo={tabAtual} aoMudar={setTabAtual} />

      {/* Conteúdo com margem */}
      <div className="app-content animate-fade-in">

        {/* --- DASHBOARD --- */}
        {tabAtual === 'dashboard' && (
          <div className="dashboard-grid">
            <aside className="sidebar">
              {/* Header */}
              <div style={{marginBottom:'20px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                   <h2 style={{margin:0}}>Olá, {usuarioAtual.nome} 👋</h2>
                   <p style={{margin:0, fontSize:'0.8rem', color:'#666'}}>Hoje é um bom dia!</p>
                </div>
                <button onClick={() => setUsuarioAtual(null)} style={{background:'none', color:'#6366f1', border:'none', cursor:'pointer', fontWeight:'bold'}}>Sair</button>
              </div>

              {/* Progresso */}
              <div className="card">
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px', fontSize:'0.9rem'}}>
                  <span style={{fontWeight:'bold'}}>Meta Diária</span>
                  <span style={{fontWeight:'bold', color: '#6366f1'}}>{progresso.restante} kcal restantes</span>
                </div>
                <div className="progress-bg">
                  <div className="progress-fill" style={{ width: `${Math.min(progresso.percentagem, 100)}%`, backgroundColor: progresso.percentagem > 100 ? '#ef4444' : '#10b981' }}></div>
                </div>
                <div style={{textAlign:'center', fontSize:'0.8rem', marginTop:'5px', color:'#666'}}>
                   {progresso.total} / {progresso.meta} kcal consumidas
                </div>
              </div>
                <Hidratacao copos={coposAgua} aoMudar={atualizarAgua} />
              {/* Upload */}
              <div className="card">
                <h3 style={{fontSize:'1rem', marginBottom:'15px'}}>📸 Registar Refeição</h3>
                <div className="upload-area">
                  <input type="file" id="file-input" accept="image/*" capture="environment" onChange={(e) => setImagem(e.target.files[0])} style={{display:'none'}} />
                  <label htmlFor="file-input" style={{cursor:'pointer', display:'block'}}>
                    <div style={{fontSize:'2.5rem', marginBottom:'5px'}}>📤</div>
                    <span style={{color:'#6366f1', fontWeight:'bold'}}>Tirar Foto</span>
                  </label>
                  {imagem && <div style={{marginTop:'10px', color:'#10b981', fontWeight:'bold'}}>✅ Imagem selecionada</div>}
                </div>
                <button onClick={handleUpload} disabled={loading} className="btn-primary">
                   {loading ? "🤖 A analisar inteligência..." : "Enviar Foto"}
                </button>
              </div>
            </aside>

            <main className="content">
              <h3 style={{marginBottom: '15px'}}>📜 Histórico de Hoje</h3>
              <Historico
                lista={historico}
                editingId={editingId} editValues={editValues} setEditValues={setEditValues}
                aoRecalcular={recalcularNutricao} aoGuardar={guardarEdicao} aoCancelar={cancelarEdicao} aoAtivarEdicao={ativarEdicao} aoApagar={apagarItem}
              />
            </main>
          </div>
        )}

        {/* --- PLANEADOR --- */}
        {tabAtual === 'planner' && (
          <div style={{maxWidth:'900px', margin:'0 auto'}}>

            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'10px'}}>
              <h1 style={{fontSize:'1.8rem', margin:0}}>Seu Planeamento</h1>

              <div style={{display:'flex', gap:'10px'}}>
                {/* Botão Lista de Compras */}
                <button
                  onClick={abrirListaCompras}
                  disabled={loadingCompras || !ementa}
                  className="btn-primary"
                  style={{width:'auto', padding:'10px 20px', background:'#10b981', display:'flex', alignItems:'center', gap:'5px'}}
                >
                   {loadingCompras ? "🛒..." : <>🛒 <span className="hide-mobile">Lista de Compras</span></>}
                </button>

                {/* Botão Gerar Semana */}
                <button
                  onClick={gerarEmenta}
                  disabled={loadingEmenta}
                  className="btn-primary"
                  style={{width:'auto', padding:'10px 20px', background:'#9333ea', display:'flex', alignItems:'center', gap:'5px'}}
                >
                  {loadingEmenta ? "🍳..." : <>✨ <span className="hide-mobile">Gerar Semana</span></>}
                </button>
              </div>
            </div>

            {ementa ? (
              <EmentaSemanal
                plano={ementa}
                usuarioId={usuarioAtual.id}
                aoAtualizarPlano={carregarEmentaSalva}
                aoFechar={() => {}}
              />
            ) : (
              <div className="card" style={{textAlign:'center', padding:'60px 20px'}}>
                <span style={{fontSize:'4rem', display:'block', marginBottom:'20px'}}>📅</span>
                <p style={{fontSize:'1.2rem', fontWeight:'bold', color:'#374151'}}>Ainda não tens plano para esta semana.</p>
                <p style={{color:'#6b7280'}}>Clica no botão roxo "Gerar Semana" para o Chef Ollama criar um menu completo!</p>
              </div>
            )}

            {/* Modal Lista de Compras */}
            {mostrarCompras && listaCompras && (
              <ListaCompras
                lista={listaCompras}
                aoFechar={() => setMostrarCompras(false)}
              />
            )}
          </div>
        )}
        {tabAtual === 'despensa' && (
           <Despensa usuarioId={usuarioAtual.id} API_URL={API_URL} />
        )}
        {/* --- PERFIL --- */}
        {tabAtual === 'perfil' && (
            <Perfil usuario={usuarioAtual}  aoSair={() => setUsuarioAtual(null)}
                aoAtualizarDados={(novoUsuario) => setUsuarioAtual(novoUsuario)} API_URL={API_URL} />
        )}
        {tabAtual === 'financas' && (
          <FinancasDashboard usuario={usuarioAtual} API_URL={API_URL}/>
        )}
        {tabAtual === 'compras' && (
            <ListaComprasTab usuarioId={usuarioAtual.id} API_URL={API_URL} />
        )}
        {tabAtual === 'saude' && <TabSaude usuario={usuarioAtual} API_URL={API_URL} />}
        {tabAtual === 'minecraft' && <TabMinecraft usuario={usuarioAtual} API_URL={API_URL} />}

      </div>
    </div>
  )
}

export default App