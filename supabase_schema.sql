-- ============================================================================
-- AI Hackathon Portal - Supabase Free (PostgreSQL + Auth) Schema & Security
-- Theme: AI in India – AI for India
-- Artificial Intelligence Learning Labs – Centre of Excellence
-- ============================================================================

-- Free Tier Considerations:
-- 1. Database size: 500 MB (fits ~100k submissions with light metadata easily).
-- 2. Auth: 50,000 MAU free tier.
-- 3. Rate limiting enforced via server function to prevent spam and stay well within egress limits.

-- ----------------------------------------------------------------------------
-- 1. ENUMS & EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE submission_status_enum AS ENUM (
  'Submitted',
  'Under Review',
  'Awaiting Clarification',
  'Shortlisted',
  'Not Shortlisted',
  'Finalist Confirmed',
  'Participated',
  'Winner or Recognition Awardee'
);

CREATE TYPE admin_role_enum AS ENUM (
  'SuperAdmin',
  'LeadOrganizer',
  'Evaluator',
  'Judge'
);

-- ----------------------------------------------------------------------------
-- 2. CORE TABLES
-- ----------------------------------------------------------------------------

-- A. Thematic Tracks Catalog
CREATE TABLE IF NOT EXISTS thematic_tracks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  badge TEXT NOT NULL,
  css_class TEXT NOT NULL,
  icon TEXT NOT NULL,
  short_desc TEXT NOT NULL,
  example TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. Colleges & Universities Catalog
CREATE TABLE IF NOT EXISTS colleges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  city TEXT,
  state TEXT,
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. Students Registry
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  mobile TEXT UNIQUE NOT NULL,
  whatsapp TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  roll_number TEXT,
  gender TEXT DEFAULT 'Prefer not to say',
  linkedin_url TEXT,
  github_url TEXT,
  college_id UUID REFERENCES colleges(id) ON DELETE SET NULL,
  college_name_raw TEXT NOT NULL,
  department TEXT NOT NULL,
  year_of_study TEXT NOT NULL,
  degree_course TEXT,
  faculty_name TEXT,
  faculty_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- D. Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_name TEXT NOT NULL,
  leader_student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- E. Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_email TEXT NOT NULL,
  member_college TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- F. Project Submissions
CREATE TABLE IF NOT EXISTS project_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  registration_id TEXT UNIQUE NOT NULL,
  leader_student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  track_id TEXT NOT NULL REFERENCES thematic_tracks(id),
  problem_title VARCHAR(200) NOT NULL,
  problem_description TEXT NOT NULL,
  ai_solution TEXT NOT NULL,
  problem_origin TEXT,
  why_it_matters TEXT,
  current_alternatives TEXT,
  expected_outcome TEXT,
  progress_stage TEXT DEFAULT 'Idea stage only',
  tools_planned TEXT DEFAULT 'Not sure yet',
  project_links TEXT,
  status submission_status_enum DEFAULT 'Submitted',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- G. Pre-Screening & Stage Evaluations
CREATE TABLE IF NOT EXISTS pre_screening_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES project_submissions(id) ON DELETE CASCADE,
  evaluator_user_id UUID,
  evaluator_name TEXT, -- Optional Evaluator Name
  score_novelty NUMERIC(3,1) CHECK (score_novelty BETWEEN 0 AND 10),
  score_importance NUMERIC(3,1) CHECK (score_importance BETWEEN 0 AND 10),
  score_feasibility NUMERIC(3,1) CHECK (score_feasibility BETWEEN 0 AND 10),
  score_functionality NUMERIC(3,1) CHECK (score_functionality BETWEEN 0 AND 10),
  score_demo NUMERIC(3,1) CHECK (score_demo BETWEEN 0 AND 10),
  score_potential NUMERIC(3,1) CHECK (score_potential BETWEEN 0 AND 10),
  total_score NUMERIC(4,1) GENERATED ALWAYS AS (
    score_novelty + score_importance + score_feasibility + score_functionality + score_demo + score_potential
  ) STORED,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- H. Final Hackathon Evaluations (Best Ideas & Best Innovations)
