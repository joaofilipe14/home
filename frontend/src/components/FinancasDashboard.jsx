import React, { useState, useEffect } from 'react'
import axios from 'axios'

// SUB-COMPONENTES
import ModalRendimentos from './ModalRendimentos'
import TabGeral from './TabGeral'
import TabMovimentos from './TabMovimentos'
import TabGestao from './TabGestao'

export default function FinancasDashboard({ usuario, API_URL }) {
  // --- ESTADOS DE DADOS GLOBAIS ---
  const [resumo, setResumo] = useState({ saldo_total: 0, gastos_mes: [] })
  const [contas, setContas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [movimentos, setMovimentos] = useState([])
  const [despesasFixas, setDespesasFixas] = useState([])
  const [fixasPagas, setFixasPagas] = useState({})
  const [dadosAnuais, setDadosAnuais] = useState([])
  const [rendimentos, setRendimentos] = useState({base:0, alimentacao:0, seguro:0, total:0});

  // --- ESTADOS DE UI GLOBAIS ---
  const [abaAtiva, setAbaAtiva] = useState('geral')
  const [mesSelecionado, setMesSelecionado] = useState(null)
  const [mostrarModalSalario, setMostrarModalSalario] = useState(false);

  useEffect(() => { carregarDados() }, [])

  const carregarDados = async () => {
    try {
        const [r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
            axios.get(`${API_URL}/financas/resumo?usuario_id=${usuario.id}`),
            axios.get(`${API_URL}/financas/contas?usuario_id=${usuario.id}`),
            axios.get(`${API_URL}/financas/categorias`),
            axios.get(`${API_URL}/financas/movimentos?usuario_id=${usuario.id}`),
            axios.get(`${API_URL}/financas/fixas?usuario_id=${usuario.id}`),
            axios.get(`${API_URL}/financas/anual?usuario_id=${usuario.id}`),
            axios.get(`${API_URL}/usuarios/rendimentos?usuario_id=${usuario.id}`)
        ]);

        setResumo(r1.data)
        setContas(r2.data)
        setCategorias(r3.data)
        setMovimentos(r4.data)
        setDespesasFixas(r5.data)
        setDadosAnuais(r6.data)
        if (r7.data) setRendimentos(r7.data);
    } catch (e) { console.error("Erro ao carregar dados", e) }
  }

  // --- LÓGICA DE CÁLCULO / HELPERS ---
  const getNomeMes = (mesAno) => {
      if(!mesAno) return "";
      const [ano, mes] = mesAno.split('-');
      return new Date(ano, mes - 1, 1).toLocaleString('pt-PT', { month: 'long', year: 'numeric' });
  }

  const getTaxaPoupanca = (rec, desp) => rec === 0 ? 0 : ((rec - desp) / rec) * 100;

  // --- LÓGICA DE DETALHE FINAL (SEM DUPLICAÇÃO DE SALÁRIOS) ---
    const getDetalhesMes = (mesAno) => {
        if (!mesAno) return null;
        const [anoStr, mesStr] = mesAno.split('-');
        const ano = parseInt(anoStr);
        const mes = parseInt(mesStr);
        const inicioJanela = new Date(ano, mes - 2, 15);
        const fimJanela = new Date(ano, mes - 1, 14, 23, 59, 59);

        // Palavras-chave fortes para identificar salários
        const keywordsSalario = ['SALARIO', 'VENCIMENTO', 'TRANSFERENCIA - VENCIMENTO', 'BOLDINT', 'DEVOTEAM', 'UNA SEGUROS', 'UNA', 'SEGUROS'];
        const isSalario = (desc) => keywordsSalario.some(k => desc.toUpperCase().includes(k));

        // 2. ENCONTRAR SALÁRIOS NA JANELA CORRETA (BASE)
        const salariosEncontrados = movimentos.filter(m => {
            const d = new Date(m.data_transacao);
            if (m.valor <= 0) return false;

            // Tem de estar na janela 15-14
            const naJanela = d >= inicioJanela && d <= fimJanela;
            if (!naJanela) return false;

            // Tem de parecer salário OU ser um valor muito alto (>500€)
            return isSalario(m.descricao) || m.valor > 500;
        });

        const valorSalarioReal = salariosEncontrados.reduce((acc, m) => acc + m.valor, 0);
        const idsSalarios = salariosEncontrados.map(m => m.id);

        // 3. CALCULAR EXTRAS (Excluir tudo o que pareça salário do próximo mês)
        const entradasExtras = movimentos.filter(m => {
            const d = new Date(m.data_transacao);
            const ehDesteMes = d.getFullYear() === ano && (d.getMonth() + 1) === mes; // Calendário 1-31

            if (!ehDesteMes || m.valor <= 0) return false;
            if (idsSalarios.includes(m.id)) return false; // Já é base deste mês

            // NOVO FILTRO: Se parece um salário mas não entrou na base (porque caiu dia 29),
            // então é do próximo mês! Ignora.
            if (isSalario(m.descricao) || m.valor > 500) return false;

            return true;
        });

        const totalExtras = entradasExtras.reduce((acc, m) => acc + m.valor, 0);

        // 4. TOTAIS
        const receitaBase = valorSalarioReal > 0 ? valorSalarioReal : rendimentos.total;
        const receitaTotalReal = receitaBase + totalExtras;
        const previsaoTotal = rendimentos.total + totalExtras;

        // --- 5. DESPESAS (Mantém-se igual) ---
        const mesJaPassou = new Date() > new Date(ano, mes, 0);
        const movimentosDoMes = movimentos.filter(m => {
            const d = new Date(m.data_transacao);
            return d.getFullYear() === ano && (d.getMonth() + 1) === mes && m.valor < 0;
        });

        const fixasDoMes = despesasFixas.filter(f => {
            if (!f.meses) return true;
            return String(f.meses).split(',').map(Number).includes(mes);
        });

        let totalGastoRealFixas = 0;
        let idsMovimentosUsados = [];

        const listaCombinada = fixasDoMes.map(fixa => {
            const movimentoCorrespondente = movimentosDoMes.find(mov =>
                !idsMovimentosUsados.includes(mov.id) &&
                (mov.descricao.toLowerCase().includes(fixa.descricao.toLowerCase()) ||
                 fixa.descricao.toLowerCase().includes(mov.descricao.toLowerCase()))
            );

            if (movimentoCorrespondente) {
                idsMovimentosUsados.push(movimentoCorrespondente.id);
                const valorReal = Math.abs(movimentoCorrespondente.valor);
                totalGastoRealFixas += valorReal;
                return { ...fixa, valor: valorReal, status: 'PAGO', diferenca: valorReal - fixa.valor };
            } else {
                if (mesJaPassou) return { ...fixa, status: 'NAO_PAGO' };
                totalGastoRealFixas += fixa.valor;
                return { ...fixa, status: 'PENDENTE' };
            }
        });

        const transacoesVariaveis = movimentosDoMes
            .filter(m => !idsMovimentosUsados.includes(m.id))
            .sort((a, b) => new Date(b.data_transacao) - new Date(a.data_transacao));

        const totalVariaveis = transacoesVariaveis.reduce((acc, curr) => acc + Math.abs(curr.valor), 0);

        const agrupadoPorCategoria = {};
        transacoesVariaveis.forEach(t => {
            const cat = t.categoria || 'Outros';
            if (!agrupadoPorCategoria[cat]) agrupadoPorCategoria[cat] = 0;
            agrupadoPorCategoria[cat] += Math.abs(t.valor);
        });

        const topCategorias = Object.entries(agrupadoPorCategoria)
            .map(([nome, total]) => ({ nome, total, percentagem: (total / totalVariaveis) * 100 }))
            .sort((a, b) => b.total - a.total);

        const totalDespesas = totalGastoRealFixas + totalVariaveis;

        return {
            lista: listaCombinada,
            transacoesVariaveis,
            topCategorias,
            receitaTotalReal,
            receitaPrevisao: previsaoTotal,
            salarioReal: valorSalarioReal,
            listaSalarios: salariosEncontrados,
            entradasExtras,
            totalDespesas,
            saldo: receitaTotalReal - totalDespesas
        };
    }

  const toggleFixaPaga = async (despesa) => {
      const vaiPagar = !fixasPagas[despesa.id];
      setFixasPagas(prev => ({ ...prev, [despesa.id]: vaiPagar }));
      if (vaiPagar) {
          const contaDestinoId = contas.length > 0 ? contas[0].id : null;
          const catDestino = categorias.find(c => c.nome === 'Casa' || c.nome === 'Habitação') || categorias[0];
          if (!contaDestinoId) { alert("Erro: Nenhuma conta bancária encontrada."); return; }
          if (window.confirm(`Pagar "${despesa.descricao}" (${despesa.valor}€)?`)) {
              try {
                  await axios.post(`${API_URL}/financas/transacao`, {
                      usuario_id: usuario.id, conta_id: contaDestinoId, categoria_id: catDestino?.id,
                      valor: -Math.abs(despesa.valor), descricao: `Pagamento Mensal: ${despesa.descricao}`, tipo: 'DESPESA'
                  });
                  carregarDados();
              } catch (e) { alert("Erro."); setFixasPagas(prev => ({ ...prev, [despesa.id]: false })); }
          } else { setFixasPagas(prev => ({ ...prev, [despesa.id]: false })); }
      }
  }

  const removerFixa = async (id) => { await axios.delete(`${API_URL}/financas/fixas?id=${id}`); carregarDados(); }

  // --- CÁLCULOS VISUAIS ---
  const mesAtual = new Date().getMonth() + 1;
  const totalFixasPendentes = despesasFixas
    .filter(f => {
        if (fixasPagas[f.id]) return false;
        if (!f.meses) return true;
        return String(f.meses).split(',').map(Number).includes(mesAtual);
    })
    .reduce((acc, curr) => acc + curr.valor, 0);

  const saldoReal = resumo.saldo_total - totalFixasPendentes;
  const hoje = new Date();
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  const diasRestantes = Math.max(1, ultimoDiaMes.getDate() - hoje.getDate());
  const podeGastarHoje = saldoReal / diasRestantes;
  const dadosGrafico = resumo.gastos_mes.map(g => ({ name: g.nome, value: Math.abs(g.total), color: g.cor_hex }))

  const btnAba = { padding:'10px 20px', border:'none', background:'none', cursor:'pointer', fontSize:'1rem', color:'#64748b', fontWeight:'500', borderBottom:'3px solid transparent' }
  const btnAbaAtiva = { ...btnAba, color:'#2563eb', borderBottom:'3px solid #2563eb' }

  return (
    <div className="animate-fade-in">
        {/* MENU DE ABAS */}
        <div style={{display:'flex', gap:'10px', marginBottom:'20px', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>
            <button onClick={() => setAbaAtiva('geral')} style={abaAtiva === 'geral' ? btnAbaAtiva : btnAba}>📊 Visão Geral</button>
            <button onClick={() => setAbaAtiva('movimentos')} style={abaAtiva === 'movimentos' ? btnAbaAtiva : btnAba}>💸 Movimentos</button>
            <button onClick={() => setAbaAtiva('gestao')} style={abaAtiva === 'gestao' ? btnAbaAtiva : btnAba}>⚙️ Fixas & Nutrição</button>
        </div>

        {/* COMPONENTES DAS ABAS */}
        {abaAtiva === 'geral' && (
            <TabGeral
                saldoReal={saldoReal} resumo={resumo} totalFixasPendentes={totalFixasPendentes}
                podeGastarHoje={podeGastarHoje} diasRestantes={diasRestantes} dadosGrafico={dadosGrafico}
                dadosAnuais={dadosAnuais} rendimentos={rendimentos} setMostrarModalSalario={setMostrarModalSalario}
                mesSelecionado={mesSelecionado} setMesSelecionado={setMesSelecionado}
                getDetalhesMes={getDetalhesMes} getNomeMes={getNomeMes} getTaxaPoupanca={getTaxaPoupanca}
            />
        )}

        {abaAtiva === 'movimentos' && (
            <TabMovimentos
                movimentos={movimentos} contas={contas} categorias={categorias}
                API_URL={API_URL} usuario={usuario} carregarDados={carregarDados}
            />
        )}

        {abaAtiva === 'gestao' && (
            <TabGestao
                despesasFixas={despesasFixas} fixasPagas={fixasPagas} toggleFixaPaga={toggleFixaPaga}
                removerFixa={removerFixa} API_URL={API_URL} usuario={usuario} carregarDados={carregarDados}
            />
        )}

        {mostrarModalSalario && (
            <ModalRendimentos
                usuario={usuario} dadosAtuais={rendimentos}
                aoFechar={() => setMostrarModalSalario(false)}
                aoSalvar={() => { setMostrarModalSalario(false); carregarDados(); }}
            />
        )}
    </div>
  )
}