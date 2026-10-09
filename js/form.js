/**
 * 5-Step Registration Form Controller
 * Fast, mobile-first, student-friendly with live autosave,
 * word count validation, college search, dynamic teammates, and jump-to-edit.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Only initialize on register.html
  if (!document.getElementById('hackathon-form')) return;

  const FormApp = {
    currentStep: 1,
    totalSteps: 5,
    isSubmitting: false,
    settings: null,

    // Time estimate mapping
    timeEstimates: {
      1: "about 5 minutes left",
      2: "about 4 minutes left",
      3: "about 3 minutes left",
      4: "about 2 minutes left",
      5: "about 1 minute left"
    },

    init() {
      this.settings = HackathonAPI.getSettings();
      this.renderDynamicSettings();
      this.bindEvents();
      this.restoreDraft();
      this.updateProgressUI();
      this.setupMascotTip(this.currentStep);
    },

    /**
     * Render dynamic choices loaded from admin settings
     */
    renderDynamicSettings() {
      // 1. Departments in Step 2
      const deptSelect = document.getElementById('field-department');
      if (deptSelect && deptSelect.options.length <= 1) {
        this.settings.departments.forEach(dept => {
          const opt = document.createElement('option');
          opt.value = dept;
          opt.textContent = dept;
          deptSelect.appendChild(opt);
        });
        const otherOpt = document.createElement('option');
        otherOpt.value = 'Other';
        otherOpt.textContent = 'Other (Specify your department)';
        deptSelect.appendChild(otherOpt);
      }

      // 2. Year of study in Step 2
      const yearSelect = document.getElementById('field-year');
      if (yearSelect && yearSelect.options.length <= 1) {
        this.settings.yearsOfStudy.forEach(yr => {
          const opt = document.createElement('option');
          opt.value = yr;
          opt.textContent = yr;
          yearSelect.appendChild(opt);
        });
      }

      // 3. Thematic Tracks in Step 4
      const tracksContainer = document.getElementById('tracks-selection-container');
      if (tracksContainer) {
        tracksContainer.innerHTML = '';
        this.settings.tracks.forEach((track, index) => {
          const isFirst = index === 0;
          const trackHtml = `
            <div class="track-radio-item">
              <input type="radio" name="trackId" id="track_${track.id}" value="${track.id}" ${isFirst ? 'checked' : ''}>
              <label for="track_${track.id}" class="track-radio-label ${track.cssClass}">
                <div class="track-radio-dot"></div>
                <div style="flex:1;">
                  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.25rem;">
                    <strong style="font-size:1.05rem; color:var(--ink);">${track.icon} ${track.name}</strong>
                    <span class="track-badge" style="background:var(--primary-light); color:var(--primary); font-size:0.75rem;">${track.badge}</span>
                  </div>
                  <p style="font-size:0.875rem; color:var(--ink-muted); margin-bottom:0.35rem;">${track.shortDesc}</p>
                  <p style="font-size:0.8rem; color:var(--ink-light); font-style:italic;">${track.example}</p>
                </div>
              </label>
            </div>
          `;
          tracksContainer.insertAdjacentHTML('beforeend', trackHtml);
        });
      }
    },

    bindEvents() {
      // Step Navigation buttons
      const btnNext = document.getElementById('btn-next');
      const btnPrev = document.getElementById('btn-prev');
      const btnSubmit = document.getElementById('btn-submit');

      if (btnNext) {
        btnNext.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleNext();
        });
      }

      if (btnPrev) {
        btnPrev.addEventListener('click', (e) => {
          e.preventDefault();
          this.handlePrev();
        });
      }

      if (btnSubmit) {
        btnSubmit.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleSubmit();
        });
      }

      // Autosave on form input changes
      const form = document.getElementById('hackathon-form');
      form.addEventListener('input', () => {
        this.saveCurrentDraft();
      });
      form.addEventListener('change', () => {
        this.saveCurrentDraft();
      });

      // Step 1: Copy mobile to WhatsApp shortcut
      const btnSameWhatsapp = document.getElementById('btn-same-whatsapp');
      if (btnSameWhatsapp) {
        btnSameWhatsapp.addEventListener('click', () => {
          const mobileVal = document.getElementById('field-mobile').value;
          document.getElementById('field-whatsapp').value = mobileVal;
          this.saveCurrentDraft();
        });
      }

      // Step 2: College in list radio toggle
      const collegeRadios = document.querySelectorAll('input[name="collegeStatus"]');
      collegeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
          const val = e.target.value;
          const searchBox = document.getElementById('college-search-group');
          const customBox = document.getElementById('college-custom-group');
          if (val === 'Yes') {
            searchBox.style.display = 'block';
            customBox.style.display = 'none';
          } else {
            searchBox.style.display = 'none';
            customBox.style.display = 'block';
          }
          this.saveCurrentDraft();
        });
      });

      // Searchable college autocomplete
      this.setupCollegeAutocomplete();

      // Department 'Other' toggle
      const deptSelect = document.getElementById('field-department');
      const deptOtherWrap = document.getElementById('department-other-wrap');
      if (deptSelect && deptOtherWrap) {
        deptSelect.addEventListener('change', () => {
          if (deptSelect.value === 'Other') {
            deptOtherWrap.style.display = 'block';
          } else {
            deptOtherWrap.style.display = 'none';
          }
        });
      }

      // Step 3: Participation Type (Just me vs Team)
      const partRadios = document.querySelectorAll('input[name="participationType"]');
      const teamDetailsWrap = document.getElementById('team-details-wrap');
      partRadios.forEach(r => {
        r.addEventListener('change', (e) => {
          if (e.target.value === 'team') {
            teamDetailsWrap.style.display = 'block';
            // Auto fill leader name from step 1
            const leaderInput = document.getElementById('field-team-leader');
            const step1Name = document.getElementById('field-fullname').value;
            if (leaderInput && step1Name) {
              leaderInput.value = step1Name + " (You)";
            }
          } else {
            teamDetailsWrap.style.display = 'none';
          }
          this.saveCurrentDraft();
        });
      });

      // Add Teammate button
      const btnAddTeammate = document.getElementById('btn-add-teammate');
      if (btnAddTeammate) {
        btnAddTeammate.addEventListener('click', () => {
          this.addTeammateRow();
        });
      }

      // Step 4: Problem title word counter (Max 10 words)
      const titleInput = document.getElementById('field-problem-title');
      const wordCountBadge = document.getElementById('title-word-count');
      if (titleInput && wordCountBadge) {
        const updateWordCount = () => {
          const val = titleInput.value.trim();
          const words = val ? val.split(/\s+/).length : 0;
          wordCountBadge.textContent = `${words} / 10 words`;
          if (words > 10) {
            wordCountBadge.classList.add('limit-reached');
            wordCountBadge.style.color = 'var(--error-rose)';
          } else {
            wordCountBadge.classList.remove('limit-reached');
            wordCountBadge.style.color = 'var(--ink-light)';
          }
        };
        titleInput.addEventListener('input', updateWordCount);
      }

      // Quick "Not sure yet" button for tools
      const btnNotSureTools = document.getElementById('btn-tools-not-sure');
      if (btnNotSureTools) {
        btnNotSureTools.addEventListener('click', () => {
          document.getElementById('field-tools').value = 'Not sure yet';
          this.saveCurrentDraft();
        });
      }

      // Jump to Edit links from Step 5
      document.querySelectorAll('.btn-edit-step').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const targetStep = parseInt(btn.getAttribute('data-target-step'), 10);
          if (targetStep >= 1 && targetStep <= 4) {
            this.goToStep(targetStep);
          }
        });
      });
    },

    /**
     * Searchable college autocomplete dropdown
     */
    setupCollegeAutocomplete() {
      const input = document.getElementById('field-college-search');
      const dropdown = document.getElementById('college-autocomplete-list');
      const hiddenInput = document.getElementById('field-selected-college');
      if (!input || !dropdown) return;

      const colleges = this.settings.colleges;

      const filterColleges = (query) => {
        dropdown.innerHTML = '';
        if (!query.trim()) {
          dropdown.style.display = 'none';
          return;
        }

        const matches = colleges.filter(c => c.toLowerCase().includes(query.toLowerCase()));
        if (matches.length === 0) {
          dropdown.innerHTML = `
            <div class="autocomplete-item" style="color:var(--ink-light); cursor:default;">
              No match in list. Click "No" above to enter your college!
            </div>
          `;
          dropdown.style.display = 'block';
          return;
        }

        matches.slice(0, 8).forEach(match => {
          const item = document.createElement('div');
          item.className = 'autocomplete-item';
          item.textContent = match;
          item.addEventListener('click', () => {
            input.value = match;
            if (hiddenInput) hiddenInput.value = match;
            dropdown.style.display = 'none';
            this.saveCurrentDraft();
          });
          dropdown.appendChild(item);
        });

        dropdown.style.display = 'block';
      };

      input.addEventListener('input', (e) => {
        filterColleges(e.target.value);
        if (hiddenInput) hiddenInput.value = e.target.value;
      });

      input.addEventListener('focus', () => {
        if (input.value) filterColleges(input.value);
      });

      document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.style.display = 'none';
        }
      });
    },

    /**
     * Add teammate row dynamically (respects admin maxTeamSize)
     */
    addTeammateRow(data = {}) {
      const container = document.getElementById('teammates-list-container');
      const currentRows = container.querySelectorAll('.teammate-card').length;
      const maxAllowedTeammates = (this.settings.maxTeamSize || 4) - 1; // excluding leader

      if (currentRows >= maxAllowedTeammates) {
        alert(`Maximum team size is ${this.settings.maxTeamSize} members (Leader + ${maxAllowedTeammates} teammates).`);
        return;
      }

      const rowIdx = currentRows + 1;
      const card = document.createElement('div');
      card.className = 'teammate-card';
      card.innerHTML = `
        <div class="teammate-card-header">
          <span class="teammate-card-title">Teammate ${rowIdx}</span>
          <button type="button" class="btn-remove-teammate">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            Remove
          </button>
        </div>
        <div class="form-row">
          <div class="form-group" style="margin-bottom:0.75rem;">
            <label class="form-label" style="font-size:0.85rem;">Name</label>
            <input type="text" class="form-input tm-name" placeholder="Teammate's full name" value="${data.name || ''}">
          </div>
          <div class="form-group" style="margin-bottom:0.75rem;">
            <label class="form-label" style="font-size:0.85rem;">Email</label>
            <input type="email" class="form-input tm-email" placeholder="Teammate's email" value="${data.email || ''}">
          </div>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:0.85rem;">College</label>
          <input type="text" class="form-input tm-college" placeholder="College name" value="${data.college || ''}">
        </div>
      `;

      card.querySelector('.btn-remove-teammate').addEventListener('click', () => {
        card.remove();
        this.renumberTeammates();
        this.saveCurrentDraft();
      });

      card.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', () => this.saveCurrentDraft());
      });

      container.appendChild(card);
    },

    renumberTeammates() {
      const cards = document.querySelectorAll('.teammate-card');
      cards.forEach((card, idx) => {
        const title = card.querySelector('.teammate-card-title');
        if (title) title.textContent = `Teammate ${idx + 1}`;
      });
    },

    /**
     * Sahay tips for each step
     */
    setupMascotTip(step) {
      const tipBox = document.getElementById('sahay-form-tip-box');
      if (!tipBox) return;

      const tips = {
        1: {
          title: "Hi there! I am Sahay, your guide robot.",
          desc: "We only ask for details to reach you with updates. No government IDs needed!"
        },
        2: {
          title: "All colleges & branches are warmly welcome!",
          desc: "If your college isn't in the list, just type its name. Nobody is rejected for their branch or college."
        },
        3: {
          title: "Solo or Team? Both are equally great!",
          desc: "If you have a team, you can add your buddies now. If registering alone, you get full support too!"
        },
        4: {
          title: "Not sure? Just tell us what you noticed!",
          desc: "You do NOT need a working code or finished prototype. A clear real-world problem and an idea are enough!"
        },
        5: {
          title: "Ready to launch! Double-check your idea.",
          desc: "Click 'Edit' beside any section if you want to polish your answers before submitting."
        }
      };

      const tip = tips[step] || tips[1];
      tipBox.innerHTML = `
        <div class="sahay-tip-icon">
          ${SahayMascot.getSVG(step === 4 ? 'thinking' : 'waving', 36)}
        </div>
        <div class="sahay-tip-text">
          <strong>${tip.title}</strong>
          ${tip.desc}
        </div>
      `;
    },

    /**
     * Validation per step (Friendly, kind messages per brief rules)
     */
    validateStep(step) {
      this.clearAllErrors();
      let isValid = true;

      if (step === 1) {
        const name = document.getElementById('field-fullname');
        if (!name.value.trim()) {
          this.showFieldError('field-fullname', 'Please tell us your full name.');
          isValid = false;
        }

        const email = document.getElementById('field-email');
        if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
          this.showFieldError('field-email', 'Please enter a valid email address so we can send your confirmation.');
          isValid = false;
        }

        const mobile = document.getElementById('field-mobile');
        const cleanMobile = mobile.value.replace(/[\s-]/g, '');
        if (!cleanMobile || !/^[6-9]\d{9}$/.test(cleanMobile)) {
          this.showFieldError('field-mobile', 'Please add a 10-digit mobile number so we can reach you.');
          isValid = false;
        }

        const city = document.getElementById('field-city');
        if (!city.value.trim()) {
          this.showFieldError('field-city', 'Please enter your city or town.');
          isValid = false;
        }

        const state = document.getElementById('field-state');
        if (!state.value.trim()) {
          this.showFieldError('field-state', 'Please enter your state.');
          isValid = false;
        }
      }

      if (step === 2) {
        const collegeStatus = document.querySelector('input[name="collegeStatus"]:checked');
        if (!collegeStatus) {
          this.showFieldError('group-college-status', 'Please select whether your college is in our list.');
          isValid = false;
        } else if (collegeStatus.value === 'Yes') {
          const selected = document.getElementById('field-selected-college');
          const searchInput = document.getElementById('field-college-search');
          if (!searchInput.value.trim()) {
            this.showFieldError('field-college-search', 'Please select your college from the search list.');
            isValid = false;
          }
        } else {
          const customName = document.getElementById('field-custom-college');
          if (!customName.value.trim()) {
            this.showFieldError('field-custom-college', 'Please enter the name of your college.');
            isValid = false;
          }
        }

        const dept = document.getElementById('field-department');
        if (!dept.value) {
          this.showFieldError('field-department', 'Please select your department.');
          isValid = false;
        } else if (dept.value === 'Other') {
          const otherText = document.getElementById('field-department-other');
          if (!otherText.value.trim()) {
            this.showFieldError('field-department-other', 'Please specify your department.');
            isValid = false;
          }
        }

        const year = document.getElementById('field-year');
        if (!year.value) {
          this.showFieldError('field-year', 'Please select your current year of study.');
          isValid = false;
        }
      }

      if (step === 3) {
        const partType = document.querySelector('input[name="participationType"]:checked');
        if (!partType) {
          this.showFieldError('group-part-type', 'Please select whether you are participating alone or with a team.');
          isValid = false;
        } else if (partType.value === 'team') {
          const teamName = document.getElementById('field-team-name');
          if (!teamName.value.trim()) {
            this.showFieldError('field-team-name', 'Please provide a name for your team.');
            isValid = false;
          }
        }
      }

      if (step === 4) {
        const title = document.getElementById('field-problem-title');
        const words = title.value.trim() ? title.value.trim().split(/\s+/).length : 0;
        if (!title.value.trim()) {
          this.showFieldError('field-problem-title', 'Please provide a short problem title.');
          isValid = false;
        } else if (words > 10) {
          this.showFieldError('field-problem-title', 'Problem title must be 10 words or fewer.');
          isValid = false;
        }

        const desc = document.getElementById('field-problem-desc');
        if (!desc.value.trim()) {
          this.showFieldError('field-problem-desc', 'Please explain what problem you noticed and who faces it.');
          isValid = false;
        }

        const trackSelected = document.querySelector('input[name="trackId"]:checked');
        if (!trackSelected) {
          this.showFieldError('tracks-selection-container', 'Please choose the area that fits best.');
          isValid = false;
        }

        const solution = document.getElementById('field-ai-solution');
        if (!solution.value.trim()) {
          this.showFieldError('field-ai-solution', 'Please describe in your own words how AI could help solve this.');
          isValid = false;
        }
      }

      if (step === 5) {
        const declCorrect = document.getElementById('decl-correct');
        const declTerms = document.getElementById('decl-terms');
        const declNoGuar = document.getElementById('decl-no-guarantee');

        if (!declCorrect.checked || !declTerms.checked || !declNoGuar.checked) {
          this.showFieldError('declarations-container', 'Please accept all required participation acknowledgements.');
          isValid = false;
        }
      }

      return isValid;
    },

    showFieldError(fieldId, message) {
      const field = document.getElementById(fieldId);
      if (field) {
        field.classList.add('is-invalid');
      }
      const errBox = document.getElementById(`${fieldId}-error`);
      if (errBox) {
        errBox.textContent = message;
        errBox.classList.add('visible');
      }
    },

    clearAllErrors() {
      document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
      document.querySelectorAll('.field-error-msg').forEach(el => {
        el.textContent = '';
        el.classList.remove('visible');
      });
    },

    handleNext() {
      if (!this.validateStep(this.currentStep)) {
        window.scrollTo({ top: 100, behavior: 'smooth' });
        return;
      }

      if (this.currentStep < this.totalSteps) {
        this.goToStep(this.currentStep + 1);
      }
    },

    handlePrev() {
      if (this.currentStep > 1) {
        this.goToStep(this.currentStep - 1);
      }
    },

    goToStep(stepNum) {
      this.currentStep = stepNum;
      HackathonStorage.saveCurrentStep(stepNum);

      // Hide all cards, show current
      document.querySelectorAll('.form-step-card').forEach((card, idx) => {
        if (idx + 1 === stepNum) {
          card.classList.add('active-step');
        } else {
          card.classList.remove('active-step');
        }
      });

      // Update Top Circuit Progress Bar
      this.updateProgressUI();
      this.setupMascotTip(stepNum);

      // If Step 5, populate the Review Summary cards
      if (stepNum === 5) {
        this.populateReviewSummary();
      }

      // Update Bottom Action Buttons
      const btnPrev = document.getElementById('btn-prev');
      const btnNext = document.getElementById('btn-next');
      const btnSubmit = document.getElementById('btn-submit');

      btnPrev.style.display = stepNum === 1 ? 'none' : 'inline-flex';
      if (stepNum === 5) {
        btnNext.style.display = 'none';
        btnSubmit.style.display = 'inline-flex';
      } else {
        btnNext.style.display = 'inline-flex';
        btnSubmit.style.display = 'none';
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    updateProgressUI() {
      // Step counter and time remaining
      const stepText = document.getElementById('progress-step-text');
      const timeText = document.getElementById('progress-time-text');
      const filledTrack = document.getElementById('circuit-track-filled');

      if (stepText) stepText.textContent = `Step ${this.currentStep} of ${this.totalSteps}`;
      if (timeText) timeText.textContent = this.timeEstimates[this.currentStep] || "";

      // Circuit node states
      document.querySelectorAll('.circuit-node').forEach((node, idx) => {
        const nodeStep = idx + 1;
        node.classList.remove('active', 'completed');
        if (nodeStep < this.currentStep) {
          node.classList.add('completed');
          node.innerHTML = `✓<span class="circuit-node-label">${node.getAttribute('data-label')}</span>`;
        } else if (nodeStep === this.currentStep) {
          node.classList.add('active');
          node.innerHTML = `${nodeStep}<span class="circuit-node-label">${node.getAttribute('data-label')}</span>`;
        } else {
          node.innerHTML = `${nodeStep}<span class="circuit-node-label">${node.getAttribute('data-label')}</span>`;
        }
      });

      // Track width percentage
      if (filledTrack) {
        const percent = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
        filledTrack.style.width = `${percent}%`;
      }
    },

    /**
     * Populate Step 5 Review Summary
     */
    populateReviewSummary() {
      const data = this.gatherFormData();
      const settings = this.settings;

      // Section 1: About You
      document.getElementById('rev-name').textContent = data.fullName || '—';
      document.getElementById('rev-email').textContent = data.email || '—';
      document.getElementById('rev-mobile').textContent = data.mobile || '—';
      document.getElementById('rev-location').textContent = `${data.city || '—'}, ${data.state || '—'}`;

      // Section 2: College
      const collegeDisplay = data.collegeStatus === 'Yes' 
        ? (data.selectedCollege || data.collegeSearch || '—')
        : (data.customCollegeName || '—');
      document.getElementById('rev-college').textContent = collegeDisplay;
      document.getElementById('rev-dept').textContent = data.department === 'Other' ? data.departmentOther : data.department;
      document.getElementById('rev-year').textContent = data.yearOfStudy || '—';
      const mentorEl = document.getElementById('rev-mentor');
      if (mentorEl) mentorEl.textContent = data.facultyName || 'None specified';

      // Section 3: Team
      const isTeam = data.participationType === 'team';
      document.getElementById('rev-part-type').textContent = isTeam ? `Team (${data.teamName})` : 'Solo Participant';
      const tmDisplay = isTeam && data.teammates && data.teammates.length > 0 
        ? data.teammates.map(t => `${t.name} (${t.email})`).join(', ')
        : 'Just you';
      document.getElementById('rev-teammates').textContent = tmDisplay;

      // Section 4: Idea
      document.getElementById('rev-title').textContent = data.problemTitle || '—';
      const trackObj = settings.tracks.find(t => t.id === data.trackId);
      document.getElementById('rev-track').textContent = trackObj ? `${trackObj.icon} ${trackObj.name}` : data.trackId;
      document.getElementById('rev-problem').textContent = data.problemDesc || '—';
      document.getElementById('rev-solution').textContent = data.aiSolution || '—';
    },

    /**
     * Harvest all form fields into a unified object
     */
    gatherFormData() {
      const form = document.getElementById('hackathon-form');
      const fd = new FormData(form);

      const teammates = [];
      document.querySelectorAll('.teammate-card').forEach(card => {
        const name = card.querySelector('.tm-name')?.value?.trim();
        const email = card.querySelector('.tm-email')?.value?.trim();
        const college = card.querySelector('.tm-college')?.value?.trim();
        if (name || email) {
          teammates.push({ name, email, college });
        }
      });

      return {
        fullName: document.getElementById('field-fullname')?.value || '',
        email: document.getElementById('field-email')?.value || '',
        mobile: document.getElementById('field-mobile')?.value || '',
        whatsapp: document.getElementById('field-whatsapp')?.value || '',
        city: document.getElementById('field-city')?.value || '',
        state: document.getElementById('field-state')?.value || '',
        rollNumber: document.getElementById('field-roll')?.value || '',
        linkedin: document.getElementById('field-linkedin')?.value || '',
        github: document.getElementById('field-github')?.value || '',
        gender: document.getElementById('field-gender')?.value || 'Prefer not to say',

        collegeStatus: form.querySelector('input[name="collegeStatus"]:checked')?.value || 'Yes',
        collegeSearch: document.getElementById('field-college-search')?.value || '',
        selectedCollege: document.getElementById('field-selected-college')?.value || '',
        customCollegeName: document.getElementById('field-custom-college')?.value || '',
        collegeCity: document.getElementById('field-custom-city')?.value || '',
        department: document.getElementById('field-department')?.value || '',
        departmentOther: document.getElementById('field-department-other')?.value || '',
        yearOfStudy: document.getElementById('field-year')?.value || '',
        degreeCourse: document.getElementById('field-degree')?.value || '',
        facultyName: document.getElementById('field-faculty-name')?.value || '',
        facultyEmail: document.getElementById('field-faculty-email')?.value || '',

        participationType: form.querySelector('input[name="participationType"]:checked')?.value || 'single',
        teamName: document.getElementById('field-team-name')?.value || '',
        teammates: teammates,

        problemTitle: document.getElementById('field-problem-title')?.value || '',
        problemDesc: document.getElementById('field-problem-desc')?.value || '',
        trackId: form.querySelector('input[name="trackId"]:checked')?.value || 'social_impact',
        aiSolution: document.getElementById('field-ai-solution')?.value || '',
        problemOrigin: document.getElementById('field-problem-origin')?.value || '',
        whyItMatters: document.getElementById('field-why-matters')?.value || '',
        currentAlternatives: document.getElementById('field-current-alt')?.value || '',
        expectedOutcome: document.getElementById('field-expected-outcome')?.value || '',
        progressStage: document.getElementById('field-stage')?.value || 'Idea stage only',
        toolsPlanned: document.getElementById('field-tools')?.value || 'Not sure yet',
        projectLinks: document.getElementById('field-project-links')?.value || '',

        declCorrect: document.getElementById('decl-correct')?.checked || false,
        declTerms: document.getElementById('decl-terms')?.checked || false,
        declNoGuarantee: document.getElementById('decl-no-guarantee')?.checked || false,
        publicityConsent: document.getElementById('decl-photo')?.checked || false
      };
    },

    saveCurrentDraft() {
      const data = this.gatherFormData();
      HackathonStorage.saveDraft(data);
    },

    restoreDraft() {
      const draft = HackathonStorage.loadDraft();
      if (!draft) return;

      // Populate Step 1
      if (draft.fullName) document.getElementById('field-fullname').value = draft.fullName;
      if (draft.email) document.getElementById('field-email').value = draft.email;
      if (draft.mobile) document.getElementById('field-mobile').value = draft.mobile;
      if (draft.whatsapp) document.getElementById('field-whatsapp').value = draft.whatsapp;
      if (draft.city) document.getElementById('field-city').value = draft.city;
      if (draft.state) document.getElementById('field-state').value = draft.state;
      if (draft.rollNumber) document.getElementById('field-roll').value = draft.rollNumber;
      if (draft.linkedin) document.getElementById('field-linkedin').value = draft.linkedin;
      if (draft.github) document.getElementById('field-github').value = draft.github;
      if (draft.gender) document.getElementById('field-gender').value = draft.gender;

      // Step 2
      if (draft.collegeStatus) {
        const rad = document.querySelector(`input[name="collegeStatus"][value="${draft.collegeStatus}"]`);
        if (rad) {
          rad.checked = true;
          rad.dispatchEvent(new Event('change'));
        }
      }
      if (draft.selectedCollege || draft.collegeSearch) {
        const cVal = draft.selectedCollege || draft.collegeSearch;
        document.getElementById('field-college-search').value = cVal;
        document.getElementById('field-selected-college').value = cVal;
      }
      if (draft.customCollegeName) document.getElementById('field-custom-college').value = draft.customCollegeName;
      if (draft.collegeCity) document.getElementById('field-custom-city').value = draft.collegeCity;
      if (draft.department) {
        const dSelect = document.getElementById('field-department');
        dSelect.value = draft.department;
        dSelect.dispatchEvent(new Event('change'));
      }
      if (draft.departmentOther) document.getElementById('field-department-other').value = draft.departmentOther;
      if (draft.yearOfStudy) document.getElementById('field-year').value = draft.yearOfStudy;
      if (draft.degreeCourse) document.getElementById('field-degree').value = draft.degreeCourse;
      if (draft.facultyName) document.getElementById('field-faculty-name').value = draft.facultyName;
      if (draft.facultyEmail) document.getElementById('field-faculty-email').value = draft.facultyEmail;

      // Step 3
      if (draft.participationType) {
        const pRad = document.querySelector(`input[name="participationType"][value="${draft.participationType}"]`);
        if (pRad) {
          pRad.checked = true;
          pRad.dispatchEvent(new Event('change'));
        }
      }
      if (draft.teamName) document.getElementById('field-team-name').value = draft.teamName;
      if (draft.teammates && draft.teammates.length > 0) {
        document.getElementById('teammates-list-container').innerHTML = '';
        draft.teammates.forEach(tm => this.addTeammateRow(tm));
      }

      // Step 4
      if (draft.problemTitle) {
        const tInput = document.getElementById('field-problem-title');
        tInput.value = draft.problemTitle;
        tInput.dispatchEvent(new Event('input'));
      }
      if (draft.problemDesc) document.getElementById('field-problem-desc').value = draft.problemDesc;
      if (draft.trackId) {
        const tRad = document.querySelector(`input[name="trackId"][value="${draft.trackId}"]`);
        if (tRad) tRad.checked = true;
      }
      if (draft.aiSolution) document.getElementById('field-ai-solution').value = draft.aiSolution;
      if (draft.problemOrigin) document.getElementById('field-problem-origin').value = draft.problemOrigin;
      if (draft.whyItMatters) document.getElementById('field-why-matters').value = draft.whyItMatters;
      if (draft.currentAlternatives) document.getElementById('field-current-alt').value = draft.currentAlternatives;
      if (draft.expectedOutcome) document.getElementById('field-expected-outcome').value = draft.expectedOutcome;
      if (draft.progressStage) document.getElementById('field-stage').value = draft.progressStage;
      if (draft.toolsPlanned) document.getElementById('field-tools').value = draft.toolsPlanned;
      if (draft.projectLinks) document.getElementById('field-project-links').value = draft.projectLinks;

      // Step 5
      if (draft.declCorrect) document.getElementById('decl-correct').checked = draft.declCorrect;
      if (draft.declTerms) document.getElementById('decl-terms').checked = draft.declTerms;
      if (draft.declNoGuarantee) document.getElementById('decl-no-guarantee').checked = draft.declNoGuarantee;
      if (draft.publicityConsent) document.getElementById('decl-photo').checked = draft.publicityConsent;

      // Restore saved step if valid
      const savedStep = HackathonStorage.loadCurrentStep();
      if (savedStep > 1 && savedStep <= 5) {
        this.goToStep(savedStep);
      }
    },

    /**
     * Final Submission Handler:
     * Prevents double-taps, sends payload to server function, clears draft only on verified success.
     */
    async handleSubmit() {
      if (this.isSubmitting) return; // Anti-double tap lock

      if (!this.validateStep(5)) {
        window.scrollTo({ top: 300, behavior: 'smooth' });
        return;
      }

      this.isSubmitting = true;
      const btnSubmit = document.getElementById('btn-submit');
      const originalText = btnSubmit.innerHTML;
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `
        <span style="display:inline-block; animation:spin 1s linear infinite;">⏳</span>
        Confirming Registration...
      `;

      try {
        const payload = this.gatherFormData();
        const response = await HackathonAPI.submitRegistration(payload);

        if (response.success) {
          // Clear local draft only AFTER verified server persistence
          HackathonStorage.clearDraft();

          // Store temporary ticket data in sessionStorage for instant confirmation rendering
          sessionStorage.setItem('aihack_latest_ticket', JSON.stringify({
            registrationId: response.registrationId,
            fullName: payload.fullName,
            college: payload.collegeStatus === 'Yes' ? (payload.selectedCollege || payload.collegeSearch) : payload.customCollegeName,
            participationType: payload.participationType,
            teamName: payload.teamName,
            problemTitle: payload.problemTitle,
            trackName: payload.trackId,
            submittedAt: new Date().toISOString()
          }));

          // Redirect to confirmation page
          window.location.href = `confirmation.html?id=${response.registrationId}`;
        } else {
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = originalText;
          this.isSubmitting = false;

          if (response.isDuplicate) {
            alert(response.errors[0]);
            window.location.href = `status.html?id=${response.existingId}`;
          } else {
            alert('Submission error:\n• ' + response.errors.join('\n• '));
          }
        }
      } catch (err) {
        console.error('Submission failed:', err);
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;
        this.isSubmitting = false;
        alert('A network error occurred while reaching the server. Your draft is safely preserved on this phone. Please tap Submit again.');
      }
    }
  };

  FormApp.init();
});
