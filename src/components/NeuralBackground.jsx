import React, { useEffect, useRef } from 'react';

export default function NeuralBackground({ theme }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];
    let width = window.innerWidth;
    let height = window.innerHeight;

    const isMobile = () => window.innerWidth <= 768;

    const getSettings = () => ({
      count: isMobile() ? 30 : 100,
      distance: isMobile() ? 120 : 150,
      opacityMul: isMobile() ? 0.5 : 1,
    });

    let settings = getSettings();

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 1;
        this.vy = (Math.random() - 0.5) * 1;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
        this.x = Math.max(0, Math.min(width, this.x));
        this.y = Math.max(0, Math.min(height, this.y));
      }
      draw() {
        const color = theme === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      settings = getSettings();
      for (let i = 0; i < settings.count; i++) {
        particles.push(new Particle());
      }
    };

    const resizeCanvas = () => {
      const oldW = width;
      const oldH = height;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      if (particles.length > 0) {
        particles.forEach((p) => {
          p.x = (p.x / oldW) * width;
          p.y = (p.y / oldH) * height;
        });
      }
      const newSettings = getSettings();
      if (newSettings.count !== settings.count) initParticles();
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, i) => {
        p.update();
        p.draw();
        for (let j = i + 1; j < particles.length; j++) {
          const dx = p.x - particles[j].x;
          const dy = p.y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < settings.distance) {
            const opacity = (1 - dist / settings.distance) * 0.5 * settings.opacityMul;
            const lineColor =
              Math.random() > 0.9
                ? `rgba(227, 6, 19, ${opacity})`
                : theme === 'light'
                  ? `rgba(0, 0, 0, ${opacity})`
                  : `rgba(255, 255, 255, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      });
      animationId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    initParticles();
    window.addEventListener('resize', resizeCanvas);
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [theme]);

  return (
    <div className="neural-background">
      <canvas ref={canvasRef} />
    </div>
  );
}
