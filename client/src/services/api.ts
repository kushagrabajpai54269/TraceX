// ============================================================
// TraceX API client — Phase 3 update
// All frontend → backend communication goes through this module.
// ============================================================
import axios from 'axios';
import type {
  TransactionPage,
  AddressValidation,
  Investigation,
  InvestigationListResponse,
  DashboardStats,
  DeleteResponse,
  InvestigationStatus,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// Unwrap server error messages into plain Error objects
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (axios.isAxiosError(err)) {
      const serverMsg = err.response?.data?.error?.message;
      const message = serverMsg || err.message || 'Request failed';
      return Promise.reject(new Error(message));
    }
    return Promise.reject(err);
  }
);

// ── Address API ───────────────────────────────────────────────

export const addressApi = {
  validate: async (address: string): Promise<AddressValidation> => {
    const { data } = await client.post<AddressValidation>('/api/addresses/validate', { address });
    return data;
  },

  getTransactions: async (
    address: string,
    page = 1,
    limit = 25
  ): Promise<TransactionPage> => {
    const { data } = await client.get<TransactionPage>(
      `/api/addresses/${encodeURIComponent(address)}/transactions`,
      { params: { page, limit } }
    );
    return data;
  },
};

// ── Dashboard API ─────────────────────────────────────────────

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await client.get<DashboardStats>('/api/dashboard/stats');
    return data;
  },
};

// ── Investigations API ────────────────────────────────────────

export const investigationsApi = {
  list: async (params?: {
    status?: InvestigationStatus | 'all';
    sort?: string;
    dir?: 'asc' | 'desc';
  }): Promise<InvestigationListResponse> => {
    const query: Record<string, string> = {};
    if (params?.status && params.status !== 'all') query.status = params.status;
    if (params?.sort) query.sort = params.sort;
    if (params?.dir) query.dir = params.dir;

    const { data } = await client.get<InvestigationListResponse>('/api/investigations', {
      params: query,
    });
    return data;
  },

  get: async (id: string): Promise<Investigation> => {
    const { data } = await client.get<Investigation>(`/api/investigations/${id}`);
    return data;
  },

  create: async (payload: { title: string; targetAddress: string }): Promise<Investigation> => {
    const { data } = await client.post<Investigation>('/api/investigations', payload);
    return data;
  },

  update: async (
    id: string,
    payload: { title?: string; status?: InvestigationStatus }
  ): Promise<Investigation> => {
    const { data } = await client.patch<Investigation>(`/api/investigations/${id}`, payload);
    return data;
  },

  delete: async (id: string): Promise<DeleteResponse> => {
    const { data } = await client.delete<DeleteResponse>(`/api/investigations/${id}`);
    return data;
  },

  trace: async (id: string, depth: number, direction: string): Promise<import('../types').TraceResponse> => {
    const { data } = await client.get<import('../types').TraceResponse>(`/api/investigations/${id}/trace`, {
      params: { depth, direction },
      timeout: 60_000, // Trace can take longer due to multiple API calls
    });
    return data;
  },

  analyze: async (id: string, traceData: import('../types').TraceResponse): Promise<import('../types').InvestigationAnalysis> => {
    const { data } = await client.post<import('../types').InvestigationAnalysis>(`/api/investigations/${id}/analysis`, traceData);
    return data;
  },

  askAssistant: async (
    id: string,
    payload: {
      message: string;
      history: import('../types').ChatMessage[];
      analysis: import('../types').InvestigationAnalysis;
      limitReached: boolean;
    }
  ): Promise<{ reply: string }> => {
    const { data } = await client.post<{ reply: string }>(
      `/api/investigations/${id}/assistant`,
      payload,
      { timeout: 45_000 }
    );
    return data;
  },
};

// ── Health API ────────────────────────────────────────────────

export const healthApi = {
  check: async () => {
    const { data } = await client.get('/api/health');
    return data;
  },
};

export default client;