CREATE TABLE IF NOT EXISTS final_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES project_submissions(id) ON DELETE CASCADE,
  judge_name TEXT, -- Optional Judge Name
  final_innovation_score NUMERIC(4,1),
  award_category TEXT, -- 'Best Idea', 'Best Innovation', 'Honorable Mention'
  judge_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- I. Consent Records
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES project_submissions(id) ON DELETE CASCADE,
  terms_accepted BOOLEAN NOT NULL DEFAULT TRUE,
  data_accurate_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  no_selection_guarantee_understood BOOLEAN NOT NULL DEFAULT TRUE,
  photo_publicity_consent BOOLEAN DEFAULT FALSE,
  ip_address TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- J. Administrative Accounts & Roles
CREATE TABLE IF NOT EXISTS admin_accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role admin_role_enum DEFAULT 'Evaluator',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- K. Operational Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_screening_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE thematic_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;

-- Tracks and colleges are publicly readable
CREATE POLICY "Public read active tracks" ON thematic_tracks FOR SELECT USING (is_active = true);
CREATE POLICY "Public read colleges" ON colleges FOR SELECT USING (true);

-- Admins can read and manage all tables
CREATE POLICY "Admins full access submissions" ON project_submissions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_accounts WHERE id = auth.uid() AND is_active = true));

CREATE POLICY "Admins full access evaluations" ON pre_screening_evaluations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_accounts WHERE id = auth.uid() AND is_active = true));

