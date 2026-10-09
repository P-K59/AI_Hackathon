/**
 * Unified Backend & Data Service (Supabase Adapter + Operational Engine)
 * Manages submissions, admin settings, judge credentials, status lookups, and evaluation rubrics.
 * Live Cloud Supabase PostgreSQL integration with resilient local fallback.
 */

const SUPABASE_CONFIG = window.ENV_SUPABASE_CONFIG || {
  url: "https://your-project.supabase.co",
  anonKey: "your-anon-key-here"
};

const HackathonAPI = {
  config: SUPABASE_CONFIG,
  supabaseClient: null,

  STORAGE_KEYS: {
    SETTINGS: 'aihack_admin_settings_v4',
    SUBMISSIONS: 'aihack_submissions_v4',
    AUDIT: 'aihack_audit_logs_v4',
    AUTH: 'aihack_admin_session_v4',
    CREDENTIALS: 'aihack_admin_credentials_v4'
  },

  /**
   * Helper for Supabase REST API requests
   */
  async supabaseRequest(endpoint, method = 'GET', body = null) {
    try {
      const headers = {
        'apikey': this.config.anonKey,
        'Authorization': `Bearer ${this.config.anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };

      const res = await fetch(`${this.config.url}/rest/v1/${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`Supabase REST [${method} ${endpoint}] error:`, errorText);
        return { error: errorText };
      }

      const data = await res.json();
      return { data };
    } catch (err) {
      console.warn(`Supabase network error:`, err);
      return { error: err.message };
    }
  },

  /**
   * Sync registration to Supabase cloud
   */
  async syncRegistrationToCloud(record) {
    try {
      // 1. Post via RPC if schema is installed
      const rpcRes = await fetch(`${this.config.url}/rest/v1/rpc/register_hackathon_submission`, {
        method: 'POST',
        headers: {
          'apikey': this.config.anonKey,
          'Authorization': `Bearer ${this.config.anonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ payload: record })
      });

      if (rpcRes.ok) {
        const result = await rpcRes.json();
        console.log("Synced to Supabase Cloud via RPC:", result);
        return result;
      } else {
        console.log("RPC endpoint response (will use local fallback cache):", await rpcRes.text());
      }
    } catch (e) {
      console.warn("Supabase background sync notice:", e.message);
    }
  },

  /**
   * Default Accounts (Admin has full access; Judges have evaluate-only access)
   */
  defaultCredentials: [
    {
      id: "admin",
      aliases: ["admin@aihackathon.in", "superadmin"],
      password: "Admin@2026#",
      name: "Admin",
      role: "SuperAdmin"
    },
    {
      id: "judge",
      aliases: ["judge@aihackathon.in", "evaluator", "evaluator@aihackathon.in"],
      password: "Judge@2026#",
      name: "Judge Panel",
      role: "Judge"
    }
  ],

  /**
   * Default Admin Settings (loaded dynamically)
   */
  defaultSettings: {
    eventName: "Nirmaan AI Hackathon 2026 – Centre of Excellence, Nagpur",
    theme: "AI in India – AI for India (Nirmaan CoE Nagpur)",
    eventDates: "October 15–16, 2026",
    registrationDeadline: "Oct 12, 2026, 11:59 PM IST",
    targetRegistrations: 1000,
    targetShortlist: 200,
    minTeamSize: 3,
    maxTeamSize: 6,
    allowCrossCollege: true,
    requireGender: false,
    requireGovernmentId: false,
    // Shortlist Declaration State (Default FALSE so students cannot see/download until admin declares)
    shortlistDeclared: false,
    shortlistPublishDate: "Oct 14, 2026",
    shortlistAnnouncementTitle: "Final Round Shortlist for Oct 15–16, 2026 Grand Finale",
    tracks: [
      {
        id: "social_impact",
        name: "AI for Social Impact",
        badge: "Social Impact",
        cssClass: "track-social",
        icon: "🤝",
        shortDesc: "Empowering communities, accessibility, education, and inclusive governance.",
        example: "Ex: Voice-based assistance in regional languages for government welfare schemes."
      },
      {
        id: "healthcare",
        name: "AI in Healthcare",
        badge: "Healthcare",
        cssClass: "track-health",
        icon: "❤️",
        shortDesc: "Early diagnosis, telemedicine, assistive devices, and medical logistics in rural areas.",
        example: "Ex: Smartphone triage tool for diabetic retinopathy in primary health centres."
      },
      {
        id: "agriculture",
        name: "AI in Agriculture & Rural Development",
        badge: "Agriculture",
        cssClass: "track-agri",
        icon: "🌱",
        shortDesc: "Crop health, pest alerts, water optimization, and supply chain transparency.",
        example: "Ex: App that looks at a leaf photo and detects crop disease in Marathi or Hindi."
      },
      {
        id: "cyber_defence",
        name: "AI in Cyber Security & Defence",
        badge: "Cyber & Defence",
        cssClass: "track-cyber",
        icon: "🛡️",
        shortDesc: "Threat detection, data privacy, critical infrastructure protection, and deepfake verification.",
        example: "Ex: Lightweight scanner detecting deepfake audio in verification calls."
      }
    ],
    colleges: [
      "Indian Institute of Technology (IIT) Bombay",
      "Indian Institute of Technology (IIT) Delhi",
      "Indian Institute of Technology (IIT) Madras",
      "Indian Institute of Technology (IIT) Kharagpur",
      "Indian Institute of Technology (IIT) Roorkee",
      "National Institute of Technology (NIT) Trichy",
      "National Institute of Technology (NIT) Surathkal",
      "College of Engineering Pune (COEP Tech)",
      "Veermata Jijabai Technological Institute (VJTI) Mumbai",
      "Delhi Technological University (DTU)",
      "Birla Institute of Technology and Science (BITS) Pilani",
      "Vellore Institute of Technology (VIT) Vellore",
      "Manipal Institute of Technology (MIT)",
      "PSG College of Technology, Coimbatore",
      "Thapar Institute of Engineering and Technology, Patiala",
      "International Institute of Information Technology (IIIT) Hyderabad",
      "PES University, Bengaluru",
      "SRM Institute of Science and Technology, Chennai",
      "Anna University (CEG), Chennai",
      "Jadavpur University, Kolkata"
    ],
    departments: [
      "Computer Science & Engineering",
      "Information Technology",
      "Artificial Intelligence & Data Science",
      "Electronics & Communication Engineering",
      "Electrical & Electronics Engineering",
      "Mechanical Engineering",
      "Civil Engineering",
      "Biotechnology & Biomedical",
      "Management / Business Studies",
      "Basic Sciences / Mathematics"
    ],
    yearsOfStudy: [
      "1st Year (Undergraduate)",
      "2nd Year (Undergraduate)",
      "3rd Year (Undergraduate)",
      "4th Year (Undergraduate)",
      "5th Year / Dual Degree",
      "Postgraduate / Master's / Ph.D."
    ]
  },

  /**
   * Initializes data store with defaults
   */
  init() {
    if (!localStorage.getItem(this.STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify(this.defaultSettings));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.CREDENTIALS)) {
      localStorage.setItem(this.STORAGE_KEYS.CREDENTIALS, JSON.stringify(this.defaultCredentials));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.SUBMISSIONS)) {
      this.seedDemoSubmissions();
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.AUDIT)) {
      localStorage.setItem(this.STORAGE_KEYS.AUDIT, JSON.stringify([]));
    }
  },

  /**
   * Authentication Service
   */
  getCredentials() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CREDENTIALS)) || this.defaultCredentials;
    } catch (e) {
      return this.defaultCredentials;
    }
  },

  authenticateUser(identifier, password) {
    this.init();
    if (!identifier || !password) {
      return { success: false, message: "Please enter your ID and Password." };
    }

    const cleanId = identifier.trim().toLowerCase();
    const creds = this.getCredentials();

    const user = creds.find(c => 
      c.id.toLowerCase() === cleanId || 
      (c.aliases && c.aliases.some(a => a.toLowerCase() === cleanId))
    );

    if (!user) {
      return { success: false, message: "Invalid ID or Username. Please check credentials." };
    }

    if (user.password !== password) {
      return { success: false, message: "Incorrect password. Please try again." };
    }

    const session = {
      id: user.id,
      name: user.name,
      role: user.role, // 'SuperAdmin' or 'Judge'
      isAdmin: user.role === 'SuperAdmin',
      isJudge: user.role === 'Judge',
      token: 'tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
      timestamp: Date.now()
    };

    sessionStorage.setItem(this.STORAGE_KEYS.AUTH, JSON.stringify(session));
    this.logAudit(user.name, 'USER_LOGIN', `Logged in successfully as ${user.role}`);

    return { success: true, user: session };
  },

  getCurrentSession() {
    try {
      const s = sessionStorage.getItem(this.STORAGE_KEYS.AUTH);
      return s ? JSON.parse(s) : null;
    } catch (e) {
      return null;
    }
  },

  logoutUser() {
    const s = this.getCurrentSession();
    if (s) {
      this.logAudit(s.name, 'USER_LOGOUT', `User logged out`);
    }
    sessionStorage.removeItem(this.STORAGE_KEYS.AUTH);
  },

  /**
   * Judge Account Management (Admin Only)
   */
  createJudgeAccount(judgeId, fullName, password, adminActor = 'Admin') {
    const creds = this.getCredentials();
    const cleanId = judgeId.trim().toLowerCase();

    if (!cleanId || !password || !fullName) {
      return { success: false, message: "Judge ID, Name, and Password are all required." };
    }

    const exists = creds.some(c => c.id.toLowerCase() === cleanId || (c.aliases && c.aliases.some(a => a.toLowerCase() === cleanId)));
    if (exists) {
      return { success: false, message: `An account with ID '${judgeId}' already exists.` };
    }

    const newJudge = {
      id: cleanId,
      aliases: [cleanId + "@aihackathon.in"],
      password: password.trim(),
      name: fullName.trim(),
      role: "Judge",
      createdAt: new Date().toISOString(),
      createdBy: adminActor
    };

    creds.push(newJudge);
    localStorage.setItem(this.STORAGE_KEYS.CREDENTIALS, JSON.stringify(creds));
    this.logAudit(adminActor, 'CREATE_JUDGE', `Created new judge account: ${newJudge.id} (${newJudge.name})`);

    return { success: true, user: newJudge };
  },

  deleteJudgeAccount(judgeId, adminActor = 'Admin') {
    const creds = this.getCredentials();
    const cleanId = judgeId.trim().toLowerCase();

    if (cleanId === 'admin') {
      return { success: false, message: "Cannot delete the primary Admin account." };
    }

    const filtered = creds.filter(c => c.id.toLowerCase() !== cleanId);
    if (filtered.length === creds.length) {
      return { success: false, message: "Account not found." };
    }

    localStorage.setItem(this.STORAGE_KEYS.CREDENTIALS, JSON.stringify(filtered));
    this.logAudit(adminActor, 'DELETE_JUDGE', `Deleted judge account: ${judgeId}`);
    return { success: true, message: "Judge account removed successfully." };
  },

  listJudgeAccounts() {
    const creds = this.getCredentials();
    return creds.filter(c => c.role === 'Judge');
  },

  updatePassword(identifier, newPassword, adminActor = 'Admin') {
    const creds = this.getCredentials();
    const cleanId = identifier.trim().toLowerCase();
    const idx = creds.findIndex(c => c.id.toLowerCase() === cleanId || (c.aliases && c.aliases.some(a => a.toLowerCase() === cleanId)));

    if (idx === -1) {
      return { success: false, message: "User account not found." };
    }

    creds[idx].password = newPassword;
    localStorage.setItem(this.STORAGE_KEYS.CREDENTIALS, JSON.stringify(creds));
    this.logAudit(adminActor, 'UPDATE_PASSWORD', `Password updated for account ${creds[idx].id}`);
    return { success: true, message: "Password updated successfully." };
  },

  /**
   * Fetches current admin settings
   */
  getSettings() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SETTINGS)) || this.defaultSettings;
    } catch (e) {
      return this.defaultSettings;
    }
  },

  /**
   * Saves updated admin settings with audit logging
   */
  updateSettings(newSettings, adminUser = 'Admin') {
    localStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
    this.logAudit(adminUser, 'UPDATE_SETTINGS', 'Updated event settings and configurations');
    return { success: true };
  },

  /**
   * Shortlist Result Management
   */
  isShortlistDeclared() {
    const settings = this.getSettings();
    return Boolean(settings.shortlistDeclared);
  },

  toggleShortlistPublication(declared, publishedBy = 'Admin') {
    const settings = this.getSettings();
    settings.shortlistDeclared = Boolean(declared);
    if (declared) {
      settings.shortlistPublishDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    this.updateSettings(settings, publishedBy);
    this.logAudit(publishedBy, declared ? 'DECLARE_RESULTS' : 'UNPUBLISH_RESULTS', `Final round shortlist results ${declared ? 'PUBLISHED & DECLARED' : 'UNPUBLISHED (DRAFT)'}`);
    return { success: true, declared: settings.shortlistDeclared, publishDate: settings.shortlistPublishDate };
  },

  /**
   * Internal method for admin / judges to view shortlisted records
   */
  getShortlistedSubmissions() {
    const subs = this.getAllSubmissions();
    return subs.filter(s => s.status === 'Shortlisted' || s.status === 'Finalist Confirmed');
  },

  /**
   * Public method: strictly enforces declaration check before returning list
   */
  getPublicShortlistedSubmissions() {
    if (!this.isShortlistDeclared()) {
      return { declared: false, items: [], message: "Shortlist results have not been declared yet." };
    }
    const items = this.getShortlistedSubmissions().map(s => ({
      registrationId: s.registrationId,
      teamName: s.teamName,
      fullName: s.fullName,
      participationType: s.participationType,
      collegeName: s.collegeName,
      department: s.department,
      trackName: s.trackName,
      trackBadge: s.trackBadge,
      status: s.status
    }));
    return { declared: true, items, message: "Shortlist declared." };
  },

  /**
   * Generates unique Registration ID (Format: AIHACK-2026-XXXX)
   */
  generateRegistrationId() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `AIHACK-2026-${randomNum}`;
  },

  /**
   * Submit registration with validation and duplicate detection
   */
  async submitRegistration(payload) {
    await new Promise(resolve => setTimeout(resolve, 400));

    this.init();
    const settings = this.getSettings();

    // 1. Server-side validation
    const errors = [];
    if (!payload.fullName || !payload.fullName.trim()) errors.push("Full name is required.");
    if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) errors.push("Valid email address is required.");
    if (!payload.mobile || !/^[6-9]\d{9}$/.test(payload.mobile.replace(/[\s-]/g, ''))) errors.push("10-digit Indian mobile number is required.");
    if (!payload.city || !payload.city.trim()) errors.push("City or town is required.");
    if (!payload.state || !payload.state.trim()) errors.push("State is required.");

    if (!payload.collegeStatus) errors.push("College status is required.");
    const collegeName = payload.collegeStatus === 'Yes' ? payload.selectedCollege : payload.customCollegeName;
    if (!collegeName || !collegeName.trim()) errors.push("College name is required.");
    if (!payload.department || !payload.department.trim()) errors.push("Department is required.");
    if (!payload.yearOfStudy) errors.push("Year of study is required.");

    if (!payload.participationType) errors.push("Participation type (Just me or My team) is required.");
    if (payload.participationType === 'team') {
      if (!payload.teamName || !payload.teamName.trim()) errors.push("Team name is required.");
    }

    if (!payload.problemTitle || !payload.problemTitle.trim()) errors.push("Problem title is required.");
    const wordCount = payload.problemTitle.trim().split(/\s+/).length;
    if (wordCount > 10) errors.push("Problem title must be 10 words or fewer.");
    if (!payload.problemDesc || !payload.problemDesc.trim()) errors.push("Problem description is required.");
    if (!payload.trackId) errors.push("Thematic track selection is required.");
    if (!payload.aiSolution || !payload.aiSolution.trim()) errors.push("AI solution description is required.");

    if (!payload.declCorrect || !payload.declTerms || !payload.declNoGuarantee) {
      errors.push("All required declaration checkboxes must be accepted.");
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    // 2. Duplicate Detection
    const submissions = this.getAllSubmissions();
    const cleanMobile = payload.mobile.replace(/[\s-]/g, '');
    const cleanEmail = payload.email.trim().toLowerCase();

    const duplicate = submissions.find(s => 
      s.email.toLowerCase() === cleanEmail || 
      s.mobile.replace(/[\s-]/g, '') === cleanMobile
    );

    if (duplicate) {
      return {
        success: false,
        isDuplicate: true,
        existingId: duplicate.registrationId,
        errors: [`A registration already exists with this email or mobile number (ID: ${duplicate.registrationId}). You can check your review status anytime.`]
      };
    }

    // 3. Create Record
    const regId = this.generateRegistrationId();
    const track = settings.tracks.find(t => t.id === payload.trackId) || settings.tracks[0];

    const newRecord = {
      registrationId: regId,
      submittedAt: new Date().toISOString(),
      status: "Submitted",
      fullName: payload.fullName.trim(),
      email: cleanEmail,
      mobile: cleanMobile,
      whatsapp: payload.whatsapp ? payload.whatsapp.replace(/[\s-]/g, '') : '',
      city: payload.city.trim(),
      state: payload.state.trim(),
      rollNumber: payload.rollNumber ? payload.rollNumber.trim() : '',
      linkedin: payload.linkedin ? payload.linkedin.trim() : '',
      github: payload.github ? payload.github.trim() : '',
      gender: payload.gender || 'Prefer not to say',
      collegeStatus: payload.collegeStatus,
      collegeName: collegeName.trim(),
      collegeCity: payload.collegeCity ? payload.collegeCity.trim() : payload.city.trim(),
      department: payload.department === 'Other' ? (payload.departmentOther || 'Other') : payload.department,
      yearOfStudy: payload.yearOfStudy,
      degreeCourse: payload.degreeCourse ? payload.degreeCourse.trim() : '',
      facultyName: payload.facultyName ? payload.facultyName.trim() : '',
      facultyEmail: payload.facultyEmail ? payload.facultyEmail.trim() : '',
      participationType: payload.participationType,
      teamName: payload.participationType === 'team' ? payload.teamName.trim() : 'Solo Participant',
      teamMembers: payload.participationType === 'team' ? (payload.teammates || []) : [],
      problemTitle: payload.problemTitle.trim(),
      problemDesc: payload.problemDesc.trim(),
      trackId: track.id,
      trackName: track.name,
      trackBadge: track.badge,
      trackCssClass: track.cssClass,
      aiSolution: payload.aiSolution.trim(),
      problemOrigin: payload.problemOrigin ? payload.problemOrigin.trim() : '',
      whyItMatters: payload.whyItMatters ? payload.whyItMatters.trim() : '',
      currentAlternatives: payload.currentAlternatives ? payload.currentAlternatives.trim() : '',
      expectedOutcome: payload.expectedOutcome ? payload.expectedOutcome.trim() : '',
      progressStage: payload.progressStage || 'Idea stage only',
      toolsPlanned: payload.toolsPlanned || 'Not sure yet',
      projectLinks: payload.projectLinks ? payload.projectLinks.trim() : '',
      publicityConsent: Boolean(payload.publicityConsent),
      evaluation: {
        scoreNovelty: 0,
        scoreImportance: 0,
        scoreFeasibility: 0,
        scoreFunctionality: 0,
        scoreDemo: 0,
        scorePotential: 0,
        totalScore: 0,
        evaluatorNotes: "",
        evaluatedBy: "",
        evaluatedAt: null
      }
    };

    submissions.unshift(newRecord);
    localStorage.setItem(this.STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
    this.logAudit('System', 'REGISTRATION_SUBMITTED', `New registration received: ${regId} (${newRecord.fullName})`);

    // Asynchronously sync with Supabase PostgreSQL cloud
    this.syncRegistrationToCloud(payload).catch(() => {});

    return {
      success: true,
      registrationId: regId,
      record: newRecord
    };
  },

  /**
   * Retrieves all submissions
   */
  getAllSubmissions() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SUBMISSIONS)) || [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Lookup status by ID and contact for students
   */
  lookupStatus(registrationId, contact) {
    if (!registrationId || !contact) return null;
    const cleanId = registrationId.trim().toUpperCase();
    const cleanContact = contact.trim().toLowerCase().replace(/[\s-]/g, '');

    const submissions = this.getAllSubmissions();
    const found = submissions.find(s => 
      s.registrationId.toUpperCase() === cleanId && 
      (s.email.toLowerCase() === cleanContact || s.mobile === cleanContact)
    );

    if (!found) return null;

    // Mask final shortlisted result before official declaration
    const isDeclared = this.isShortlistDeclared();
    const displayStatus = (!isDeclared && (found.status === 'Shortlisted' || found.status === 'Finalist Confirmed'))
      ? 'Under Review'
      : found.status;

    return {
      ...found,
      displayStatus,
      isShortlistDeclared: isDeclared
    };
  },

  /**
   * Updates review status and scores (Admin or Judge)
   */
  updateSubmissionEvaluation(registrationId, evaluationData, newStatus, evaluatorName = 'Judge') {
    const submissions = this.getAllSubmissions();
    const idx = submissions.findIndex(s => s.registrationId === registrationId);
    if (idx === -1) return { success: false, message: 'Submission not found' };

    const total = (Number(evaluationData.scoreNovelty) || 0) +
                  (Number(evaluationData.scoreImportance) || 0) +
                  (Number(evaluationData.scoreFeasibility) || 0) +
                  (Number(evaluationData.scoreFunctionality) || 0) +
                  (Number(evaluationData.scoreDemo) || 0) +
                  (Number(evaluationData.scorePotential) || 0);

    submissions[idx].evaluation = {
      ...submissions[idx].evaluation,
      ...evaluationData,
      totalScore: total,
      evaluatedBy: evaluatorName,
      evaluatedAt: new Date().toISOString()
    };

    if (newStatus) {
      submissions[idx].status = newStatus;
    }

    localStorage.setItem(this.STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
    this.logAudit(evaluatorName, 'EVALUATE_SUBMISSION', `Evaluated ${registrationId} - Score: ${total}/60, Status: ${submissions[idx].status}`);

    return { success: true, updated: submissions[idx] };
  },

  /**
   * Updates participant details (Admin Edit feature)
   */
  updateSubmissionDetails(registrationId, updatedFields, actorName = 'Admin') {
    const submissions = this.getAllSubmissions();
    const idx = submissions.findIndex(s => s.registrationId === registrationId);
    if (idx === -1) return { success: false, message: 'Participant submission not found' };

    const settings = this.getSettings();
    if (updatedFields.trackId) {
      const track = settings.tracks.find(t => t.id === updatedFields.trackId);
      if (track) {
        updatedFields.trackName = track.name;
        updatedFields.trackBadge = track.badge;
        updatedFields.trackCssClass = track.cssClass;
      }
    }

    submissions[idx] = {
      ...submissions[idx],
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(this.STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
    this.logAudit(actorName, 'EDIT_PARTICIPANT', `Edited details for ${registrationId} (${submissions[idx].fullName})`);

    // Async sync update to Supabase Cloud if available
    this.supabaseRequest(`project_submissions?registration_id=eq.${registrationId}`, 'PATCH', {
      problem_title: updatedFields.problemTitle,
      problem_description: updatedFields.problemDesc,
      ai_solution: updatedFields.aiSolution,
      status: updatedFields.status,
      updated_at: new Date().toISOString()
    }).catch(e => console.warn('Supabase cloud update notice:', e));

    return { success: true, updated: submissions[idx] };
  },

  /**
   * Deletes a participant record (Admin Delete feature)
   */
  deleteSubmission(registrationId, actorName = 'Admin') {
    const submissions = this.getAllSubmissions();
    const idx = submissions.findIndex(s => s.registrationId === registrationId);
    if (idx === -1) return { success: false, message: 'Participant submission not found' };

    const removed = submissions.splice(idx, 1)[0];
    localStorage.setItem(this.STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
    this.logAudit(actorName, 'DELETE_PARTICIPANT', `Deleted participant record ${registrationId} (${removed.fullName} - ${removed.collegeName})`);

    // Async sync delete to Supabase Cloud
    this.supabaseRequest(`project_submissions?registration_id=eq.${registrationId}`, 'DELETE')
      .catch(e => console.warn('Supabase cloud delete notice:', e));

    return { success: true, message: `Participant ${registrationId} removed successfully.` };
  },

  /**
   * Export Shortlist CSV (Accessible if declared OR requested by logged-in admin/judge)
   */
  downloadShortlistCSV(bypassDeclarationCheck = false) {
    const isDeclared = this.isShortlistDeclared();
    const session = this.getCurrentSession();
    const isAuthorized = session && (session.isAdmin || session.isJudge);

    if (!isDeclared && !isAuthorized && !bypassDeclarationCheck) {
      alert("⚠️ Shortlist results have not been declared yet by the organizing committee.");
      return;
    }

    const shortlisted = this.getShortlistedSubmissions();
    if (shortlisted.length === 0) {
      alert("No shortlisted candidates available to export.");
      return;
    }

    const headers = [
      "Sl No",
      "Registration ID",
      "Team / Project Name",
      "Participation Type",
      "Team Leader",
      "Email",
      "Mobile",
      "College / Institute",
      "Department",
      "Thematic Track",
      "Problem Title",
      "Status",
      "Final Round Date"
    ];

    const rows = [headers.join(",")];
    shortlisted.forEach((s, i) => {
      const row = [
        i + 1,
        `"${s.registrationId}"`,
        `"${(s.teamName || s.fullName).replace(/"/g, '""')}"`,
        `"${s.participationType}"`,
        `"${(s.fullName || '').replace(/"/g, '""')}"`,
        `"${s.email}"`,
        `"${s.mobile}"`,
        `"${(s.collegeName || '').replace(/"/g, '""')}"`,
        `"${(s.department || '').replace(/"/g, '""')}"`,
        `"${(s.trackName || s.trackBadge || '').replace(/"/g, '""')}"`,
        `"${(s.problemTitle || '').replace(/"/g, '""')}"`,
        `"${s.status}"`,
        `"October 15–16, 2026"`
      ];
      rows.push(row.join(","));
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `AI_Hackathon_Final_Round_Shortlist_Oct15-16.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Export Shortlist as a Printable / PDF Document
   */
  downloadShortlistPDF(bypassDeclarationCheck = false) {
    const isDeclared = this.isShortlistDeclared();
    const session = this.getCurrentSession();
    const isAuthorized = session && (session.isAdmin || session.isJudge);

    if (!isDeclared && !isAuthorized && !bypassDeclarationCheck) {
      alert("Shortlist results have not been declared yet by the organizing committee.");
      return;
    }

    const shortlisted = this.getShortlistedSubmissions();
    if (shortlisted.length === 0) {
      alert("No shortlisted candidates available to export.");
      return;
    }

    const printWin = window.open('', '_blank', 'width=900,height=800');
    if (!printWin) {
      alert("Please allow popups to download/print the official Shortlist PDF.");
      return;
    }

    const tableRowsHtml = shortlisted.map((s, idx) => `
      <tr style="border-bottom: 1px solid #E2E8F0;">
        <td style="padding: 10px 8px; font-weight: 700; color: #4F46E5; font-family: monospace;">${s.registrationId}</td>
        <td style="padding: 10px 8px;">
          <div style="font-weight: 700; color: #1E293B;">${s.participationType === 'team' ? s.teamName : s.fullName}</div>
          <div style="font-size: 0.8rem; color: #64748B;">Leader: ${s.fullName} (${s.participationType === 'team' ? 'Team' : 'Solo'})</div>
        </td>
        <td style="padding: 10px 8px;">
          <div style="font-weight: 600; color: #1E293B;">${s.collegeName}</div>
          <div style="font-size: 0.8rem; color: #64748B;">${s.department} • ${s.city || ''}</div>
        </td>
        <td style="padding: 10px 8px;">
          <span style="display:inline-block; padding: 2px 8px; border-radius: 4px; background: #EEF2FF; color: #4338CA; font-size: 0.8rem; font-weight: 700;">
            ${s.trackBadge || s.trackName}
          </span>
        </td>
        <td style="padding: 10px 8px; font-size: 0.85rem; color: #334155;">
          ${s.problemTitle}
        </td>
        <td style="padding: 10px 8px; text-align: center;">
          <span style="display:inline-block; padding: 3px 8px; border-radius: 9999px; background: #DCFCE7; color: #166534; font-size: 0.75rem; font-weight: 800;">
            FINALIST
          </span>
        </td>
      </tr>
    `).join('');

    const docHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Official Shortlist Roster - Nirmaan AI Hackathon 2026</title>
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0F172A; margin: 0; padding: 20px; font-size: 13px; line-height: 1.4; }
          .header-banner { border-bottom: 2px solid #4F46E5; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 20px; font-weight: 900; color: #1E1B4B; margin: 0 0 4px; }
          .subtitle { font-size: 13px; color: #4F46E5; font-weight: 700; margin: 0; }
          .meta { font-size: 11px; color: #64748B; text-align: right; }
          .badge { background: #1E1B4B; color: #FFF; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 11px; display: inline-block; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #F8FAFC; color: #475569; font-weight: 800; text-align: left; padding: 10px 8px; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #CBD5E1; }
          .footer-note { margin-top: 25px; padding-top: 12px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #64748B; display: flex; justify-content: space-between; }
          .no-print { margin-bottom: 15px; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: right;">
          <button onclick="window.print()" style="background: #4F46E5; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 13px;">
            Save as PDF / Print
          </button>
        </div>
        <div class="header-banner">
          <div>
            <h1 class="title">Nirmaan AI Hackathon 2026</h1>
            <p class="subtitle">Centre of Excellence • Nagpur | Supported by Redington Foundation & Microsoft</p>
            <div class="badge">Official Grand Finale Shortlist (Oct 15–16, 2026)</div>
          </div>
          <div class="meta">
            <div><strong>Declared On:</strong> October 9, 2026</div>
            <div><strong>Total Finalists:</strong> ${shortlisted.length} Teams</div>
            <div><strong>Venue:</strong> Nirmaan AI Innovation Labs, Nagpur</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 14%;">Reg ID</th>
              <th style="width: 20%;">Team / Applicant</th>
              <th style="width: 22%;">College / Department</th>
              <th style="width: 14%;">Track</th>
              <th style="width: 22%;">Problem Title</th>
              <th style="width: 8%; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="footer-note">
          <div>Official document issued by the Evaluation Committee. Shortlisted teams must report with college ID on Oct 15 at 08:30 AM IST.</div>
          <div>Page 1 of 1</div>
        </div>
        <script>
          setTimeout(() => { window.print(); }, 400);
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(docHtml);
    printWin.document.close();
  },

  /**
   * Records audit trail entries
   */
  logAudit(actor, action, details) {
    try {
      const logs = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.AUDIT)) || [];
      logs.unshift({
        id: 'aud_' + Date.now() + Math.random().toString(36).substr(2, 4),
        timestamp: new Date().toISOString(),
        actor,
        action,
        details
      });
      localStorage.setItem(this.STORAGE_KEYS.AUDIT, JSON.stringify(logs.slice(0, 500)));
    } catch (e) {}
  },

  getAuditLogs() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.AUDIT)) || [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Seeds rich, realistic demonstration data
   */
  seedDemoSubmissions() {
    const demo = [
      {
        registrationId: "AIHACK-2026-1042",
        submittedAt: "2026-10-08T09:24:00Z",
        status: "Shortlisted",
        fullName: "Aarav Sharma",
        email: "aarav.sharma@coep.ac.in",
        mobile: "9823012345",
        whatsapp: "9823012345",
        city: "Pune",
        state: "Maharashtra",
        rollNumber: "COEP-22-CS-041",
        collegeStatus: "Yes",
        collegeName: "College of Engineering Pune (COEP Tech)",
        collegeCity: "Pune",
        department: "Computer Science & Engineering",
        yearOfStudy: "3rd Year (Undergraduate)",
        participationType: "team",
        teamName: "KisanVision AI",
        teamMembers: [
          { name: "Pooja Kulkarni", email: "pooja.k@coep.ac.in", college: "COEP Tech" },
          { name: "Tanmay Deshmukh", email: "tanmay.d@coep.ac.in", college: "COEP Tech" }
        ],
        problemTitle: "Early detection of cotton pink bollworm in Vidarbha farms",
        problemDesc: "Smallholder farmers lose up to 40% of their cotton yield to hidden bollworm larvae because visible symptoms appear only after pest infestation has spread internally.",
        trackId: "agriculture",
        trackName: "AI in Agriculture & Rural Development",
        trackBadge: "Agriculture",
        trackCssClass: "track-agri",
        aiSolution: "An edge-AI offline mobile vision model that inspects pheromone trap photos and stem closeups, providing localized remedy alerts in Marathi without continuous internet.",
        progressStage: "Working prototype tested locally",
        toolsPlanned: "TensorFlow Lite, Flutter, OpenCV",
        projectLinks: "https://github.com/example/kisan-vision",
        publicityConsent: true,
        evaluation: {
          scoreNovelty: 9,
          scoreImportance: 10,
          scoreFeasibility: 9,
          scoreFunctionality: 8,
          scoreDemo: 8,
          scorePotential: 9,
          totalScore: 53,
          evaluatorNotes: "Outstanding grassroots relevance for Indian farmers. Solid edge deployment architecture.",
          evaluatedBy: "Judge",
          evaluatedAt: "2026-10-08T16:00:00Z"
        }
      },
      {
        registrationId: "AIHACK-2026-1189",
        submittedAt: "2026-10-08T11:15:00Z",
        status: "Under Review",
        fullName: "Sneha Reddy",
        email: "sneha.reddy@iith.ac.in",
        mobile: "9440187654",
        whatsapp: "9440187654",
        city: "Hyderabad",
        state: "Telangana",
        rollNumber: "IIIT-H-23-AI-12",
        collegeStatus: "Yes",
        collegeName: "International Institute of Information Technology (IIIT) Hyderabad",
        collegeCity: "Hyderabad",
        department: "Artificial Intelligence & Data Science",
        yearOfStudy: "2nd Year (Undergraduate)",
        participationType: "single",
        teamName: "Solo Participant",
        teamMembers: [],
        problemTitle: "AI stethoscope filter for neonatal pneumonia in remote PHCs",
        problemDesc: "Rural clinics lack pediatric pulmonologists; ambient noise prevents healthcare workers from reliably detecting subtle wheezing sounds in infants.",
        trackId: "healthcare",
        trackName: "AI in Healthcare",
        trackBadge: "Healthcare",
        trackCssClass: "track-health",
        aiSolution: "A deep audio denoising and spectrogram classification model running on affordable microcontroller hardware attached to standard stethoscopes.",
        progressStage: "Proof of concept with synthetic audio",
        toolsPlanned: "PyTorch, Librosa, Raspberry Pi",
        projectLinks: "",
        publicityConsent: true,
        evaluation: {
          scoreNovelty: 9,
          scoreImportance: 9,
          scoreFeasibility: 8,
          scoreFunctionality: 7,
          scoreDemo: 7,
          scorePotential: 8,
          totalScore: 48,
          evaluatorNotes: "Very promising approach to a critical healthcare bottleneck.",
          evaluatedBy: "Judge",
          evaluatedAt: "2026-10-09T02:00:00Z"
        }
      },
      {
        registrationId: "AIHACK-2026-1205",
        submittedAt: "2026-10-08T14:40:00Z",
        status: "Submitted",
        fullName: "Vikramaditya Roy",
        email: "v.roy@heritage.edu.in",
        mobile: "9830567890",
        city: "Kolkata",
        state: "West Bengal",
        collegeStatus: "No",
        customCollegeName: "Heritage Institute of Technology",
        collegeName: "Heritage Institute of Technology",
        collegeCity: "Kolkata",
        department: "Electronics & Communication Engineering",
        yearOfStudy: "4th Year (Undergraduate)",
        participationType: "team",
        teamName: "NetRakshak",
        teamMembers: [
          { name: "Ananya Sen", email: "ananya.s@heritage.edu.in", college: "Heritage Institute" }
        ],
        problemTitle: "Real-time deepfake audio detector for UPI banking calls",
        problemDesc: "Senior citizens are frequently targeted by cloned voice scams mimicking family members requesting urgent UPI fund transfers.",
        trackId: "cyber_defence",
        trackName: "AI in Cyber Security & Defence",
        trackBadge: "Cyber & Defence",
        trackCssClass: "track-cyber",
        aiSolution: "An on-device frequency artifact detector that analyzes incoming voice calls and highlights synthetic voice markers with an instant warning popup.",
        progressStage: "Idea stage with research benchmarks",
        toolsPlanned: "Wav2Vec 2.0, ONNX Runtime Mobile",
        projectLinks: "",
        publicityConsent: false,
        evaluation: {
          scoreNovelty: 0,
          scoreImportance: 0,
          scoreFeasibility: 0,
          scoreFunctionality: 0,
          scoreDemo: 0,
          scorePotential: 0,
          totalScore: 0,
          evaluatorNotes: "",
          evaluatedBy: "",
          evaluatedAt: null
        }
      },
      {
        registrationId: "AIHACK-2026-1340",
        submittedAt: "2026-10-09T08:10:00Z",
        status: "Shortlisted",
        fullName: "Deepa Sundaram",
        email: "deepa.s@psgtech.ac.in",
        mobile: "9790112233",
        city: "Coimbatore",
        state: "Tamil Nadu",
        collegeStatus: "Yes",
        collegeName: "PSG College of Technology, Coimbatore",
        collegeCity: "Coimbatore",
        department: "Information Technology",
        yearOfStudy: "3rd Year (Undergraduate)",
        participationType: "team",
        teamName: "BhashaSetu",
        teamMembers: [
          { name: "Kavitha R", email: "kavitha.r@psgtech.ac.in", college: "PSG College" },
          { name: "Siddharth M", email: "siddharth.m@psgtech.ac.in", college: "PSG College" }
        ],
        problemTitle: "Voice-driven Gram Panchayat grievance assistant in 12 languages",
        problemDesc: "Non-literate citizens struggle to draft formal applications for rural drinking water, road repairs, and pension entitlements at village secretariats.",
        trackId: "social_impact",
        trackName: "AI for Social Impact",
        trackBadge: "Social Impact",
        trackCssClass: "track-social",
        aiSolution: "A multilingual conversational agent that converses orally in local dialects, summarizes the grievance, and auto-fills official citizen service forms.",
        progressStage: "Working prototype in Tamil and Hindi",
        toolsPlanned: "AI4Bharat IndicWav2Vec, Bhashini API, Llama-3-Indic",
        projectLinks: "https://github.com/example/bhasha-setu",
        publicityConsent: true,
        evaluation: {
          scoreNovelty: 8,
          scoreImportance: 10,
          scoreFeasibility: 9,
          scoreFunctionality: 9,
          scoreDemo: 9,
          scorePotential: 10,
          totalScore: 55,
          evaluatorNotes: "Direct fit with Digital India and AI for Social Impact. High societal utility.",
          evaluatedBy: "Judge",
          evaluatedAt: "2026-10-09T10:30:00Z"
        }
      },
      {
        registrationId: "AIHACK-2026-1455",
        submittedAt: "2026-10-09T09:15:00Z",
        status: "Shortlisted",
        fullName: "Rahul Varma",
        email: "rahul.varma@iitb.ac.in",
        mobile: "9820123456",
        city: "Mumbai",
        state: "Maharashtra",
        collegeStatus: "Yes",
        collegeName: "Indian Institute of Technology (IIT) Bombay",
        collegeCity: "Mumbai",
        department: "Artificial Intelligence & Data Science",
        yearOfStudy: "4th Year (Undergraduate)",
        participationType: "team",
        teamName: "VisionDrishti",
        teamMembers: [
          { name: "Nikhil Joshi", email: "nikhil.j@iitb.ac.in", college: "IIT Bombay" },
          { name: "Shreya Gupta", email: "shreya.g@iitb.ac.in", college: "IIT Bombay" }
        ],
        problemTitle: "Autonomous multi-lingual triage for rural primary health centers",
        problemDesc: "Overburdened primary health staff in tribal zones need instant preliminary risk stratification for respiratory ailments before specialist consultation.",
        trackId: "healthcare",
        trackName: "AI in Healthcare",
        trackBadge: "Healthcare",
        trackCssClass: "track-health",
        aiSolution: "Edge-based computer vision and vitals analysis on low-cost tablet devices running on solar power.",
        progressStage: "Working prototype",
        toolsPlanned: "YOLOv8, ONNX, FastEmbed",
        projectLinks: "https://github.com/example/vision-drishti",
        publicityConsent: true,
        evaluation: {
          scoreNovelty: 9,
          scoreImportance: 9,
          scoreFeasibility: 9,
          scoreFunctionality: 9,
          scoreDemo: 8,
          scorePotential: 9,
          totalScore: 53,
          evaluatorNotes: "High clinical impact and great technical architecture for low-resource environments.",
          evaluatedBy: "Judge",
          evaluatedAt: "2026-10-09T11:00:00Z"
        }
      }
    ];

    localStorage.setItem(this.STORAGE_KEYS.SUBMISSIONS, JSON.stringify(demo));
  }
};

window.HackathonAPI = HackathonAPI;
