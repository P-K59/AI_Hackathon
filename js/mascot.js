/**
 * Sahay (Helper) - The AI Hackathon Mascot
 * Original, friendly robot guide with round head, big expressive eyes,
 * glowing antenna, indigo/yellow styling, and reactive animations.
 */

const SahayMascot = {
  /**
   * Generates inline SVG markup for Sahay robot
   * @param {string} state - 'idle', 'waving', 'celebrating', 'thinking'
   * @param {number} size - width/height in px (default 160)
   */
  getSVG(state = 'waving', size = 160) {
    const isWaving = state === 'waving';
    const isCelebrating = state === 'celebrating';
    const isThinking = state === 'thinking';

    return `
      <svg class="sahay-robot-svg sahay-state-${state}" width="${size}" height="${size}" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sahay - AI Hackathon Guide Robot">
        <defs>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4F46E5" />
            <stop offset="100%" stop-color="#3730A3" />
          </linearGradient>
          <linearGradient id="faceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#1E1B4B" />
            <stop offset="100%" stop-color="#0F172A" />
          </linearGradient>
          <linearGradient id="chestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#06B6D4" />
            <stop offset="100%" stop-color="#4F46E5" />
          </linearGradient>
          <filter id="yellowGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Antenna -->
        <g class="sahay-antenna">
          <line x1="100" y1="48" x2="100" y2="24" stroke="#CBD5E1" stroke-width="4" stroke-linecap="round" />
          <circle cx="100" cy="20" r="10" fill="#FBBF24" filter="url(#yellowGlow)" class="antenna-bulb" />
          <circle cx="100" cy="20" r="4" fill="#FFFFFF" />
        </g>

        <!-- Ears / Audio sensors -->
        <rect x="36" y="70" width="12" height="26" rx="6" fill="#06B6D4" />
        <rect x="152" y="70" width="12" height="26" rx="6" fill="#06B6D4" />

        <!-- Head -->
        <rect x="44" y="44" width="112" height="84" rx="28" fill="url(#bodyGrad)" stroke="#818CF8" stroke-width="3" />

        <!-- Face Screen -->
        <rect x="56" y="56" width="88" height="60" rx="18" fill="url(#faceGrad)" stroke="#312E81" stroke-width="2" />

        <!-- Expressive Eyes -->
        <g class="sahay-eyes">
          ${isThinking ? `
            <!-- Thinking eyes -->
            <ellipse cx="80" cy="84" rx="10" ry="6" fill="#06B6D4" />
            <ellipse cx="120" cy="80" rx="11" ry="8" fill="#06B6D4" />
            <circle cx="83" cy="83" r="3" fill="#FFFFFF" />
            <circle cx="123" cy="78" r="4" fill="#FFFFFF" />
          ` : isCelebrating ? `
            <!-- Happy inverted arc eyes -->
            <path d="M 72 86 Q 80 72 88 86" stroke="#FBBF24" stroke-width="4" stroke-linecap="round" fill="none" />
            <path d="M 112 86 Q 120 72 128 86" stroke="#FBBF24" stroke-width="4" stroke-linecap="round" fill="none" />
          ` : `
            <!-- Friendly round eyes -->
            <ellipse cx="80" cy="84" rx="11" ry="12" fill="#06B6D4" />
            <ellipse cx="120" cy="84" rx="11" ry="12" fill="#06B6D4" />
            <!-- Eye highlights -->
            <circle cx="83" cy="81" r="4" fill="#FFFFFF" />
            <circle cx="123" cy="81" r="4" fill="#FFFFFF" />
            <circle cx="77" cy="88" r="2" fill="#FFFFFF" />
            <circle cx="117" cy="88" r="2" fill="#FFFFFF" />
          `}
        </g>

        <!-- Cute Smile -->
        <path d="${isCelebrating ? 'M 90 98 Q 100 110 110 98' : 'M 92 98 Q 100 106 108 98'}" 
              stroke="#06B6D4" stroke-width="3" stroke-linecap="round" fill="none" />

        <!-- Cheeks blush -->
        <circle cx="68" cy="94" r="5" fill="rgba(244, 63, 94, 0.45)" />
        <circle cx="132" cy="94" r="5" fill="rgba(244, 63, 94, 0.45)" />

        <!-- Neck -->
        <rect x="90" y="128" width="20" height="8" rx="4" fill="#64748B" />

        <!-- Body -->
        <rect x="62" y="136" width="76" height="52" rx="18" fill="url(#bodyGrad)" stroke="#818CF8" stroke-width="3" />

        <!-- Chest Core Heart / AI indicator -->
        <circle cx="100" cy="158" r="14" fill="#FBBF24" filter="url(#yellowGlow)" />
        <path d="M 96 158 L 100 152 L 104 158 L 100 164 Z" fill="#1E1B4B" />

        <!-- Left Arm -->
        <g class="sahay-arm-left ${isCelebrating ? 'arm-up-left' : ''}">
          <path d="${isCelebrating ? 'M 62 144 Q 38 126 36 108' : 'M 62 146 Q 44 156 42 174'}" 
                stroke="#4F46E5" stroke-width="10" stroke-linecap="round" fill="none" />
          <circle cx="${isCelebrating ? 36 : 42}" cy="${isCelebrating ? 106 : 176}" r="8" fill="#FBBF24" />
        </g>

        <!-- Right Arm (Waving or Up) -->
        <g class="sahay-arm-right ${isWaving ? 'arm-waving' : isCelebrating ? 'arm-up-right' : ''}">
          <path d="${isWaving ? 'M 138 144 Q 160 120 164 98' : isCelebrating ? 'M 138 144 Q 162 126 164 108' : 'M 138 146 Q 156 156 158 174'}" 
                stroke="#4F46E5" stroke-width="10" stroke-linecap="round" fill="none" />
          <circle cx="${isWaving ? 164 : isCelebrating ? 164 : 158}" cy="${isWaving ? 96 : isCelebrating ? 106 : 176}" r="8" fill="#FBBF24" />
        </g>

        ${isCelebrating ? `
          <!-- Celebration Confetti Particles -->
          <circle cx="30" cy="40" r="4" fill="#FBBF24" />
          <circle cx="170" cy="35" r="5" fill="#10B981" />
          <circle cx="20" cy="80" r="3" fill="#EC4899" />
          <circle cx="180" cy="75" r="4" fill="#06B6D4" />
          <rect x="45" y="25" width="6" height="6" transform="rotate(25 45 25)" fill="#A78BFA" />
          <rect x="155" y="20" width="7" height="7" transform="rotate(-30 155 20)" fill="#FBBF24" />
        ` : ''}
      </svg>
    `;
  },

  /**
   * Mounts Sahay inside container element
   */
  mount(selector, state = 'waving', size = 160) {
    const el = document.querySelector(selector);
    if (el) {
      el.innerHTML = this.getSVG(state, size);
    }
  }
};

// Global attachment
window.SahayMascot = SahayMascot;
