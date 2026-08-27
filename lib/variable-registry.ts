/**
 * Registry of available merge-field variables, grouped by domain.
 *
 * Each variable maps to its `#TOKEN#` name (without the `#`s) and a human-readable
 * label plus a dummy value shown in the sidebar and used for preview rendering.
 */

export interface MergeVariable {
  /** The token name between hashes, e.g. "LEAD_NAME" → output is #LEAD_NAME# */
  token: string
  /** Human-readable label shown in the picker */
  label: string
  /** Dummy value shown in the sidebar for reference */
  dummyValue: string
}

export interface VariableGroup {
  name: string
  variables: MergeVariable[]
}

export const VARIABLE_GROUPS: VariableGroup[] = [
  {
    name: 'Lead',
    variables: [
      { token: 'LEAD_NAME', label: 'Lead Name', dummyValue: 'Mr. Samie Student' },
      { token: 'LEAD_NUMBER', label: 'Lead Number', dummyValue: '270826000026' },
      { token: 'LEAD_NO', label: 'Lead No (short)', dummyValue: 'LEAD-26' },
      { token: 'LEAD_EMAIL', label: 'Lead Email', dummyValue: 'samie@example.com' },
      { token: 'LEAD_PHONE', label: 'Lead Phone', dummyValue: '+65 27847842' },
      { token: 'LEAD_PARENT_NAME', label: 'Parent/Guardian', dummyValue: 'Mr. Samie Student' },
      { token: 'LEAD_RELATION', label: 'Relation with Child', dummyValue: 'Parent' },
      { token: 'LEAD_MESSAGE', label: 'Message', dummyValue: 'Interested in Grade 9 admission' },
      { token: 'LEAD_FRESHNESS', label: 'Lead Type', dummyValue: 'Fresh' },
      { token: 'LEAD_STATUS', label: 'Lead Status', dummyValue: 'New' },
      { token: 'LEAD_FORM_TYPE', label: 'Form Type', dummyValue: 'Enquiry' },
    ],
  },
  {
    name: 'Child',
    variables: [
      { token: 'CHILD_NAME', label: 'Child Name', dummyValue: 'Keren Smith' },
      { token: 'CHILD_GRADE', label: 'Grade Applied', dummyValue: 'Grade 9' },
      { token: 'GRADE', label: 'Grade', dummyValue: 'Grade 9' },
    ],
  },
  {
    name: 'Location',
    variables: [
      { token: 'LEAD_COUNTRY', label: 'Country', dummyValue: 'India' },
      { token: 'LEAD_CITY', label: 'City', dummyValue: 'Nāngloi Jāt' },
      { token: 'COUNTRY_STATE_CITY', label: 'Country | City', dummyValue: 'India | Nāngloi Jāt' },
      { token: 'LEAD_IP', label: 'IP Address', dummyValue: '125.16.48.26' },
    ],
  },
  {
    name: 'Appointment',
    variables: [
      { token: 'APPOINTMENT_DATE_TIME', label: 'Date & Time', dummyValue: 'Sep 2, 2026 at 03:30 PM' },
      { token: 'APPOINTMENT_URL', label: 'Appointment URL', dummyValue: 'https://connect2excel.org/book' },
      { token: 'APPOINTMENT_LOCATION', label: 'Location', dummyValue: 'Online (Zoom)' },
      { token: 'APPOINTMENT_DURATION', label: 'Duration', dummyValue: '30 minutes' },
      { token: 'TIMEZONE', label: 'Timezone', dummyValue: 'Asia/Kolkata (UTC +05:30)' },
    ],
  },
  {
    name: 'Attribution',
    variables: [
      { token: 'LEAD_SOURCE', label: 'Source', dummyValue: 'Website' },
      { token: 'LEAD_CAMPAIGN', label: 'Campaign', dummyValue: 'Summer 2026' },
      { token: 'LEAD_AD_SET', label: 'Ad Set', dummyValue: 'SG Parents' },
      { token: 'LEAD_URL', label: 'Source URL', dummyValue: 'https://connect2excel.org/contact' },
    ],
  },
  {
    name: 'School',
    variables: [
      { token: 'SCHOOL_NAME', label: 'School Name', dummyValue: 'Connect2Excel International School' },
      { token: 'SCHOOL_EMAIL', label: 'School Email', dummyValue: 'support@connect2excel.org' },
      { token: 'COUNSELOR_NAME', label: 'Counselor Name', dummyValue: 'Sarah Johnson' },
      { token: 'COUNSELOR_EMAIL', label: 'Counselor Email', dummyValue: 'sarah@connect2excel.org' },
      { token: 'BASE_URL', label: 'Base URL', dummyValue: 'https://connect2excel.org' },
    ],
  },
  {
    name: 'Registration',
    variables: [
      { token: 'REGISTRATION_URL', label: 'Registration URL', dummyValue: 'https://app.connect2excel.org/register' },
      { token: 'ADMISSION_URL', label: 'Admission URL', dummyValue: 'https://app.connect2excel.org/admission' },
    ],
  },
  {
    name: 'Email',
    variables: [
      { token: 'EMAIL_HEADER_SUBJECT', label: 'Email Subject', dummyValue: 'New Lead Assigned' },
      { token: 'EMAIL_LOGO_URL', label: 'Logo URL', dummyValue: 'https://staging.connect2excel.org/static/theme2/images/template/Email_Header.png' },
    ],
  },
]

/** Flat list of all variables for quick lookup. */
export const ALL_VARIABLES: MergeVariable[] = VARIABLE_GROUPS.flatMap((g) => g.variables)

/** Look up a variable by its token name. */
export function getVariable(token: string): MergeVariable | undefined {
  return ALL_VARIABLES.find((v) => v.token === token)
}
