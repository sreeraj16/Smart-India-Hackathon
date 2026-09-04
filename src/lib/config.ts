export const REGISTRATION_CLOSED = true;

export const REGISTRATION_CLOSED_MESSAGE = {
  title: 'Team Registration Closed',
  subtitle: 'The registration deadline has ended. No new team registrations are being accepted at this time.'
};

export const ROLE_PORTALS: Record<string, string> = {
  admin: '/admin/dashboard',
  coordinator: '/coordinator/dashboard',
  jury: '/jury/dashboard',
  team_lead: '/dashboard',
  team_member: '/team-member'
};
