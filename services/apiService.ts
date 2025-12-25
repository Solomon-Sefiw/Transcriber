
import { JudicialRecord, User, TranscriptionResponse } from "../types";

// Simulated Database Keys in LocalStorage
const DB_RECORDS_KEY = 'waghimra_records_db';
const DB_USERS_KEY = 'waghimra_users_db';

/**
 * VIRTUAL ASP.NET CORE BACKEND SERVICE
 * Handles Identity, Authorization, and Content Management
 */
export const apiService = {
  // Authentication & Identity Management
  async login(email: string, password: string): Promise<User> {
    // Simulated Latency for "ASP.NET Identity" check
    await new Promise(res => setTimeout(res, 800));

    // Hardcoded demo accounts for role testing
    const accounts: Record<string, User> = {
      "clerk@court.et": { id: "USR-001", name: "Mulgeta W.", email: "clerk@court.et", role: "Clerk", token: "jwt_clerk_token" },
      "judge@court.et": { id: "USR-002", name: "Hon. Aster K.", email: "judge@court.et", role: "Judge", token: "jwt_judge_token" },
      "admin@ court.et": { id: "USR-003", name: "System Admin", email: "admin@court.et", role: "Admin", token: "jwt_admin_token" }
    };

    const user = accounts[email.toLowerCase()];
    if (user && password === "court123") {
      return user;
    }
    throw new Error("401: Unauthorized - Invalid Judicial Credentials");
  },

  // Save Record with Ownership Check
  async saveRecord(title: string, transcript: string, user: User): Promise<void> {
    const records = this._getRawRecords();
    const newRecord: JudicialRecord = {
      id: `REC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      title,
      transcript,
      createdAt: new Date().toISOString(),
      ownerId: user.id, // IDENTITY LINKING
      fileSize: `${(new Blob([transcript]).size / 1024).toFixed(1)} KB`
    };

    records.push(newRecord);
    localStorage.setItem(DB_RECORDS_KEY, JSON.stringify(records));
  },

  // AUTHORIZED FETCH: Filtering logic for User Content Management
  async getMyRecords(user: User): Promise<JudicialRecord[]> {
    const allRecords = this._getRawRecords();
    
    // ROLE-BASED ACCESS CONTROL (RBAC)
    // Admin and Judges see everything. Clerks see only their own.
    if (user.role === 'Admin' || user.role === 'Judge') {
      return allRecords;
    }

    // IDENTITY FILTERING
    return allRecords.filter(record => record.ownerId === user.id);
  },

  // Helper to simulate DB retrieval
  _getRawRecords(): JudicialRecord[] {
    const data = localStorage.getItem(DB_RECORDS_KEY);
    return data ? JSON.parse(data) : [];
  }
};
