/**
 * Neural Network Hero Graphic
 * Lightweight HTML5 Canvas animated network with pulsing nodes,
 * connecting circuit threads, and branded domain nodes (Health, Agri, Cyber, Social).
 * Honors prefers-reduced-motion. Under 8 KB.
 */

class NeuralNetworkAnimation {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.connections = [];
    this.numNodes = 28;
    this.animationFrameId = null;
    this.mouse = { x: -1000, y: -1000, radius: 100 };
    
    // Check reduced motion preference
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Domain focal nodes with specific domain identities
    const domainTypes = [
      { label: 'Healthcare', color: '#FDA4AF', icon: '❤️' },
      { label: 'Agriculture', color: '#6EE7B7', icon: '🌱' },
      { label: 'Cyber Defence', color: '#818CF8', icon: '🛡️' },
      { label: 'Social Impact', color: '#C084FC', icon: '🤝' }
    ];

    this.nodes = [];
    for (let i = 0; i < this.numNodes; i++) {
      const isDomain = i < domainTypes.length;
      const domainInfo = isDomain ? domainTypes[i] : null;

      this.nodes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: isDomain ? 10 : Math.random() * 3 + 2,
        baseRadius: isDomain ? 10 : Math.random() * 3 + 2,
        pulseSpeed: 0.02 + Math.random() * 0.02,
        pulseVal: Math.random() * Math.PI,
        color: isDomain ? domainInfo.color : '#06B6D4',
        isDomain: isDomain,
        domainLabel: isDomain ? domainInfo.label : '',
        domainIcon: isDomain ? domainInfo.icon : ''
      });
    }

    if (!this.reducedMotion) {
      this.animate();
    } else {
      this.draw(); // Single static render
    }
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    this.width = this.canvas.width = parent.clientWidth;
    this.height = this.canvas.height = parent.clientHeight;
  }

  update() {
    const maxDist = 130;

    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];

      if (!this.reducedMotion) {
        n.x += n.vx;
        n.y += n.vy;

        // Bounce off canvas edges
        if (n.x < 15 || n.x > this.width - 15) n.vx *= -1;
        if (n.y < 15 || n.y > this.height - 15) n.vy *= -1;

        // Pulse radius
        n.pulseVal += n.pulseSpeed;
        n.radius = n.baseRadius + Math.sin(n.pulseVal) * (n.isDomain ? 2.5 : 1);
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const maxDist = 125;

    // Draw connecting circuit/synapse lines
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const dx = this.nodes[i].x - this.nodes[j].x;
        const dy = this.nodes[i].y - this.nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.28;
          this.ctx.beginPath();
          this.ctx.moveTo(this.nodes[i].x, this.nodes[i].y);
          this.ctx.lineTo(this.nodes[j].x, this.nodes[j].y);
          this.ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }
      }
    }

    // Draw nodes
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];

      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);

      if (n.isDomain) {
        // Outer glowing ring
        this.ctx.fillStyle = n.color;
        this.ctx.shadowColor = n.color;
        this.ctx.shadowBlur = 12;
        this.ctx.fill();

        // Inner solid core
        this.ctx.beginPath();
        this.ctx.arc(n.x, n.y, n.radius - 3, 0, Math.PI * 2);
        this.ctx.fillStyle = '#1E1B4B';
        this.ctx.fill();

        // Label above domain node
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.font = 'bold 10px ui-rounded, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(n.domainLabel, n.x, n.y - n.radius - 4);
      } else {
        this.ctx.fillStyle = n.color;
        this.ctx.shadowColor = '#06B6D4';
        this.ctx.shadowBlur = 6;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
    }
  }

  animate() {
    this.update();
    this.draw();
    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

window.NeuralNetworkAnimation = NeuralNetworkAnimation;
