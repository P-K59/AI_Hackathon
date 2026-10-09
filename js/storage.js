/**
 * Storage & Draft Autosave Manager
 * Automatically preserves student form inputs on device localStorage
 * and seamlessly restores progress upon reload.
 */

const HackathonStorage = {
  DRAFT_KEY: 'aihack_registration_draft_v1',
  STEP_KEY: 'aihack_registration_current_step',

  /**
   * Saves partial form draft
   * @param {Object} formData
   */
  saveDraft(formData) {
    try {
      const payload = {
        data: formData,
        timestamp: Date.now()
      };
      localStorage.setItem(this.DRAFT_KEY, JSON.stringify(payload));
      this.triggerSavedIndicator();
      return true;
    } catch (e) {
      console.warn('Could not save draft to local storage:', e);
      return false;
    }
  },

  /**
   * Retrieves saved draft from storage
   * @returns {Object|null}
   */
  loadDraft() {
    try {
      const raw = localStorage.getItem(this.DRAFT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.data || null;
    } catch (e) {
      console.warn('Error reading draft:', e);
      return null;
    }
  },

  /**
   * Clears saved draft after verified successful server submission
   */
  clearDraft() {
    try {
      localStorage.removeItem(this.DRAFT_KEY);
      localStorage.removeItem(this.STEP_KEY);
    } catch (e) {
      console.warn('Could not clear draft:', e);
    }
  },

  /**
   * Remembers the user's current step
   */
  saveCurrentStep(stepNum) {
    try {
      localStorage.setItem(this.STEP_KEY, String(stepNum));
    } catch (e) {}
  },

  /**
   * Retrieves last visited step (defaults to 1)
   */
  loadCurrentStep() {
    try {
      const s = localStorage.getItem(this.STEP_KEY);
      return s ? parseInt(s, 10) : 1;
    } catch (e) {
      return 1;
    }
  },

  /**
   * Checks if an existing draft is present
   */
  hasDraft() {
    return Boolean(localStorage.getItem(this.DRAFT_KEY));
  },

  /**
   * Updates the UI "Saved on this phone" pulse
   */
  triggerSavedIndicator() {
    const el = document.getElementById('autosave-status');
    if (el) {
      el.innerHTML = `
        <span class="autosave-dot"></span>
        <span>Saved on this phone</span>
      `;
      el.style.opacity = '1';
    }
  }
};

window.HackathonStorage = HackathonStorage;
