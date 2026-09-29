import * as THREE from 'three';

/**
 * Radar Cross Section (RCS) Physics & Aspect-Angle Calculation
 * Simulates low-observability stealth radar scattering principles of the B-2
 */
export class RCSSimulator {
  constructor() {
    this.baseStealthRCS = 0.0001; // m² (B-2 Spirit baseline head-on RCS - size of a bumblebee)
    this.currentRCS = 0.0001;
    this.threatLevel = 0; // 0 (undetected) to 1.0 (locked)
    this.nearestThreatDist = Infinity;
  }

  calculateRCS(aircraftRotation, bayDoorsOpen = 0, gearDown = 0, radarEmitterPos = null, aircraftPos = null) {
    // Determine relative angle between aircraft nose and radar wave emitter
    let aspectAngle = 0; // Radians (0 = head on, PI = tail, PI/2 = beam)
    
    if (radarEmitterPos && aircraftPos) {
      const relVector = new THREE.Vector3().subVectors(radarEmitterPos, aircraftPos).normalize();
      const aircraftForward = new THREE.Vector3(0, 0, -1).applyEuler(aircraftRotation);
      aspectAngle = aircraftForward.angleTo(relVector);
    }

    // Stealth flying-wing RCS polar distribution:
    // B-2 planform aligns all edges to ±33° & ±147° to concentrate returns in 4 ultra-narrow lobes
    const deg = (aspectAngle * 180 / Math.PI) % 180;
    let facetMultiplier = 1.0;

    // Check proximity to the 4 specular reflection spike angles (33° and 147°)
    const spike1 = Math.abs(deg - 33);
    const spike2 = Math.abs(deg - 147);
    const minSpikeDist = Math.min(spike1, spike2);

    if (minSpikeDist < 4.0) {
      // In specular flash spike
      facetMultiplier = 1.0 + (4.0 - minSpikeDist) * 12.0;
    } else if (deg > 80 && deg < 100) {
      // Side beam aspect (slightly higher than nose)
      facetMultiplier = 2.5;
    }

    // Base stealth RCS
    let rcs = this.baseStealthRCS * facetMultiplier;

    // Penalties for un-stealthy configurations
    if (bayDoorsOpen > 0.1) {
      // Open weapons bay creates internal cavity radar resonance
      rcs += bayDoorsOpen * 0.065; // Spikes up to 0.065 m²
    }
    if (gearDown > 0.1) {
      // Extended landing gear creates multiple corner reflectors
      rcs += gearDown * 0.85; // Spikes up to 0.85 m²
    }

    this.currentRCS = rcs;
    return rcs;
  }

  getEquivalentTargetDescription(rcs) {
    if (rcs < 0.0005) return 'Insect / Bumblebee (0.0001 m²)';
    if (rcs < 0.005) return 'Small Songbird (0.001 m²)';
    if (rcs < 0.05) return 'Golf Ball / F-35 Bay Open (0.02 m²)';
    if (rcs < 0.5) return 'Small Drone / AGM Missile (0.1 m²)';
    if (rcs < 5.0) return 'F-16 / Modern Fighter (2.0 m²)';
    return 'B-52 / Heavy Bomber (25.0+ m²)';
  }

  updateThreatLevel(aircraftPos, samSites) {
    let maxThreat = 0;
    let minDistance = Infinity;

    samSites.forEach(sam => {
      const dist = aircraftPos.distanceTo(sam.position);
      if (dist < minDistance) minDistance = dist;

      // Radar detection formula: Max detection range scales with R_max * (RCS / 1.0)^(1/4)
      const maxRadarRange = sam.radarRange * Math.pow(this.currentRCS, 0.25);

      if (dist < maxRadarRange) {
        const threat = 1.0 - (dist / maxRadarRange);
        if (threat > maxThreat) maxThreat = threat;
      }
    });

    this.threatLevel = maxThreat;
    this.nearestThreatDist = minDistance;
    return { threatLevel: maxThreat, nearestDist: minDistance };
  }
}
