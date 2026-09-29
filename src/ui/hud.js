/**
 * Military Green Phosphor Head-Up Display (HUD) & FLIR Thermal Targeting Pod Canvas
 */
export class TacticalHUD {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'hudCanvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '10';
    this.container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));

    this.hudColor = '#00ff66'; // Tactical green phosphor
    this.hudColorWarning = '#ff3344'; // Red alert
    this.hudColorCaution = '#ffaa00'; // Amber
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  draw(flightState, missionState, rcsState, weaponsState, isFlightSim) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (!isFlightSim && !flightState) return;

    const cx = this.width / 2;
    const cy = this.height / 2;
    const color = (rcsState && rcsState.threatLevel > 0.6) ? this.hudColorWarning : this.hudColor;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.8;
    ctx.font = '12px "Courier New", monospace';

    // 1. Center Flight Path Vector / Bore Sight Cross
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.moveTo(cx - 16, cy); ctx.lineTo(cx - 7, cy);
    ctx.moveTo(cx + 7, cy); ctx.lineTo(cx + 16, cy);
    ctx.moveTo(cx, cy - 16); ctx.lineTo(cx, cy - 7);
    ctx.stroke();

    // 2. Pitch Ladder & Horizon Line (Responsive to aircraft pitch and roll)
    const pitch = flightState.rotation ? flightState.rotation.x : 0;
    const roll = flightState.rotation ? flightState.rotation.z : 0;
    const pitchPx = (pitch * 180 / Math.PI) * 8.0; // 8px per degree

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(roll);

    // Artificial Horizon Line
    ctx.beginPath();
    ctx.setLineDash([12, 8]);
    ctx.moveTo(-160, pitchPx);
    ctx.lineTo(160, pitchPx);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pitch ladder rungs (+10, +20, -10, -20 deg)
    for (let deg = -30; deg <= 30; deg += 10) {
      if (deg === 0) continue;
      const y = pitchPx - deg * 8.0;
      const isPositive = deg > 0;

      ctx.beginPath();
      if (!isPositive) ctx.setLineDash([6, 6]);

      // Left bar
      ctx.moveTo(-75, y); ctx.lineTo(-25, y);
      ctx.lineTo(-25, y + (isPositive ? 8 : -8));

      // Right bar
      ctx.moveTo(75, y); ctx.lineTo(25, y);
      ctx.lineTo(25, y + (isPositive ? 8 : -8));
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillText(Math.abs(deg).toString(), -95, y + 4);
      ctx.fillText(Math.abs(deg).toString(), 82, y + 4);
    }
    ctx.restore();

    // 3. Airspeed Ladder (Left Side)
    const speedKnots = Math.round((flightState.speed || 180) * 1.94384);
    ctx.strokeRect(cx - 240, cy - 120, 55, 240);
    ctx.fillRect(cx - 240, cy - 14, 55, 28);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`${speedKnots} KT`, cx - 235, cy + 5);

    ctx.fillStyle = color;
    ctx.font = '12px monospace';
    ctx.fillText(`MACH ${flightState.mach ? flightState.mach.toFixed(2) : '0.55'}`, cx - 240, cy + 140);
    ctx.fillText(`G: ${flightState.gForce ? flightState.gForce.toFixed(1) : '1.0'}`, cx - 240, cy + 158);

    // 4. Altitude Ladder (Right Side)
    const altFt = Math.round((flightState.altitude || 1800) * 3.28084);
    ctx.strokeRect(cx + 185, cy - 120, 65, 240);
    ctx.fillRect(cx + 185, cy - 14, 65, 28);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`${altFt} FT`, cx + 190, cy + 5);

    ctx.fillStyle = color;
    ctx.font = '12px monospace';
    const climbRateFpm = Math.round((flightState.climbRate || 0) * 196.85);
    ctx.fillText(`VVI: ${climbRateFpm > 0 ? '+' : ''}${climbRateFpm}`, cx + 185, cy + 140);
    ctx.fillText(`BARO: 29.92`, cx + 185, cy + 158);

    // 5. Heading Compass Tape (Top Center)
    const headingDeg = Math.round((((flightState.rotation ? -flightState.rotation.y : 0) * 180 / Math.PI) + 360) % 360);
    ctx.strokeRect(cx - 150, 45, 300, 32);
    ctx.beginPath();
    ctx.moveTo(cx, 45); ctx.lineTo(cx - 6, 38); ctx.lineTo(cx + 6, 38); ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 14px monospace';
    ctx.fillText(`${headingDeg.toString().padStart(3, '0')}°`, cx - 15, 66);

    // 6. Stealth RCS Indicator & Threat Gauge (Top Left)
    ctx.strokeRect(40, 45, 240, 95);
    ctx.font = 'bold 12px monospace';
    ctx.fillText('STEALTH AVIONICS [AN/APQ-181]', 50, 65);

    const rcsVal = rcsState ? rcsState.currentRCS : 0.0001;
    ctx.font = '11px monospace';
    ctx.fillText(`RCS VALUE: ${rcsVal < 0.001 ? '< 0.0001' : rcsVal.toFixed(4)} m²`, 50, 85);
    ctx.fillText(`ECHO SIGNATURE: ${rcsState ? rcsState.getEquivalentTargetDescription(rcsVal) : 'Insect / Low-Obs'}`, 50, 102);

    // Threat Meter Bar
    const threat = rcsState ? rcsState.threatLevel : 0;
    ctx.fillText(`SAM THREAT:`, 50, 122);
    ctx.strokeRect(140, 112, 125, 12);
    if (threat > 0.01) {
      ctx.fillStyle = threat > 0.6 ? '#ff2233' : (threat > 0.3 ? '#ffaa00' : '#00ff66');
      ctx.fillRect(141, 113, Math.min(123, threat * 123), 10);
    }

    // 7. Weapon Status & Bay State (Bottom Left)
    ctx.fillStyle = color;
    ctx.strokeRect(40, this.height - 155, 240, 115);
    ctx.font = 'bold 12px monospace';
    ctx.fillText('WEAPONS MANAGEMENT (SMS)', 50, this.height - 135);

    const bayOpen = weaponsState && weaponsState.bayDoorsOpen > 0.5;
    ctx.font = '11px monospace';
    ctx.fillText(`MUNITION: 8x GBU-31 JDAM / JASSM`, 50, this.height - 115);
    ctx.fillText(`INTERNAL BAY: ${bayOpen ? '>> OPEN <<' : 'CLOSED [STEALTH]'}`, 50, this.height - 95);
    if (bayOpen) {
      ctx.fillStyle = '#ffaa00';
      ctx.fillText('CAUTION: RCS INCREASED', 50, this.height - 75);
    } else {
      ctx.fillText('BAY STATUS: LOW-OBSERVABLE', 50, this.height - 75);
    }

    ctx.fillStyle = color;
    ctx.fillText(`MISSION TARGETS: ${missionState ? missionState.targetsDestroyed : 0}/3 DESTROYED`, 50, this.height - 55);

    // 8. Target Lock Reticle (When target is in front)
    if (missionState && missionState.targets) {
      missionState.targets.forEach(tgt => {
        if (!tgt.isDestroyed && flightState.position) {
          const dist = flightState.position.distanceTo(tgt.position);
          if (dist < 8000) {
            // Draw Target Cue diamond
            ctx.save();
            ctx.strokeStyle = dist < 4500 ? '#ff0033' : '#00ff66';
            ctx.lineWidth = 2;

            // Target bracket box at center
            ctx.strokeRect(cx - 28, cy - 28, 56, 56);
            ctx.font = '10px monospace';
            ctx.fillText(`TGT: ${tgt.name.split(':')[0]}`, cx + 34, cy - 12);
            ctx.fillText(`RNG: ${(dist / 1000).toFixed(1)} KM`, cx + 34, cy + 4);
            ctx.fillText(dist < 4000 ? '>> IN LAUNCH BASKET <<' : 'INBOUND', cx + 34, cy + 20);
            ctx.restore();
          }
        }
      });
    }

    ctx.restore();
  }
}
