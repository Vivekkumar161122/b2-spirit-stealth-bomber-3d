/**
 * Tactical 2D Radar Map & Air Defense Threat Display
 */
export class TacticalRadarMap {
  constructor(container) {
    this.container = container;

    this.wrapper = document.createElement('div');
    this.wrapper.id = 'tacticalRadar';
    this.wrapper.style.position = 'absolute';
    this.wrapper.style.bottom = '25px';
    this.wrapper.style.right = '25px';
    this.wrapper.style.width = '200px';
    this.wrapper.style.height = '200px';
    this.wrapper.style.borderRadius = '50%';
    this.wrapper.style.background = 'radial-gradient(circle, rgba(6, 18, 12, 0.9) 0%, rgba(2, 8, 5, 0.95) 100%)';
    this.wrapper.style.border = '2px solid rgba(0, 255, 100, 0.6)';
    this.wrapper.style.boxShadow = '0 0 15px rgba(0, 255, 100, 0.25), inset 0 0 15px rgba(0, 255, 100, 0.15)';
    this.wrapper.style.zIndex = '20';
    this.wrapper.style.overflow = 'hidden';

    this.canvas = document.createElement('canvas');
    this.canvas.width = 200;
    this.canvas.height = 200;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.wrapper.appendChild(this.canvas);
    this.container.appendChild(this.wrapper);

    this.ctx = this.canvas.getContext('2d');
    this.radarAngle = 0;
  }

  draw(aircraftPos, aircraftRot, targets, samSites, waypoints) {
    const ctx = this.ctx;
    const w = 200;
    const h = 200;
    const cx = w / 2;
    const cy = h / 2;
    const scale = 0.015; // Map scale: 1 meter = 0.015 pixels (approx 13km radius)

    ctx.clearRect(0, 0, w, h);

    // 1. Concentric Range Rings (3km, 6km, 9km)
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.25)';
    ctx.lineWidth = 1;
    [30, 60, 90].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.stroke();

    // 2. Rotating Radar Sweep Beam
    this.radarAngle += 0.035;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.radarAngle);
    const grad = ctx.createLinearGradient(0, 0, 95, 0);
    grad.addColorStop(0, 'rgba(0, 255, 100, 0.4)');
    grad.addColorStop(1, 'rgba(0, 255, 100, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 95, -0.25, 0);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.restore();

    if (!aircraftPos) return;

    // Aircraft heading angle
    const heading = aircraftRot ? aircraftRot.y : 0;

    // Transform world coords to radar screen coords (Aircraft centered at cx, cy)
    const toRadarX = (wx) => cx + (wx - aircraftPos.x) * scale;
    const toRadarY = (wz) => cy + (wz - aircraftPos.z) * scale;

    // 3. Draw SAM Sites and Radar Threat Domes
    if (samSites) {
      samSites.forEach(sam => {
        const sx = toRadarX(sam.position.x);
        const sy = toRadarY(sam.position.z);

        // SAM Range Circle
        const samRadiusPx = (sam.radarRange || 3500) * scale;
        ctx.strokeStyle = 'rgba(255, 40, 40, 0.35)';
        ctx.fillStyle = 'rgba(255, 40, 40, 0.08)';
        ctx.beginPath();
        ctx.arc(sx, sy, samRadiusPx, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // SAM Icon (Red triangle)
        ctx.fillStyle = '#ff2233';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 4);
        ctx.lineTo(sx - 4, sy + 4);
        ctx.lineTo(sx + 4, sy + 4);
        ctx.closePath();
        ctx.fill();
      });
    }

    // 4. Draw Targets
    if (targets) {
      targets.forEach(tgt => {
        const tx = toRadarX(tgt.position.x);
        const ty = toRadarY(tgt.position.z);

        ctx.fillStyle = tgt.isDestroyed ? '#555555' : '#ffaa00';
        ctx.strokeStyle = tgt.isDestroyed ? '#444444' : '#ff0044';
        ctx.lineWidth = 1.5;

        // Target Diamond
        ctx.beginPath();
        ctx.moveTo(tx, ty - 5);
        ctx.lineTo(tx + 5, ty);
        ctx.lineTo(tx, ty + 5);
        ctx.lineTo(tx - 5, ty);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
    }

    // 5. Draw Flight Waypoints
    if (waypoints) {
      ctx.strokeStyle = '#00f0ff';
      ctx.fillStyle = '#00f0ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      waypoints.forEach((wp, idx) => {
        const wx = toRadarX(wp.pos.x);
        const wy = toRadarY(wp.pos.z);
        if (idx === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      });
      ctx.stroke();
    }

    // 6. Draw Player Stealth Aircraft (Center icon with heading pointer)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-heading);

    // B-2 Flying Wing Icon
    ctx.fillStyle = '#00ff66';
    ctx.beginPath();
    ctx.moveTo(0, -6); // Nose
    ctx.lineTo(-8, 4); // Left wingtip
    ctx.lineTo(-3, 2); // W notch
    ctx.lineTo(0, 5);  // Beaver tail
    ctx.lineTo(3, 2);  // W notch
    ctx.lineTo(8, 4);  // Right wingtip
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
