import React, { useState } from 'react';
import axios from 'axios';

export default function ModalRendimentos({ usuario, dadosAtuais, aoSalvar, aoFechar }) {
    const [form, setForm] = useState(dadosAtuais);

    const handleChange = (e) => setForm({...form, [e.target.name]: parseFloat(e.target.value) || 0});

    const salvar = async () => {
        try {
            await axios.post(`${API_URL}/usuarios/rendimentos`, {
                usuario_id: usuario.id,
                base: form.base,
                alimentacao: form.alimentacao,
                seguro: form.seguro
            });
            aoSalvar();
        } catch (error) {
            alert("Erro ao gravar rendimentos.");
        }
    };

    const total = (form.base + form.alimentacao + form.seguro).toFixed(2);
    const inputStyle = { padding:'8px', borderRadius:'6px', border:'1px solid #ccc', width:'100%' };

    return (
        <div style={{
            position:'fixed', top:0, left:0, right:0, bottom:0,
            background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000
        }}>
            <div style={{background:'white', padding:'25px', borderRadius:'12px', width:'320px', boxShadow:'0 10px 25px rgba(0,0,0,0.2)'}}>
                <h3 style={{marginTop:0, color:'#1e293b'}}>💰 Configurar Rendimentos</h3>

                <div style={{marginBottom:'15px'}}>
                    <label style={{display:'block', fontSize:'0.85rem', color:'#64748b', marginBottom:'5px'}}>Ordenado Base (Líquido)</label>
                    <input name="base" type="number" value={form.base} onChange={handleChange} style={inputStyle} />
                </div>

                <div style={{marginBottom:'15px'}}>
                    <label style={{display:'block', fontSize:'0.85rem', color:'#64748b', marginBottom:'5px'}}>Subsídio Alimentação</label>
                    <input name="alimentacao" type="number" value={form.alimentacao} onChange={handleChange} style={inputStyle} />
                </div>

                <div style={{marginBottom:'20px'}}>
                    <label style={{display:'block', fontSize:'0.85rem', color:'#64748b', marginBottom:'5px'}}>Seguro Capitalização / Prémios</label>
                    <input name="seguro" type="number" value={form.seguro} onChange={handleChange} style={inputStyle} />
                </div>

                <div style={{textAlign:'right', marginBottom:'20px', padding:'10px', background:'#f0fdf4', borderRadius:'8px', color:'#166534'}}>
                    <span style={{fontSize:'0.8rem'}}>Total Mensal Previsto:</span><br/>
                    <strong style={{fontSize:'1.2rem'}}>{total}€</strong>
                </div>

                <div style={{display:'flex', gap:'10px'}}>
                    <button onClick={aoFechar} style={{flex:1, padding:'10px', border:'1px solid #cbd5e1', background:'white', borderRadius:'6px', cursor:'pointer', color:'#64748b'}}>Cancelar</button>
                    <button onClick={salvar} className="btn-primary" style={{flex:1, padding:'10px', borderRadius:'6px', border:'none', background:'#2563eb', color:'white', cursor:'pointer'}}>Gravar</button>
                </div>
            </div>
        </div>
    )
}