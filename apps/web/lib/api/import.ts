import { 
  ImportSession, 
  ImportPreview, 
  ValidationResult, 
  ImportReport, 
  CreateImportSession, 
  UpdateColumnMapping,
  ImportProgress 
} from '@/types/import';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ImportAPI {
  private static getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  static async createImportSession(file: File, data: CreateImportSession): Promise<ImportSession> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Append other data as JSON or individual fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    });

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/import/sessions`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create import session');
    }

    return response.json();
  }

  static async getImportSessions(params: {
    page?: number;
    limit?: number;
    status?: string;
    importType?: string;
  } = {}): Promise<{ sessions: ImportSession[]; total: number }> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const response = await fetch(`${API_BASE}/import/sessions?${queryParams}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch import sessions');
    }

    return response.json();
  }

  static async getImportSession(sessionId: string): Promise<ImportSession> {
    const response = await fetch(`${API_BASE}/import/sessions/${sessionId}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch import session');
    }

    return response.json();
  }

  static async generatePreview(sessionId: string): Promise<ImportPreview> {
    const response = await fetch(`${API_BASE}/import/sessions/${sessionId}/preview`, {
      method: 'POST',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate preview');
    }

    return response.json();
  }

  static async updateColumnMapping(
    sessionId: string, 
    mapping: UpdateColumnMapping
  ): Promise<ImportSession> {
    const response = await fetch(`${API_BASE}/import/sessions/${sessionId}/mapping`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(mapping)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update column mapping');
    }

    return response.json();
  }

  static async validateImportData(sessionId: string): Promise<ValidationResult[]> {
    const response = await fetch(`${API_BASE}/import/sessions/${sessionId}/validate`, {
      method: 'POST',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to validate import data');
    }

    return response.json();
  }

  static async startImport(sessionId: string): Promise<{ jobId: string }> {
    const response = await fetch(`${API_BASE}/import/sessions/${sessionId}/start`, {
      method: 'POST',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to start import');
    }

    return response.json();
  }

  static async getImportReport(sessionId: string): Promise<ImportReport> {
    const response = await fetch(`${API_BASE}/import/sessions/${sessionId}/report`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch import report');
    }

    return response.json();
  }

  static async getImportStatus(sessionId: string): Promise<ImportProgress> {
    const response = await fetch(`${API_BASE}/import/status/${sessionId}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch import status');
    }

    return response.json();
  }

  static async cancelImport(sessionId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/import/sessions/${sessionId}/cancel`, {
      method: 'PUT',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel import');
    }

    return response.json();
  }

  static async rollbackImport(sessionId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/import/sessions/${sessionId}/rollback`, {
      method: 'POST',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to rollback import');
    }

    return response.json();
  }

  static async deleteImportSession(sessionId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/import/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete import session');
    }

    return response.json();
  }
}