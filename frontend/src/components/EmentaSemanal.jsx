import React, { useState } from 'react'
import axios from 'axios'

export default function EmentaSemanal({ plano, usuarioId, aoAtualizarPlano }) {

  // Estado para saber qual dia está a carregar (para rodar o ícone)
  const [loadingDia, setLoadingDia] = useState(null)

  // Proteção contra dados vazios
  if (!plano || !Array.isArray(plano) || plano.length === 0) {
    return <div style={{textAlign:'center', padding:'20px', color:'#666'}}>A carregar plano...</div>
  }

  // --- AÇÃO: RECRIAR DIA ---
  const handleRecriarDia = async (diaNome) => {
    if (!usuarioId) return alert("Erro: Utilizador não identificado.");

    // 1. Ativa a animação de loading neste dia específico
    setLoadingDia(diaNome)

    try {
      // 2. Chama o Backend (que vai pedir ao Ollama só 1 dia)
      await axios.post(`${API_URL}/planear/dia`, {
        usuario_id: usuarioId,
        dia: diaNome
      })

      // 3. Sucesso! Pede ao Pai (App.jsx) para ler a BD atualizada
      if (aoAtualizarPlano) {
        await aoAtualizarPlano();
      }

    } catch (e) {
      console.error(e)
      alert("O Chef estava distraído. Tenta outra vez!")
    } finally {
      // 4. Desliga a animação
      setLoadingDia(null)
    }
  }

  // Estilos dos cartões
  const getEstiloRefeicao = (tipo) => {
    const t = tipo ? tipo.toLowerCase() : "";
    if (t.includes('pequeno') || t.includes('café')) return { icon: '☕', color: '#d97706', bg: '#fffbeb' };
    if (t.includes('almoço')) return { icon: '🍽️', color: '#dc2626', bg: '#fef2f2' };
    if (t.includes('lanche')) return { icon: '🥪', color: '#059669', bg: '#ecfdf5' };
    if (t.includes('jantar')) return { icon: '🌙', color: '#4f46e5', bg: '#eef2ff' };
    return { icon: '🍴', color: '#4b5563', bg: '#f9fafb' };
  };

  return (
    <div className="animate-fade-in" style={{marginBottom: '80px'}}> {/* Margem extra para mobile */}

      {/* Grelha Responsiva */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px'
      }}>

        {plano.map((dia, index) => (
          <div key={index} className="card" style={{
            padding: '0',
            overflow: 'hidden',
            border: 'none',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
          }}>

            {/* --- CABEÇALHO DO DIA --- */}
            <div style={{
              background: 'linear-gradient(135deg, #9333ea 0%, #7928ca 100%)',
              color: 'white',
              padding: '12px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{margin:0, fontSize:'1.1rem', fontWeight:'600'}}>{dia.dia}</h3>

              {/* BOTÃO MÁGICO DE REFRESH */}
              <button
                onClick={() => handleRecriarDia(dia.dia)}
                disabled={loadingDia === dia.dia}
                title="Não gostas? Gera novas refeições para este dia!"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '1.2rem',
                  transition: 'background 0.2s'
                }}
              >
                {/* Se estiver a carregar, usa a classe 'spin' */}
                <span className={loadingDia === dia.dia ? "spin" : ""}>↻</span>
              </button>
            </div>

            {/* --- LISTA DE REFEIÇÕES --- */}
            <div style={{
              padding: '15px',
              display:'flex',
              flexDirection:'column',
              gap:'10px',
              background:'white',
              opacity: loadingDia === dia.dia ? 0.5 : 1, // Efeito visual de loading
              pointerEvents: loadingDia === dia.dia ? 'none' : 'auto' // Bloqueia cliques
            }}>

              {(dia.refeicoes || []).map((ref, i) => {
                const estilo = getEstiloRefeicao(ref.tipo);
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px',
                    borderRadius: '8px', backgroundColor: estilo.bg, borderLeft: `4px solid ${estilo.color}`
                  }}>
                    <div style={{fontSize: '1.4rem'}}>{estilo.icon}</div>
                    <div style={{flex: 1}}>
                      <div style={{fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: '800', color: estilo.color}}>{ref.tipo}</div>
                      <div style={{fontWeight: '600', color: '#1f2937', lineHeight:'1.2'}}>{ref.prato}</div>
                    </div>
                    <div style={{fontSize: '0.85rem', fontWeight: '700', color: '#6b7280'}}>{ref.calorias} kcal</div>
                  </div>
                )
              })}

              {(!dia.refeicoes || dia.refeicoes.length === 0) && (
                <p style={{textAlign:'center', color:'#999', fontStyle:'italic'}}>Sem dados.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Animação CSS inline para o botão rodar */}
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .spin { display: inline-block; animation: spin 1s linear infinite; }
      `}</style>
    </div>
  )
}