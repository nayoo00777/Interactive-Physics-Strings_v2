export class Vector {
  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  static sub(v1: Vector, v2: Vector): Vector {
    return new Vector(v1.x - v2.x, v1.y - v2.y);
  }

  setXY(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add(v: Vector) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  mult(n: number) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  mag() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  dist(v: Vector) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export class Particle {
  pos: Vector;
  oldPos: Vector;
  pinned: boolean;
  friction: number;
  gravity: Vector;
  color: string;

  constructor(x: number, y: number, pinned: boolean = false, color: string = "rgba(255, 255, 255, 0.2)") {
    this.pos = new Vector(x, y);
    this.oldPos = new Vector(x, y);
    this.pinned = pinned;
    this.friction = 0.96;
    this.gravity = new Vector(0, 0.05);
    this.color = color;
  }

  update(mouse: { pos: Vector; radius: number }) {
    if (this.pinned) return;

    const vel = Vector.sub(this.pos, this.oldPos);
    this.oldPos.setXY(this.pos.x, this.pos.y);

    vel.mult(this.friction);
    vel.add(this.gravity);

    const diff = Vector.sub(mouse.pos, this.pos);
    const dist = diff.mag();
    
    if (dist < mouse.radius && dist > 0) {
      const direction = new Vector(diff.x / dist, diff.y / dist);
      const force = Math.pow((mouse.radius - dist) / mouse.radius, 2); // Non-linear force for smoother feel

      if (force > 0.8) {
        this.pos.setXY(mouse.pos.x, mouse.pos.y);
      } else {
        this.pos.add(vel);
        this.pos.add(direction.mult(force * 8));
      }
    } else {
      this.pos.add(vel);
    }
  }
}

export class Rope {
  particles: Particle[] = [];
  segmentLength: number;
  hue: number;

  constructor(x: number, y: number, length: number, segments: number, hue: number = 200) {
    this.segmentLength = length / segments;
    this.hue = hue;
    for (let i = 0; i < segments; i++) {
      const alpha = 0.1 + (i / segments) * 0.4;
      this.particles.push(new Particle(x, y + i * this.segmentLength, i === 0, `hsla(${hue}, 80%, 70%, ${alpha})`));
    }
  }

  update(mouse: { pos: Vector; radius: number }) {
    for (const p of this.particles) {
      p.update(mouse);
    }

    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < this.particles.length - 1; j++) {
        const p1 = this.particles[j];
        const p2 = this.particles[j + 1];

        const diff = Vector.sub(p1.pos, p2.pos);
        const dist = diff.mag();
        if (dist === 0) continue;
        const error = dist - this.segmentLength;
        const percent = error / dist / 2;
        const offset = new Vector(diff.x * percent, diff.y * percent);

        if (!p1.pinned) p1.pos.add(new Vector(-offset.x, -offset.y));
        if (!p2.pinned) p2.pos.add(offset);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    ctx.beginPath();
    const dynamicHue = (this.hue + Math.sin(time * 0.001) * 30) % 360;
    ctx.strokeStyle = `hsla(${dynamicHue}, 70%, 60%, 0.15)`;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.moveTo(this.particles[0].pos.x, this.particles[0].pos.y);
    for (let i = 1; i < this.particles.length; i++) {
      // Use quadratic curves for smoother lines
      const p = this.particles[i];
      const prev = this.particles[i - 1];
      const xc = (p.pos.x + prev.pos.x) / 2;
      const yc = (p.pos.y + prev.pos.y) / 2;
      ctx.quadraticCurveTo(prev.pos.x, prev.pos.y, xc, yc);
    }
    ctx.stroke();

    // Draw glowing end point
    const last = this.particles[this.particles.length - 1];
    const glowSize = 4 + Math.sin(time * 0.005 + this.hue) * 2;
    
    ctx.beginPath();
    const gradient = ctx.createRadialGradient(last.pos.x, last.pos.y, 0, last.pos.x, last.pos.y, glowSize * 3);
    gradient.addColorStop(0, `hsla(${dynamicHue}, 90%, 70%, 0.8)`);
    gradient.addColorStop(1, `hsla(${dynamicHue}, 90%, 70%, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.arc(last.pos.x, last.pos.y, glowSize * 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.fillStyle = `hsla(${dynamicHue}, 100%, 90%, 0.9)`;
    ctx.arc(last.pos.x, last.pos.y, glowSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
