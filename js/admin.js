/**
 * Admin & Evaluation Dashboard Controller
 * Full Role-Based Access Control (RBAC):
 * - Admin: Full access to Submissions, Rubrics, Shortlist Declaration, Judge Account Creation, Event Settings & Audit Logs.
 * - Judge: Restricted solely to Submissions review and Rubric evaluation scoring.
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('admin-dashboard-app')) return;

  const AdminApp = {
    currentTab: 'submissions', // 'submissions', 'shortlist', 'judges', 'settings', 'audit'
    activeSubmissions: [],
    filteredSubmissions: [],
    currentPage: 1,
    pageSize: 8,
    selectedSubmissionId: null,
    currentUser: null,

    init() {
      HackathonAPI.init();
      this.checkAuth();
      this.bindEvents();
      this.refreshData();
    },

    checkAuth() {
      const session = HackathonAPI.getCurrentSession();
      const mainDashboard = document.getElementById('admin-main-dashboard');
      const loginModal = document.getElementById('admin-login-modal');
      const logoutBtn = document.getElementById('btn-logout');
      const roleBadge = document.getElementById('role-badge-slot');

      if (session) {
        this.currentUser = session;
        if (loginModal) loginModal.classList.remove('open');
        if (mainDashboard) mainDashboard.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'inline-flex';
        this.applyRolePermissions();
      } else {
        this.currentUser = null;
        if (mainDashboard) mainDashboard.style.display = 'none';
        if (loginModal) loginModal.classList.add('open');
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (roleBadge) roleBadge.style.display = 'none';
        document.getElementById('admin-user-display').textContent = `Sign In Required`;
      }
    },

    applyRolePermissions() {
      if (!this.currentUser) return;

      const isAdmin = this.currentUser.role === 'SuperAdmin';
      const isJudge = this.currentUser.role === 'Judge';

      // Update Header & Badge
      const userDisplay = document.getElementById('admin-user-display');
      const roleBadge = document.getElementById('role-badge-slot');
      const headerTitle = document.getElementById('portal-header-title');

      if (userDisplay) userDisplay.textContent = this.currentUser.name;
      if (roleBadge) {
        roleBadge.style.display = 'inline-flex';
        roleBadge.className = `role-indicator-badge ${isAdmin ? 'role-superadmin' : 'role-judge'}`;
        roleBadge.textContent = isAdmin ? 'Super Admin' : 'Judge / Evaluator';
      }
      if (headerTitle) {
        headerTitle.textContent = isAdmin ? 'Admin Operations' : 'Judge Evaluation Portal';
      }

      // Hide/Show Admin-only Tabs & Features
      document.querySelectorAll('.admin-only-tab').forEach(el => {
        el.style.display = isAdmin ? 'inline-flex' : 'none';
      });

      document.querySelectorAll('.admin-only-feature').forEach(el => {
        el.style.display = isAdmin ? 'block' : 'none';
      });

      // If Judge is on an admin-only tab, force back to submissions
      if (isJudge && this.currentTab !== 'submissions') {
        this.switchTab('submissions');
      }
    },

    handleLogin(identifier, password) {
      const errorBox = document.getElementById('login-error-box');
      errorBox.style.display = 'none';

      const result = HackathonAPI.authenticateUser(identifier, password);
      if (result.success) {
        this.currentUser = result.user;
        document.getElementById('admin-login-modal').classList.remove('open');
        document.getElementById('admin-main-dashboard').style.display = 'block';
        document.getElementById('btn-logout').style.display = 'inline-flex';
        this.applyRolePermissions();
        this.refreshData();
      } else {
        errorBox.textContent = result.message || 'Authentication failed. Please check credentials.';
        errorBox.style.display = 'block';
      }
    },

    logout() {
      HackathonAPI.logoutUser();
      this.currentUser = null;
      document.getElementById('admin-main-dashboard').style.display = 'none';
      document.getElementById('btn-logout').style.display = 'none';
      const roleBadge = document.getElementById('role-badge-slot');
      if (roleBadge) roleBadge.style.display = 'none';
      document.getElementById('admin-user-display').textContent = 'Sign In Required';
      document.getElementById('admin-login-modal').classList.add('open');
    },

    bindEvents() {
      // 1. Login Form
      const loginForm = document.getElementById('form-admin-login');
      if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const id = document.getElementById('login-admin-id').value;
          const pass = document.getElementById('login-admin-pass').value;
          this.handleLogin(id, pass);
        });
      }

      // Password visibility toggle
      const passToggle = document.getElementById('btn-toggle-password');
      if (passToggle) {
        passToggle.addEventListener('click', () => {
          const passInput = document.getElementById('login-admin-pass');
          if (passInput.type === 'password') {
            passInput.type = 'text';
            passToggle.textContent = 'Hide';
          } else {
            passInput.type = 'password';
            passToggle.textContent = 'Show';
          }
        });
      }

      // Logout
      document.getElementById('btn-logout')?.addEventListener('click', () => this.logout());

      // 2. Tabs
      document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetTab = btn.getAttribute('data-tab');
          if (this.currentUser?.role === 'Judge' && targetTab !== 'submissions') {
            alert('Judges only have access to the Submissions & Evaluation workspace.');
            return;
          }

          document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentTab = targetTab;
          this.switchTab(this.currentTab);
        });
      });

      // 3. Shortlist publication actions (Admin only)
      document.getElementById('btn-declare-shortlist')?.addEventListener('click', () => {
        if (this.currentUser?.role !== 'SuperAdmin') return;
        HackathonAPI.toggleShortlistPublication(true, this.currentUser.name);
        this.renderShortlistControls();
        alert('Shortlist results have been declared and are now live on the main portal.');
      });

      document.getElementById('btn-unpublish-shortlist')?.addEventListener('click', () => {
        if (this.currentUser?.role !== 'SuperAdmin') return;
        HackathonAPI.toggleShortlistPublication(false, this.currentUser.name);
        this.renderShortlistControls();
        alert('Shortlist results are now hidden from the main portal (set to draft mode).');
      });

      document.getElementById('btn-toggle-shortlist-quick')?.addEventListener('click', () => {
        if (this.currentUser?.role !== 'SuperAdmin') return;
        const current = HackathonAPI.isShortlistDeclared();
        HackathonAPI.toggleShortlistPublication(!current, this.currentUser.name);
        this.renderShortlistControls();
        alert(`Shortlist status toggled: ${!current ? 'Declared & Live' : 'Draft / Hidden from Students'}`);
      });

      document.getElementById('btn-quick-download-shortlist')?.addEventListener('click', () => {
        HackathonAPI.downloadShortlistCSV(true);
      });

      document.getElementById('btn-download-shortlist-tab')?.addEventListener('click', () => {
        HackathonAPI.downloadShortlistCSV(true);
      });

      // 4. Create Judge Account Form (Admin only)
      document.getElementById('form-create-judge')?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (this.currentUser?.role !== 'SuperAdmin') return;

        const judgeId = document.getElementById('new-judge-id').value.trim();
        const judgeName = document.getElementById('new-judge-name').value.trim();
        const judgePass = document.getElementById('new-judge-pass').value.trim();

        const res = HackathonAPI.createJudgeAccount(judgeId, judgeName, judgePass, this.currentUser.name);
        if (res.success) {
          alert(`✅ Judge login '${judgeId}' created successfully!`);
          document.getElementById('new-judge-id').value = '';
          document.getElementById('new-judge-name').value = '';
          document.getElementById('new-judge-pass').value = '';
          this.renderJudgesList();
        } else {
          alert(`Error: ${res.message}`);
        }
      });

      // 5. Table search & filters
      document.getElementById('admin-search')?.addEventListener('input', () => this.applyFilters());
      document.getElementById('filter-track')?.addEventListener('change', () => this.applyFilters());
      document.getElementById('filter-status')?.addEventListener('change', () => this.applyFilters());
      document.getElementById('filter-type')?.addEventListener('change', () => this.applyFilters());

      // 6. Pagination
      document.getElementById('btn-page-prev')?.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.renderTable();
        }
      });
      document.getElementById('btn-page-next')?.addEventListener('click', () => {
        const maxPage = Math.ceil(this.filteredSubmissions.length / this.pageSize) || 1;
        if (this.currentPage < maxPage) {
          this.currentPage++;
          this.renderTable();
        }
      });

      // 7. CSV Export (Admin only)
      document.getElementById('btn-export-csv')?.addEventListener('click', () => {
        if (this.currentUser?.role !== 'SuperAdmin') return;
        this.exportCSV();
      });

      // 8. Detail Evaluation Modal
      document.getElementById('btn-close-eval-modal')?.addEventListener('click', () => {
        document.getElementById('evaluation-modal').classList.remove('open');
      });

      // Evaluation rubric inputs live total
      const rubricInputs = document.querySelectorAll('.rubric-input');
      rubricInputs.forEach(input => {
        input.addEventListener('input', () => this.updateRubricLiveScore());
      });

      // Save Evaluation
      document.getElementById('btn-save-evaluation')?.addEventListener('click', () => this.saveEvaluation());

      // Open Edit from Evaluation Modal
      document.getElementById('btn-open-edit-from-modal')?.addEventListener('click', () => {
        if (this.selectedSubmissionId) {
          this.openEditModal(this.selectedSubmissionId);
        }
      });

      // Delete from Evaluation Modal
      document.getElementById('btn-delete-from-modal')?.addEventListener('click', () => {
        if (this.selectedSubmissionId) {
          this.confirmDeleteParticipant(this.selectedSubmissionId);
        }
      });

      // Edit Participant Modal Close / Cancel
      document.getElementById('btn-close-edit-modal')?.addEventListener('click', () => {
        document.getElementById('edit-participant-modal').classList.remove('open');
      });
      document.getElementById('btn-cancel-edit-modal')?.addEventListener('click', () => {
        document.getElementById('edit-participant-modal').classList.remove('open');
      });

      // Edit Participant Form Submit
      document.getElementById('form-edit-participant')?.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveEditParticipant();
      });

      // Save Admin Settings
      document.getElementById('form-admin-settings')?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (this.currentUser?.role !== 'SuperAdmin') return;
        this.saveSettings();
      });

      // Change Admin Password Form
      document.getElementById('form-change-password')?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (this.currentUser?.role !== 'SuperAdmin') return;
        const newPass = document.getElementById('pwd-new-password').value;
        const res = HackathonAPI.updatePassword('admin', newPass, this.currentUser.name);
        if (res.success) {
          alert(`Admin password successfully updated.`);
          document.getElementById('pwd-new-password').value = '';
        } else {
          alert(res.message);
        }
      });
    },

    switchTab(tab) {
      document.getElementById('tab-submissions').style.display = tab === 'submissions' ? 'block' : 'none';
      document.getElementById('tab-shortlist').style.display = tab === 'shortlist' ? 'block' : 'none';
      document.getElementById('tab-judges').style.display = tab === 'judges' ? 'block' : 'none';
      document.getElementById('tab-settings').style.display = tab === 'settings' ? 'block' : 'none';
      document.getElementById('tab-audit').style.display = tab === 'audit' ? 'block' : 'none';

      if (tab === 'shortlist') this.renderShortlistTab();
      if (tab === 'judges') this.renderJudgesList();
      if (tab === 'settings') this.renderSettingsForm();
      if (tab === 'audit') this.renderAuditLogs();
    },

    refreshData() {
      this.activeSubmissions = HackathonAPI.getAllSubmissions();
      this.populateTrackFilters();
      this.renderStats();
      this.renderCharts();
      this.renderShortlistControls();
      this.applyFilters();
    },

    renderShortlistControls() {
      const isDeclared = HackathonAPI.isShortlistDeclared();
      const settings = HackathonAPI.getSettings();
      
      const badge = document.getElementById('shortlist-status-badge');
      if (badge) {
        badge.textContent = isDeclared ? 'Shortlist Declared (Live to Students)' : 'Shortlist Pending (Draft / Hidden)';
        badge.style.background = isDeclared ? 'var(--accent-mint)' : 'var(--accent-yellow)';
        badge.style.color = isDeclared ? '#064E3B' : '#78350F';
      }

      const tabBadge = document.getElementById('shortlist-tab-badge');
      if (tabBadge) {
        tabBadge.textContent = isDeclared ? 'Status: Declared & Live to Students' : 'Status: Draft / Hidden from Students';
        tabBadge.style.background = isDeclared ? 'var(--accent-mint-light)' : '#FEF3C7';
        tabBadge.style.color = isDeclared ? '#065F46' : '#92400E';
      }

      const tabDate = document.getElementById('shortlist-tab-date');
      if (tabDate) {
        tabDate.textContent = isDeclared ? `Declared on ${settings.shortlistPublishDate}` : 'Pending Declaration';
      }
    },

    renderShortlistTab() {
      this.renderShortlistControls();
      const shortlisted = HackathonAPI.getShortlistedSubmissions();
      
      const countEl = document.getElementById('shortlist-tab-count');
      if (countEl) countEl.textContent = `${shortlisted.length} Projects`;

      const tbody = document.getElementById('shortlist-preview-tbody');
      if (!tbody) return;

      if (shortlisted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--ink-light);">No candidates currently marked as Shortlisted or Finalist Confirmed.</td></tr>';
        return;
      }

      tbody.innerHTML = shortlisted.map(s => {
        const score = s.evaluation?.totalScore ? `${s.evaluation.totalScore}/60` : '—';
        return `
          <tr>
            <td><strong style="font-family:monospace; color:var(--primary);">${s.registrationId}</strong></td>
            <td>
              <div style="font-weight:700;">${s.participationType === 'team' ? s.teamName : s.fullName}</div>
              <div style="font-size:0.8rem; color:var(--ink-light);">${s.fullName} (${s.participationType})</div>
            </td>
            <td>
              <div style="font-size:0.85rem;">${s.collegeName}</div>
              <div style="font-size:0.75rem; color:var(--ink-light);">${s.department}</div>
            </td>
            <td>
              <span class="track-badge" style="background:var(--primary-light); color:var(--primary); font-size:0.75rem;">${s.trackBadge || s.trackId}</span>
            </td>
            <td>
              <strong style="color:var(--primary);">${score}</strong>
            </td>
          </tr>
        `;
      }).join('');
    },

    renderJudgesList() {
      const judges = HackathonAPI.listJudgeAccounts();
      const tbody = document.getElementById('judges-list-tbody');
      if (!tbody) return;

      if (judges.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--ink-light);">No custom judge accounts created yet.</td></tr>';
        return;
      }

      tbody.innerHTML = judges.map(j => `
        <tr>
          <td><strong style="font-family:monospace; color:var(--primary);">${j.id}</strong></td>
          <td><div style="font-weight:700;">${j.name}</div></td>
          <td><span class="role-indicator-badge role-judge">${j.role}</span></td>
          <td><code style="background:#F1F5F9; padding:2px 6px; border-radius:4px;">${j.password}</code></td>
          <td>
            <button type="button" class="btn btn-secondary btn-sm btn-delete-judge" data-id="${j.id}" style="color:var(--error-rose); border-color:#FECDD3;">
              Delete
            </button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('.btn-delete-judge').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          if (confirm(`Are you sure you want to delete judge account '${id}'?`)) {
            HackathonAPI.deleteJudgeAccount(id, this.currentUser.name);
            this.renderJudgesList();
          }
        });
      });
    },

    populateTrackFilters() {
      const select = document.getElementById('filter-track');
      if (!select) return;
      const settings = HackathonAPI.getSettings();
      select.innerHTML = '<option value="">All Tracks</option>';
      settings.tracks.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        select.appendChild(opt);
      });
    },

    renderStats() {
      const subs = this.activeSubmissions;
      const total = subs.length;
      const teams = subs.filter(s => s.participationType === 'team').length;
      const solo = total - teams;
      const shortlisted = subs.filter(s => s.status === 'Shortlisted' || s.status === 'Finalist Confirmed').length;
      const colleges = new Set(subs.map(s => s.collegeName)).size;

      document.getElementById('stat-total-reg').textContent = total;
      document.getElementById('stat-teams-count').textContent = `${teams} teams (${solo} solo)`;
      document.getElementById('stat-shortlisted-count').textContent = shortlisted;
      document.getElementById('stat-colleges-count').textContent = colleges;
    },

    renderCharts() {
      const subs = this.activeSubmissions;
      const settings = HackathonAPI.getSettings();

      // 1. Chart: Submissions by Track
      const trackCounts = {};
      settings.tracks.forEach(t => trackCounts[t.id] = 0);
      subs.forEach(s => {
        if (trackCounts[s.trackId] !== undefined) trackCounts[s.trackId]++;
      });

      const maxTrackVal = Math.max(...Object.values(trackCounts), 1);
      const trackChartEl = document.getElementById('chart-track-bars');
      if (trackChartEl) {
        trackChartEl.innerHTML = settings.tracks.map(t => {
          const count = trackCounts[t.id] || 0;
          const percent = Math.round((count / maxTrackVal) * 100);
          return `
            <div style="margin-bottom: 0.85rem;">
              <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:700; margin-bottom:0.25rem;">
                <span>${t.icon} ${t.badge}</span>
                <span style="color:var(--primary);">${count} entries</span>
              </div>
              <div style="height:12px; background:#E2E8F0; border-radius:6px; overflow:hidden;">
                <div style="height:100%; width:${percent}%; background:var(--primary); border-radius:6px; transition:width 0.4s ease;"></div>
              </div>
            </div>
          `;
        }).join('');
      }

      // 2. Chart: Status Funnel
      const statuses = ['Submitted', 'Under Review', 'Shortlisted', 'Finalist Confirmed', 'Not Shortlisted'];
      const statusCounts = {};
      statuses.forEach(st => statusCounts[st] = 0);
      subs.forEach(s => {
        if (statusCounts[s.status] !== undefined) statusCounts[s.status]++;
      });

      const maxStatusVal = Math.max(...Object.values(statusCounts), 1);
      const statusChartEl = document.getElementById('chart-status-bars');
      if (statusChartEl) {
        statusChartEl.innerHTML = statuses.map(st => {
          const count = statusCounts[st] || 0;
          const percent = Math.round((count / maxStatusVal) * 100);
          const color = st === 'Shortlisted' ? 'var(--accent-mint)' : st === 'Under Review' ? 'var(--accent-yellow)' : 'var(--accent-cyan)';
          return `
            <div style="margin-bottom: 0.85rem;">
              <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:700; margin-bottom:0.25rem;">
                <span>${st}</span>
                <span style="color:${color};">${count}</span>
              </div>
              <div style="height:12px; background:#E2E8F0; border-radius:6px; overflow:hidden;">
                <div style="height:100%; width:${percent}%; background:${color}; border-radius:6px; transition:width 0.4s ease;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    },

    applyFilters() {
      const search = (document.getElementById('admin-search')?.value || '').toLowerCase().trim();
      const trackFilter = document.getElementById('filter-track')?.value || '';
      const statusFilter = document.getElementById('filter-status')?.value || '';
      const typeFilter = document.getElementById('filter-type')?.value || '';

      this.filteredSubmissions = this.activeSubmissions.filter(s => {
        const matchSearch = !search || 
          s.registrationId.toLowerCase().includes(search) ||
          s.fullName.toLowerCase().includes(search) ||
          s.email.toLowerCase().includes(search) ||
          s.collegeName.toLowerCase().includes(search) ||
          s.problemTitle.toLowerCase().includes(search) ||
          (s.teamName && s.teamName.toLowerCase().includes(search));

        const matchTrack = !trackFilter || s.trackId === trackFilter;
        const matchStatus = !statusFilter || s.status === statusFilter;
        const matchType = !typeFilter || s.participationType === typeFilter;

        return matchSearch && matchTrack && matchStatus && matchType;
      });

      this.currentPage = 1;
      this.renderTable();
    },

    renderTable() {
      const tbody = document.getElementById('admin-table-body');
      if (!tbody) return;

      const total = this.filteredSubmissions.length;
      const start = (this.currentPage - 1) * this.pageSize;
      const end = Math.min(start + this.pageSize, total);
      const pageItems = this.filteredSubmissions.slice(start, end);

      document.getElementById('table-showing-text').textContent = total > 0 
        ? `Showing ${start + 1}–${end} of ${total} registrations`
        : 'No matching registrations found';

      const maxPage = Math.ceil(total / this.pageSize) || 1;
      document.getElementById('btn-page-prev').disabled = this.currentPage <= 1;
      document.getElementById('btn-page-next').disabled = this.currentPage >= maxPage;

      if (pageItems.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center; padding:3rem 1rem; color:var(--ink-light);">
              No submissions match the current filter criteria.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = pageItems.map(s => {
        const statusClass = s.status.toLowerCase().replace(/\s+/g, '_');
        const score = s.evaluation?.totalScore ? `${s.evaluation.totalScore}/60` : '—';
        const typeBadge = s.participationType === 'team' 
          ? `<span style="font-size:0.75rem; background:#E0E7FF; color:#4338CA; padding:2px 6px; border-radius:4px; font-weight:700;">Team (${s.teamMembers?.length + 1 || 1})</span>`
          : `<span style="font-size:0.75rem; background:#F1F5F9; color:#475569; padding:2px 6px; border-radius:4px; font-weight:700;">Solo</span>`;

        return `
          <tr>
            <td>
              <strong style="font-family:monospace; color:var(--primary); font-size:0.9rem;">${s.registrationId}</strong>
              <div style="font-size:0.75rem; color:var(--ink-light);">${new Date(s.submittedAt).toLocaleDateString()}</div>
            </td>
            <td>
              <div style="font-weight:700; color:var(--ink);">${s.fullName}</div>
              <div style="font-size:0.8rem; color:var(--ink-muted);">${s.email}</div>
              <div style="margin-top:2px;">${typeBadge}</div>
            </td>
            <td>
              <div style="font-weight:600; font-size:0.875rem;">${s.collegeName}</div>
              <div style="font-size:0.775rem; color:var(--ink-light);">${s.department} (${s.yearOfStudy?.split(' ')[0] || ''})</div>
            </td>
            <td>
              <span class="track-badge" style="background:var(--primary-light); color:var(--primary); font-size:0.75rem;">${s.trackBadge || s.trackId}</span>
              <div style="font-size:0.825rem; font-weight:600; color:var(--ink); margin-top:3px; max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${s.problemTitle}">
                ${s.problemTitle}
              </div>
            </td>
            <td>
              <span class="status-chip ${statusClass}">${s.status}</span>
            </td>
            <td>
              <strong style="font-size:0.95rem; color:${score !== '—' ? 'var(--primary)' : 'var(--ink-light)'};">${score}</strong>
            </td>
            <td>
              <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
                <button type="button" class="btn btn-outline btn-sm btn-open-eval" data-id="${s.registrationId}" title="Evaluate / Details">
                  Evaluate
                </button>
                ${this.currentUser?.role === 'SuperAdmin' ? `
                  <button type="button" class="btn btn-secondary btn-sm btn-edit-sub" data-id="${s.registrationId}" title="Edit Participant Info" style="padding:4px 8px;">
                    ✏️
                  </button>
                  <button type="button" class="btn btn-outline btn-sm btn-delete-sub" data-id="${s.registrationId}" title="Delete Participant" style="padding:4px 8px; color:#DC2626; border-color:#FECDD3;">
                    🗑️
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.btn-open-eval').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openEvaluationModal(id);
        });
      });

      tbody.querySelectorAll('.btn-edit-sub').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.openEditModal(id);
        });
      });

      tbody.querySelectorAll('.btn-delete-sub').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          this.confirmDeleteParticipant(id);
        });
      });
    },

    openEvaluationModal(regId) {
      const s = this.activeSubmissions.find(sub => sub.registrationId === regId);
      if (!s) return;
      this.selectedSubmissionId = regId;

      document.getElementById('modal-reg-id').textContent = s.registrationId;
      document.getElementById('modal-fullname').textContent = s.fullName;
      document.getElementById('modal-email').textContent = s.email;
      document.getElementById('modal-mobile').textContent = s.mobile;
      document.getElementById('modal-college').textContent = `${s.collegeName} (${s.department}, ${s.yearOfStudy})`;
      document.getElementById('modal-location').textContent = `${s.city}, ${s.state}`;
      
      const teamText = s.participationType === 'team' 
        ? `${s.teamName} (Leader: ${s.fullName}; Teammates: ${s.teamMembers?.map(m => m.name).join(', ') || 'None'})`
        : 'Solo Participant';
      document.getElementById('modal-team-info').textContent = teamText;

      document.getElementById('modal-idea-title').textContent = s.problemTitle;
      document.getElementById('modal-track').textContent = `${s.trackName} (${s.trackBadge})`;
      document.getElementById('modal-problem-desc').textContent = s.problemDesc;
      document.getElementById('modal-ai-solution').textContent = s.aiSolution;
      document.getElementById('modal-stage').textContent = s.progressStage || 'Idea stage only';
      document.getElementById('modal-tools').textContent = s.toolsPlanned || 'Not sure yet';
      document.getElementById('modal-links').innerHTML = s.projectLinks 
        ? `<a href="${s.projectLinks}" target="_blank" rel="noopener">${s.projectLinks}</a>`
        : 'None provided';

      const evalData = s.evaluation || {};
      document.getElementById('rubric-novelty').value = evalData.scoreNovelty || 0;
      document.getElementById('rubric-importance').value = evalData.scoreImportance || 0;
      document.getElementById('rubric-feasibility').value = evalData.scoreFeasibility || 0;
      document.getElementById('rubric-functionality').value = evalData.scoreFunctionality || 0;
      document.getElementById('rubric-demo').value = evalData.scoreDemo || 0;
      document.getElementById('rubric-potential').value = evalData.scorePotential || 0;
      document.getElementById('rubric-notes').value = evalData.evaluatorNotes || '';
      document.getElementById('eval-status-select').value = s.status || 'Submitted';

      this.updateRubricLiveScore();
      document.getElementById('evaluation-modal').classList.add('open');
    },

    updateRubricLiveScore() {
      const nov = Number(document.getElementById('rubric-novelty')?.value) || 0;
      const imp = Number(document.getElementById('rubric-importance')?.value) || 0;
      const fea = Number(document.getElementById('rubric-feasibility')?.value) || 0;
      const fn = Number(document.getElementById('rubric-functionality')?.value) || 0;
      const dem = Number(document.getElementById('rubric-demo')?.value) || 0;
      const pot = Number(document.getElementById('rubric-potential')?.value) || 0;

      const total = nov + imp + fea + fn + dem + pot;
      const scoreBadge = document.getElementById('rubric-total-badge');
      if (scoreBadge) {
        scoreBadge.textContent = `${total} / 60`;
      }
    },

    saveEvaluation() {
      if (!this.selectedSubmissionId) return;

      const evalData = {
        scoreNovelty: Number(document.getElementById('rubric-novelty').value) || 0,
        scoreImportance: Number(document.getElementById('rubric-importance').value) || 0,
        scoreFeasibility: Number(document.getElementById('rubric-feasibility').value) || 0,
        scoreFunctionality: Number(document.getElementById('rubric-functionality').value) || 0,
        scoreDemo: Number(document.getElementById('rubric-demo').value) || 0,
        scorePotential: Number(document.getElementById('rubric-potential').value) || 0,
        evaluatorNotes: document.getElementById('rubric-notes').value.trim()
      };

      const newStatus = document.getElementById('eval-status-select').value;
      const evaluatorName = this.currentUser ? this.currentUser.name : 'Judge';

      HackathonAPI.updateSubmissionEvaluation(this.selectedSubmissionId, evalData, newStatus, evaluatorName);

      document.getElementById('evaluation-modal').classList.remove('open');
      this.refreshData();
      alert(`Evaluation saved successfully for ${this.selectedSubmissionId}.`);
    },

    openEditModal(regId) {
      if (this.currentUser?.role !== 'SuperAdmin') {
        alert('Only Admins can edit participant records.');
        return;
      }

      const s = this.activeSubmissions.find(sub => sub.registrationId === regId);
      if (!s) return;

      document.getElementById('edit-modal-reg-id').textContent = s.registrationId;
      document.getElementById('edit-field-reg-id').value = s.registrationId;
      document.getElementById('edit-field-name').value = s.fullName || '';
      document.getElementById('edit-field-email').value = s.email || '';
      document.getElementById('edit-field-mobile').value = s.mobile || '';
      document.getElementById('edit-field-whatsapp').value = s.whatsapp || '';
      document.getElementById('edit-field-city').value = s.city || '';
      document.getElementById('edit-field-state').value = s.state || '';
      document.getElementById('edit-field-college').value = s.collegeName || '';
      document.getElementById('edit-field-dept').value = s.department || '';
      document.getElementById('edit-field-year').value = s.yearOfStudy || '';
      document.getElementById('edit-field-mentor').value = s.facultyName || '';
      document.getElementById('edit-field-part-type').value = s.participationType || 'single';
      document.getElementById('edit-field-team-name').value = s.teamName || '';
      document.getElementById('edit-field-problem-title').value = s.problemTitle || '';
      document.getElementById('edit-field-status').value = s.status || 'Submitted';
      document.getElementById('edit-field-problem-desc').value = s.problemDesc || '';
      document.getElementById('edit-field-ai-solution').value = s.aiSolution || '';
      document.getElementById('edit-field-project-links').value = s.projectLinks || '';

      // Populate track options
      const trackSelect = document.getElementById('edit-field-track');
      if (trackSelect) {
        const settings = HackathonAPI.getSettings();
        trackSelect.innerHTML = settings.tracks.map(t => 
          `<option value="${t.id}" ${t.id === s.trackId ? 'selected' : ''}>${t.name} (${t.badge})</option>`
        ).join('');
      }

      document.getElementById('edit-participant-modal').classList.add('open');
    },

    saveEditParticipant() {
      if (this.currentUser?.role !== 'SuperAdmin') return;

      const regId = document.getElementById('edit-field-reg-id').value;
      if (!regId) return;

      const updatedFields = {
        fullName: document.getElementById('edit-field-name').value.trim(),
        email: document.getElementById('edit-field-email').value.trim().toLowerCase(),
        mobile: document.getElementById('edit-field-mobile').value.trim(),
        whatsapp: document.getElementById('edit-field-whatsapp').value.trim(),
        city: document.getElementById('edit-field-city').value.trim(),
        state: document.getElementById('edit-field-state').value.trim(),
        collegeName: document.getElementById('edit-field-college').value.trim(),
        department: document.getElementById('edit-field-dept').value.trim(),
        yearOfStudy: document.getElementById('edit-field-year').value.trim(),
        facultyName: document.getElementById('edit-field-mentor').value.trim(),
        participationType: document.getElementById('edit-field-part-type').value,
        teamName: document.getElementById('edit-field-team-name').value.trim(),
        problemTitle: document.getElementById('edit-field-problem-title').value.trim(),
        trackId: document.getElementById('edit-field-track').value,
        status: document.getElementById('edit-field-status').value,
        problemDesc: document.getElementById('edit-field-problem-desc').value.trim(),
        aiSolution: document.getElementById('edit-field-ai-solution').value.trim(),
        projectLinks: document.getElementById('edit-field-project-links').value.trim()
      };

      const res = HackathonAPI.updateSubmissionDetails(regId, updatedFields, this.currentUser.name);
      if (res.success) {
        alert(`✅ Details for ${regId} successfully updated.`);
        document.getElementById('edit-participant-modal').classList.remove('open');
        this.refreshData();
      } else {
        alert(`Error updating: ${res.message}`);
      }
    },

    confirmDeleteParticipant(regId) {
      if (this.currentUser?.role !== 'SuperAdmin') {
        alert('Only Admins can delete participant records.');
        return;
      }

      const s = this.activeSubmissions.find(sub => sub.registrationId === regId);
      const name = s ? s.fullName : regId;
      
      const confirmed = confirm(`⚠️ Are you sure you want to permanently delete registration ${regId} (${name})?\n\nThis action cannot be undone.`);
      if (!confirmed) return;

      const res = HackathonAPI.deleteSubmission(regId, this.currentUser.name);
      if (res.success) {
        alert(`✅ ${res.message}`);
        document.getElementById('evaluation-modal')?.classList.remove('open');
        document.getElementById('edit-participant-modal')?.classList.remove('open');
        this.refreshData();
      } else {
        alert(`Error: ${res.message}`);
      }
    },

    exportCSV() {
      const subs = this.filteredSubmissions;
      if (subs.length === 0) {
        alert('No data to export.');
        return;
      }

      const headers = [
        "Registration ID",
        "Submitted At",
        "Status",
        "Full Name",
        "Email",
        "Mobile",
        "City",
        "State",
        "College Name",
        "Department",
        "Year of Study",
        "Participation Type",
        "Team Name",
        "Teammates Count",
        "Thematic Track",
        "Problem Title",
        "Score Novelty",
        "Score Importance",
        "Score Feasibility",
        "Score Functionality",
        "Score Demo",
        "Score Potential",
        "Total Score",
        "Review Notes",
        "Evaluated By"
      ];

      const csvRows = [headers.join(",")];

      subs.forEach(s => {
        const ev = s.evaluation || {};
        const row = [
          `"${s.registrationId}"`,
          `"${s.submittedAt}"`,
          `"${s.status}"`,
          `"${(s.fullName || '').replace(/"/g, '""')}"`,
          `"${s.email}"`,
          `"${s.mobile}"`,
          `"${s.city}"`,
          `"${s.state}"`,
          `"${(s.collegeName || '').replace(/"/g, '""')}"`,
          `"${(s.department || '').replace(/"/g, '""')}"`,
          `"${s.yearOfStudy}"`,
          `"${s.participationType}"`,
          `"${(s.teamName || '').replace(/"/g, '""')}"`,
          `"${s.teamMembers ? s.teamMembers.length : 0}"`,
          `"${(s.trackName || '').replace(/"/g, '""')}"`,
          `"${(s.problemTitle || '').replace(/"/g, '""')}"`,
          ev.scoreNovelty || 0,
          ev.scoreImportance || 0,
          ev.scoreFeasibility || 0,
          ev.scoreFunctionality || 0,
          ev.scoreDemo || 0,
          ev.scorePotential || 0,
          ev.totalScore || 0,
          `"${(ev.evaluatorNotes || '').replace(/"/g, '""')}"`,
          `"${(ev.evaluatedBy || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(","));
      });

      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `aihackathon_registrations_oct15-16_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    renderSettingsForm() {
      const s = HackathonAPI.getSettings();
      document.getElementById('cfg-event-name').value = s.eventName;
      document.getElementById('cfg-theme').value = s.theme;
      document.getElementById('cfg-event-dates').value = s.eventDates;
      document.getElementById('cfg-deadline').value = s.registrationDeadline;
      document.getElementById('cfg-min-team').value = s.minTeamSize;
      document.getElementById('cfg-max-team').value = s.maxTeamSize;
      document.getElementById('cfg-cross-college').checked = s.allowCrossCollege;
    },

    saveSettings() {
      const current = HackathonAPI.getSettings();
      const updated = {
        ...current,
        eventName: document.getElementById('cfg-event-name').value.trim(),
        theme: document.getElementById('cfg-theme').value.trim(),
        eventDates: document.getElementById('cfg-event-dates').value.trim(),
        registrationDeadline: document.getElementById('cfg-deadline').value.trim(),
        minTeamSize: Number(document.getElementById('cfg-min-team').value) || 1,
        maxTeamSize: Number(document.getElementById('cfg-max-team').value) || 4,
        allowCrossCollege: document.getElementById('cfg-cross-college').checked
      };

      HackathonAPI.updateSettings(updated, this.currentUser ? this.currentUser.name : 'Admin');
      alert('Event settings successfully saved and updated across the portal.');
    },

    renderAuditLogs() {
      const logs = HackathonAPI.getAuditLogs();
      const tbody = document.getElementById('audit-table-body');
      if (!tbody) return;

      if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem;">No audit logs yet.</td></tr>';
        return;
      }

      tbody.innerHTML = logs.map(l => `
        <tr>
          <td style="font-size:0.8rem; color:var(--ink-light);">${new Date(l.timestamp).toLocaleString()}</td>
          <td><strong>${l.actor}</strong></td>
          <td><span style="font-family:monospace; font-size:0.8rem; background:#F1F5F9; padding:2px 6px; border-radius:4px;">${l.action}</span></td>
          <td style="font-size:0.875rem;">${l.details}</td>
        </tr>
      `).join('');
    }
  };

  AdminApp.init();
});