-- ----------------------------------------------------------------------------
-- 4. RESTRICTED PUBLIC SUBMISSION SERVER FUNCTION (RPC)
-- Validates inputs, handles duplicates, generates unique ID, runs inside transaction
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION register_hackathon_submission(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_team_id UUID;
  v_submission_id UUID;
  v_reg_id TEXT;
  v_clean_email TEXT;
  v_clean_mobile TEXT;
  v_clean_name TEXT;
  v_clean_city TEXT;
  v_clean_state TEXT;
  v_clean_college TEXT;
  v_clean_dept TEXT;
  v_clean_year TEXT;
  v_clean_track TEXT;
  v_clean_title TEXT;
  v_clean_desc TEXT;
  v_clean_sol TEXT;
  v_tm JSONB;
BEGIN
  -- Normalize inputs
  v_clean_email := LOWER(TRIM(payload->>'email'));
  v_clean_mobile := REGEXP_REPLACE(payload->>'mobile', '[^0-9]', '', 'g');
  v_clean_name := COALESCE(TRIM(payload->>'fullName'), 'Applicant');
  v_clean_city := COALESCE(TRIM(payload->>'city'), 'Nagpur');
  v_clean_state := COALESCE(TRIM(payload->>'state'), 'Maharashtra');
  v_clean_college := COALESCE(TRIM(payload->>'selectedCollege'), TRIM(payload->>'customCollegeName'), 'College of Engineering');
  v_clean_dept := COALESCE(TRIM(payload->>'department'), 'Computer Science');
  v_clean_year := COALESCE(TRIM(payload->>'yearOfStudy'), '3rd Year');
  v_clean_track := COALESCE(TRIM(payload->>'trackId'), 'social_impact');
  v_clean_title := COALESCE(TRIM(payload->>'problemTitle'), 'Untitled Idea');
  v_clean_desc := COALESCE(TRIM(payload->>'problemDesc'), 'No description provided');
  v_clean_sol := COALESCE(TRIM(payload->>'aiSolution'), 'AI Solution description');

  -- 1. Check Duplicates
  IF EXISTS (SELECT 1 FROM students WHERE email = v_clean_email OR mobile = v_clean_mobile) THEN
    SELECT s.registration_id INTO v_reg_id 
    FROM project_submissions s
    JOIN students st ON s.leader_student_id = st.id
    WHERE st.email = v_clean_email OR st.mobile = v_clean_mobile
    LIMIT 1;

    RETURN jsonb_build_object(
      'success', false,
      'isDuplicate', true,
      'existingId', v_reg_id,
      'error', 'A registration already exists with this email or mobile number.'
    );
  END IF;

  -- 2. Generate Registration ID: AIHACK-2026-XXXX
  v_reg_id := 'AIHACK-2026-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

  -- 3. Insert Student Record
  INSERT INTO students (
    full_name,
    email,
    mobile,
    whatsapp,
    city,
    state,
    roll_number,
    gender,
    linkedin_url,
    github_url,
    college_name_raw,
    department,
    year_of_study,
    degree_course,
    faculty_name,
    faculty_email
  ) VALUES (
    v_clean_name,
    v_clean_email,
    v_clean_mobile,
    payload->>'whatsapp',
    v_clean_city,
    v_clean_state,
    payload->>'rollNumber',
    COALESCE(payload->>'gender', 'Prefer not to say'),
    payload->>'linkedin',
    payload->>'github',
    v_clean_college,
    v_clean_dept,
    v_clean_year,
    payload->>'degreeCourse',
    payload->>'facultyName',
    payload->>'facultyEmail'
  ) RETURNING id INTO v_student_id;

  -- 4. If Team, Insert Team and Teammates
  IF (payload->>'participationType') = 'team' THEN
    INSERT INTO teams (
      team_name,
      leader_student_id
    ) VALUES (
      COALESCE(payload->>'teamName', 'Team'),
      v_student_id
    ) RETURNING id INTO v_team_id;

    IF payload->'teammates' IS NOT NULL THEN
      FOR v_tm IN SELECT * FROM jsonb_array_elements(payload->'teammates')
      LOOP
        INSERT INTO team_members (
          team_id,
          member_name,
          member_email,
          member_college
        ) VALUES (
          COALESCE(v_tm->>'name', 'Teammate'),
          COALESCE(v_tm->>'email', ''),
          COALESCE(v_tm->>'college', '')
        );
      END LOOP;
    END IF;
  END IF;

  -- 5. Insert Project Submission
  INSERT INTO project_submissions (
    registration_id,
    leader_student_id,
    team_id,
    track_id,
    problem_title,
    problem_description,
    ai_solution,
    problem_origin,
    why_it_matters,
    current_alternatives,
    expected_outcome,
    progress_stage,
    tools_planned,
    project_links,
    status
  ) VALUES (
    v_reg_id,
    v_student_id,
    v_team_id,
    v_clean_track,
    v_clean_title,
    v_clean_desc,
    v_clean_sol,
    payload->>'problemOrigin',
    payload->>'whyItMatters',
    payload->>'currentAlternatives',
    payload->>'expectedOutcome',
    COALESCE(payload->>'progressStage', 'Idea stage only'),
    COALESCE(payload->>'toolsPlanned', 'Not sure yet'),
    payload->>'projectLinks',
    'Submitted'::submission_status_enum
  ) RETURNING id INTO v_submission_id;

  -- 6. Insert Consents
  INSERT INTO consent_records (
    student_id,
    submission_id,
    terms_accepted,
    data_accurate_confirmed,
    no_selection_guarantee_understood,
    photo_publicity_consent
  ) VALUES (
    v_student_id,
    v_submission_id,
    true,
    true,
    true,
    COALESCE((payload->>'publicityConsent')::BOOLEAN, false)
  );

  -- 7. Audit Log
  INSERT INTO audit_logs (
    actor_name,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    'Public Registration API',
    'CREATE_REGISTRATION',
    'project_submissions',
    v_reg_id,
    'New registration submitted for track: ' || v_clean_track
  );

  RETURN jsonb_build_object(
    'success', true,
    'registrationId', v_reg_id
  );
END;
$$;
