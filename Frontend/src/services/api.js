// Central API client for the Placement Portal frontend.
// All requests go through this file so auth headers and error handling
// are in one place.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── helpers ──────────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Generic fetch wrapper.
 * - Automatically adds the JWT header for protected routes.
 * - Parses JSON responses.
 * - Throws an Error with the server's `message` field on non-2xx status.
 */
async function request(path, options = {}) {
  const { body, isFormData, ...rest } = options;

  const headers = {
    ...authHeaders(),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(rest.headers || {}),
  };

  const config = {
    ...rest,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, config);
  } catch {
    throw new Error('Network error: could not reach the server. Is the backend running?');
  }

  // Try to parse JSON; some responses (204 No Content) won't have a body
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    // Surface the server message so the UI can display it directly
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  /** POST /api/auth/register — body: { name, email, password, branch, cgpa, backlogs } */
  register: (data) =>
    request('/auth/register', { method: 'POST', body: data }),

  /** POST /api/auth/login — body: { email, password } */
  login: (data) =>
    request('/auth/login', { method: 'POST', body: data }),
};

// ── Users ─────────────────────────────────────────────────────────────────────

export const userApi = {
  /** GET /api/users/profile — returns full user profile */
  getProfile: () => request('/users/profile'),

  /** PUT /api/users/profile — updates student profile (branch, name, cgpa, backlogs) */
  updateProfile: (data) => request('/users/profile', { method: 'PUT', body: data }),
};

// ── Companies ─────────────────────────────────────────────────────────────────

export const companyApi = {
  /** GET /api/companies — requires auth (any role) */
  getAll: () => request('/companies'),

  /** POST /api/companies — admin only */
  create: (data) =>
    request('/companies', { method: 'POST', body: data }),

  /** PUT /api/companies/:id — admin only */
  update: (id, data) =>
    request(`/companies/${id}`, { method: 'PUT', body: data }),

  /** DELETE /api/companies/:id — admin only */
  delete: (id) =>
    request(`/companies/${id}`, { method: 'DELETE' }),
};

// ── Jobs ──────────────────────────────────────────────────────────────────────

export const jobApi = {
  /**
   * GET /api/jobs?search=&location=&branch=&minCGPA=&includeAll=
   * Returns: { count, jobs }
   * - By default (or for students): only open jobs with future deadlines
   * - With includeAll=true (admins only): all jobs including closed and past deadline
   */
  getAll: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.location) qs.set('location', params.location);
    if (params.branch) qs.set('branch', params.branch);
    if (params.minCGPA !== undefined && params.minCGPA !== '')
      qs.set('minCGPA', params.minCGPA);
    if (params.includeAll) qs.set('includeAll', 'true');
    const query = qs.toString() ? `?${qs}` : '';
    return request(`/jobs${query}`);
  },

  /** POST /api/jobs — admin only */
  create: (data) =>
    request('/jobs', { method: 'POST', body: data }),

  /** PUT /api/jobs/:id — admin only */
  update: (id, data) =>
    request(`/jobs/${id}`, { method: 'PUT', body: data }),

  /** DELETE /api/jobs/:id — admin only */
  delete: (id) =>
    request(`/jobs/${id}`, { method: 'DELETE' }),
};

// ── Applications ──────────────────────────────────────────────────────────────

export const applicationApi = {
  /** GET /api/applications — admin only */
  getAll: () => request('/applications'),

  /** GET /api/applications/my — student only */
  getMine: () => request('/applications/my'),

  /** POST /api/applications/:jobId — student only (no request body needed) */
  apply: (jobId) =>
    request(`/applications/${jobId}`, { method: 'POST', body: {} }),

  /** PATCH /api/applications/:id/status — admin only — body: { status } */
  updateStatus: (applicationId, status) =>
    request(`/applications/${applicationId}/status`, {
      method: 'PATCH',
      body: { status },
    }),
};

// ── Resume ────────────────────────────────────────────────────────────────────

export const resumeApi = {
  /**
   * POST /api/resume/upload — student only
   * Multer field name is "resume". Uses FormData; do NOT set Content-Type manually.
   */
  upload: (file) => {
    const formData = new FormData();
    formData.append('resume', file);
    return request('/resume/upload', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  },

  /** Returns authenticated URL to view current student's resume */
  getMyResumeUrl: () => {
    const token = getToken();
    return `${BASE_URL}/resume/my${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  /** Returns authenticated URL for admin to view any student's resume */
  getResumeByUserIdUrl: (userId) => {
    const token = getToken();
    return `${BASE_URL}/resume/view/${userId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  /** Fetch resume as blob using Authorization header and open inline */
  openResumeInNewTab: async () => {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/resume/my`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      let errData = {};
      try { errData = await res.json(); } catch { /* ignore */ }
      throw new Error(errData.message || `Failed to load resume (${res.status})`);
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  },
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const adminApi = {
  /** GET /api/admin/dashboard — admin only */
  getDashboard: () => request('/admin/dashboard'),
};
