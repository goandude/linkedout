import type { LinkedInDataset } from '../types/linkedin';

/**
 * Generates a 100% synthetic, non-personal demo dataset matching LinkedIn's exact schema
 * so users can preview every LinkedOut feature before importing their own archive.
 */
export function createSyntheticDemoDataset(): LinkedInDataset {
  const connections = [
    {
      'First Name': 'Elena',
      'Last Name': 'Rostova',
      URL: 'https://www.linkedin.com/in/elena-rostova-demo',
      'Email Address': 'elena.rostova@acme-cloud.example',
      Company: 'Acme Cloud Corp',
      Position: 'VP of Engineering',
      'Connected On': '14 Oct 2025',
    },
    {
      'First Name': 'Marcus',
      'Last Name': 'Vance',
      URL: 'https://www.linkedin.com/in/marcus-vance-demo',
      'Email Address': '',
      Company: 'Northstar Security',
      Position: 'Principal Security Architect',
      'Connected On': '02 Aug 2025',
    },
    {
      'First Name': 'Priya',
      'Last Name': 'Nair',
      URL: 'https://www.linkedin.com/in/priya-nair-demo',
      'Email Address': 'priya@stanford-alumni.edu',
      Company: 'Helios AI',
      Position: 'Staff Product Manager',
      'Connected On': '19 Mar 2024',
    },
    {
      'First Name': 'David',
      'Last Name': 'Chen',
      URL: 'https://www.linkedin.com/in/david-chen-demo',
      'Email Address': 'dchen.dev@gmail.com',
      Company: 'Acme Cloud Corp',
      Position: 'Senior Staff Software Engineer',
      'Connected On': '11 Nov 2023',
    },
    {
      'First Name': 'Sofia',
      'Last Name': 'Alvarez',
      URL: 'https://www.linkedin.com/in/sofia-alvarez-demo',
      'Email Address': '',
      Company: 'Vertex Ventures',
      Position: 'Partner',
      'Connected On': '05 Jun 2022',
    },
    {
      'First Name': 'Liam',
      'Last Name': "O'Connor",
      URL: 'https://www.linkedin.com/in/liam-oconnor-demo',
      'Email Address': 'liam@northstar.example',
      Company: 'Northstar Security',
      Position: 'Director of Cloud Security',
      'Connected On': '27 Jan 2021',
    },
  ];

  const messages = [
    {
      'CONVERSATION ID': 'conv-001',
      'CONVERSATION TITLE': 'Elena Rostova',
      FROM: 'Elena Rostova',
      'SENDER PROFILE URL': 'https://www.linkedin.com/in/elena-rostova-demo',
      TO: 'You',
      'RECIPIENT PROFILE URLS': 'https://www.linkedin.com/in/demo-user',
      DATE: '2026-10-12 14:22:00 UTC',
      SUBJECT: 'Platform Architecture Catch-up',
      CONTENT: 'Hey! Would love to grab coffee next week and compare notes on zero-trust pipelines.',
      FOLDER: 'INBOX',
      ATTACHMENTS: '',
    },
    {
      'CONVERSATION ID': 'conv-001',
      'CONVERSATION TITLE': 'Elena Rostova',
      FROM: 'You',
      'SENDER PROFILE URL': 'https://www.linkedin.com/in/demo-user',
      TO: 'Elena Rostova',
      'RECIPIENT PROFILE URLS': 'https://www.linkedin.com/in/elena-rostova-demo',
      DATE: '2026-10-12 15:05:00 UTC',
      SUBJECT: 'Re: Platform Architecture Catch-up',
      CONTENT: 'Sounds great, Elena! Let us aim for Thursday morning.',
      FOLDER: 'INBOX',
      ATTACHMENTS: '',
    },
    {
      'CONVERSATION ID': 'conv-002',
      'CONVERSATION TITLE': 'Priya Nair',
      FROM: 'Priya Nair',
      'SENDER PROFILE URL': 'https://www.linkedin.com/in/priya-nair-demo',
      TO: 'You',
      'RECIPIENT PROFILE URLS': 'https://www.linkedin.com/in/demo-user',
      DATE: '2024-04-02 09:15:00 UTC',
      SUBJECT: 'Referral for Staff PM role',
      CONTENT: 'Happy to put in a referral for you at Helios AI whenever you are ready!',
      FOLDER: 'INBOX',
      ATTACHMENTS: 'Helios_Role_Spec.pdf',
    },
    {
      'CONVERSATION ID': 'conv-003',
      'CONVERSATION TITLE': 'Alex Rivera (Recruiter)',
      FROM: 'Alex Rivera',
      'SENDER PROFILE URL': 'https://www.linkedin.com/in/alex-rivera-recruiter',
      TO: 'You',
      'RECIPIENT PROFILE URLS': 'https://www.linkedin.com/in/demo-user',
      DATE: '2025-09-18 18:40:00 UTC',
      SUBJECT: 'Principal Engineer Opportunity',
      CONTENT: 'Hi there, reaching out regarding a Principal Engineer opening on our core infra team.',
      FOLDER: 'INBOX',
      ATTACHMENTS: '',
    },
  ];

  const invitations = [
    {
      From: 'Marcus Vance',
      To: 'You',
      'Sent At': '02 Aug 2025',
      Message: 'Enjoyed your talk on browser-local security!',
      Direction: 'INCOMING',
      inviterProfileUrl: 'https://www.linkedin.com/in/marcus-vance-demo',
      inviteeProfileUrl: 'https://www.linkedin.com/in/demo-user',
    },
    {
      From: 'You',
      To: 'Elena Rostova',
      'Sent At': '14 Oct 2025',
      Message: 'Great meeting you at the Cloud Summit.',
      Direction: 'OUTGOING',
      inviterProfileUrl: 'https://www.linkedin.com/in/demo-user',
      inviteeProfileUrl: 'https://www.linkedin.com/in/elena-rostova-demo',
    },
  ];

  const endorsements_received = [
    {
      'Endorsement Date': '2025-11-01',
      'Skill Name': 'Cloud Security',
      'Endorser First Name': 'Elena',
      'Endorser Last Name': 'Rostova',
      'Endorser Public Url': 'https://www.linkedin.com/in/elena-rostova-demo',
      'Endorsement Status': 'ACCEPTED',
    },
    {
      'Endorsement Date': '2024-06-15',
      'Skill Name': 'System Architecture',
      'Endorser First Name': 'David',
      'Endorser Last Name': 'Chen',
      'Endorser Public Url': 'https://www.linkedin.com/in/david-chen-demo',
      'Endorsement Status': 'ACCEPTED',
    },
  ];

  const saved_jobs = [
    {
      'Saved Date': '2026-11-10',
      'Job Url': 'https://www.linkedin.com/jobs/view/999001',
      'Job Title': 'VP of Platform Engineering',
      'Company Name': 'Acme Cloud Corp',
    },
    {
      'Saved Date': '2026-11-05',
      'Job Url': 'https://www.linkedin.com/jobs/view/999002',
      'Job Title': 'Principal Security Architect',
      'Company Name': 'Northstar Security',
    },
  ];

  const job_applications = [
    {
      'Application Date': '2026-11-06',
      'Contact Email': 'demo@example.com',
      'Contact Phone Number': '+1-555-0100',
      'Company Name': 'Northstar Security',
      'Job Title': 'Principal Security Architect',
      'Job Url': 'https://www.linkedin.com/jobs/view/999002',
      'Resume Name': 'Resume_2026.pdf',
      'Question And Answers': 'Years of Cloud Security experience?: 10+',
    },
  ];

  const learning = [
    {
      'Content Title': 'Zero-Trust Architecture in Modern Web Apps',
      'Content Description': 'Deep dive into browser isolation, CSP, and client-side encryption.',
      'Content Type': 'COURSE',
      'Content Last Watched Date (if viewed)': '2026-10-20',
      'Content Completed At (if completed)': '2026-10-22',
      'Content Saved': 'true',
      'Notes taken on videos (if taken)': 'Always enforce connect-src self for local-first apps.',
    },
    {
      'Content Title': 'WebAssembly & DuckDB in the Browser',
      'Content Description': 'Running analytical SQL workloads locally without a backend.',
      'Content Type': 'VIDEO',
      'Content Last Watched Date (if viewed)': '2026-11-01',
      'Content Completed At (if completed)': '',
      'Content Saved': 'true',
      'Notes taken on videos (if taken)': '',
    },
  ];

  const ad_targeting = [
    {
      'Member Age': '35 to 54',
      'Company Size': '1001-5000 employees; 10,001+ employees',
      'Job Functions': 'Engineering; Information Technology',
      'Job Seniorities': 'Director; VP; Senior',
      'Member Interests': 'Cloud Computing; Cybersecurity; Artificial Intelligence',
      'High Value Audience Segments': 'Enterprise Tech Decision Makers',
      'Profile Locations': 'San Francisco Bay Area',
    },
  ];

  const receipts = [
    {
      'First Name': 'Demo',
      'Last Name': 'User',
      'Billing Country': 'US',
      'Postal Code': '94105',
      'Transaction Made At': '2026-01-15',
      'Payment Method Type': 'CARD',
      'Invoice Number': 'INV-DEMO-001',
      Description: 'LinkedIn Premium Career (Monthly)',
      'Tax Amount': '0.00',
      'Sub Total': '39.99',
      'Total Amount': '39.99',
      'Currency Code': 'USD',
    },
  ];

  const articles = [
    {
      filename: '2026-10-08-local-first-analytics.html',
      title: 'Why Local-First Analytics Is the Future of Personal Data',
      date: '2026-10-08',
      textContent:
        'Your personal career archive belongs on your own device. Modern browsers with IndexedDB, Web Workers, and Service Workers make zero-server analytics fast and private.',
      htmlBody:
        '<h1>Why Local-First Analytics Is the Future of Personal Data</h1><p>Your personal career archive belongs on your own device. Modern browsers with IndexedDB, Web Workers, and Service Workers make zero-server analytics fast and private.</p>',
    },
  ];

  const tables = {
    connections,
    messages,
    invitations,
    endorsements_received,
    saved_jobs,
    job_applications,
    learning,
    ad_targeting,
    receipts,
  };

  const tableInfos = Object.entries(tables).map(([key, rows]) => ({
    key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    sourceFile: `${key}.csv`,
    rowCount: rows.length,
    columns: rows.length > 0 ? Object.keys(rows[0]) : [],
  }));

  return {
    meta: {
      fileName: 'Synthetic_Demo_Export.zip',
      importedAt: new Date().toISOString(),
      fileSizeBytes: 128400,
      tableCount: tableInfos.length,
      totalRows: tableInfos.reduce((acc, t) => acc + t.rowCount, 0),
      tables: tableInfos,
    },
    tables,
    articles,
  };
}
