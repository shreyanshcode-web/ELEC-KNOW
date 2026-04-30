-- Seed 001: Populate topics table with initial election education categories
-- Aligns with the Topic Map defined in SKILLS.MD

INSERT INTO topics (name, slug, description, category) VALUES
    ('Voter Registration',
     'voter-registration',
     'Eligibility requirements, registration deadlines, online vs in-person processes, and checking registration status.',
     'voter_registration'),

    ('Primary Elections',
     'primary-elections',
     'Party nominations, open vs closed primaries, caucuses, and delegate allocation.',
     'election_types'),

    ('General Elections',
     'general-elections',
     'The main contest between candidates of major and minor parties, independent candidates.',
     'election_types'),

    ('Runoff Elections',
     'runoff-elections',
     'When and why runoffs happen, plurality vs majority rules.',
     'election_types'),

    ('Special Elections',
     'special-elections',
     'Elections held to fill mid-term vacancies outside the regular election cycle.',
     'election_types'),

    ('Local Elections',
     'local-elections',
     'School boards, mayors, city councils, and ballot measures at the local level.',
     'election_types'),

    ('Election Timeline',
     'election-timeline',
     'Key milestones from candidate announcements through inauguration.',
     'election_timeline'),

    ('In-Person Voting',
     'in-person-voting',
     'Polling places, ID requirements, and what to expect on Election Day.',
     'voting_methods'),

    ('Early Voting',
     'early-voting',
     'Early voting windows, locations, and rules by jurisdiction.',
     'voting_methods'),

    ('Absentee & Mail-In Voting',
     'absentee-mail-voting',
     'Request processes, deadlines, ballot verification, and tracking.',
     'voting_methods'),

    ('Vote Counting Process',
     'vote-counting',
     'Precinct-level counting, tabulation machines, hand counts, chain of custody.',
     'vote_counting'),

    ('Recounts & Audits',
     'recounts-audits',
     'Automatic recount thresholds, requested recounts, and post-election audits.',
     'vote_counting'),

    ('First-Past-the-Post',
     'first-past-the-post',
     'Winner-takes-all system used in the US and UK.',
     'electoral_systems'),

    ('Ranked Choice Voting',
     'ranked-choice-voting',
     'Voters rank candidates by preference, instant runoff elimination.',
     'electoral_systems'),

    ('Proportional Representation',
     'proportional-representation',
     'Seats allocated proportionally to vote share, common in European countries.',
     'electoral_systems'),

    ('Electoral College',
     'electoral-college',
     'US presidential election system: electors, 270 threshold, winner-takes-all vs proportional.',
     'electoral_systems'),

    ('Ballot Measures & Referendums',
     'ballot-measures',
     'Initiatives, referendums, recalls, signature gathering, and certification.',
     'ballot_measures'),

    ('Election Administration',
     'election-administration',
     'Roles of election officials, poll workers, observers, and polling place rules.',
     'election_admin'),

    ('Campaign Finance',
     'campaign-finance',
     'Contribution limits, PACs, Super PACs, disclosure requirements, public financing.',
     'campaign_finance'),

    ('Voter ID Laws',
     'voter-id-laws',
     'Requirements, arguments for and against, variations by jurisdiction.',
     'contested_topics'),

    ('Gerrymandering',
     'gerrymandering',
     'Redistricting practices, partisan vs racial gerrymandering, reform proposals.',
     'contested_topics'),

    ('Voting Machine Security',
     'voting-machine-security',
     'Electronic voting systems, security concerns, paper trail requirements.',
     'contested_topics')

ON CONFLICT (slug) DO NOTHING;
