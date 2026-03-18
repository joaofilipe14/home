import React, { useEffect, useRef } from 'react';
import * as skinview3d from 'skinview3d';

export default function Skin3DViewer({ skinUrl }) {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    // Se não houver canvas, não faz nada
    if (!canvasRef.current) return;

    // 1. Inicializar o Visualizador
    const viewer = new skinview3d.SkinViewer({
      canvas: canvasRef.current,
      width: 200,      // Largura do canvas
      height: 300,     // Altura do canvas
      skin: skinUrl,   // O URL da tua skin (local ou remota)
      background: 0x111827 // Cor de fundo (aquele cinzento escuro do teu tema)
    });

    // 2. Adicionar Animação (Boneco a andar ou rodar)
    // Opção A: A andar (WalkingAnimation)
    // Opção B: A rodar (RotatingAnimation)
    // Opção C: A correr (RunningAnimation)
    viewer.animation = new skinview3d.WalkingAnimation();

    // Velocidade da animação (podes ajustar)
    viewer.animation.speed = 0.5;

    // Ajustar a câmara/zoom inicial
    viewer.zoom = 0.8;

    // Guardar referência para limpar depois
    viewerRef.current = viewer;

    // 3. Limpeza (Quando mudas de aba, destrói o boneco para não pesar)
    return () => {
      viewer.dispose();
    };
  }, [skinUrl]); // Recria se o URL da skin mudar

  return (
    <div style={{
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        border: '1px solid #374151'
    }}>
      <canvas ref={canvasRef} />
    </div>
  );
}