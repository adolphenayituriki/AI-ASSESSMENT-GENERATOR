export const formatDate = (dateStr, opts = {}) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...opts,
  });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const errorMessage = (err, fallback = 'Something went wrong') => {
  return err?.response?.data?.message || err?.message || fallback;
};

export const roleHome = (role) => {
  if (role === 'teacher' || role === 'leader' || role === 'admin') return '/app';
  return '/login';
};

export const roleLabel = (role) => {
  if (role === 'admin') return 'Administrator';
  if (role === 'leader') return 'School Leader';
  if (role === 'teacher') return 'Teacher';
  return role || '';
};

export const SUBJECTS = [
  'Mathematics',
  'English',
  'Kinyarwanda',
  'French',
  'Kiswahili',
  'Science & Elementary Technology (SET)',
  'Social Studies',
  'Expressive Arts',
  'Physics',
  'Chemistry',
  'Biology',
  'Geography',
  'History',
  'Economics',
  'Computer Science',
  'Religion & Ethics',
  'Agriculture',
  'Physical Education',
  'Music',
];
