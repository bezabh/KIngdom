export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BugCategory = 
  | 'ui_glitch' 
  | 'audio_translation' 
  | 'voice_synthesis' 
  | 'payment_telebirr' 
  | 'scholarship_data' 
  | 'performance_lag' 
  | 'biometric_security' 
  | 'other';

export interface DeviceTelemetry {
  userAgent: string;
  platform: string;
  screenResolution: string;
  viewportSize: string;
  language: string;
  onlineStatus: boolean;
  activeTab: string;
  memoryUsage?: string;
  connectionType?: string;
  devicePixelRatio: number;
  shakeVelocity?: number;
  sensorSample?: { x: number; y: number; z: number };
}

export interface BugReport {
  id: string;
  ticketNumber: string;
  timestamp: number;
  createdAtISO: string;
  title: string;
  description: string;
  category: BugCategory;
  severity: BugSeverity;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  activeTab: string;
  telemetry: DeviceTelemetry;
  attachments?: {
    name: string;
    type: string;
    size: number;
    previewUrl?: string;
  }[];
  voiceNoteDurationSec?: number;
  status: 'submitted' | 'investigating' | 'resolved';
  resolvedAt?: string;
}

const STORAGE_BUG_REPORTS_KEY = 'axumite_sovereign_bug_reports';

export class BugReportService {
  /**
   * Captures automatic client environment telemetry for debugging.
   */
  public static collectTelemetry(activeTab: string, shakeVelocity?: number, sensorSample?: { x: number; y: number; z: number }): DeviceTelemetry {
    if (typeof window === 'undefined') {
      return {
        userAgent: 'SSR',
        platform: 'Unknown',
        screenResolution: 'N/A',
        viewportSize: 'N/A',
        language: 'en',
        onlineStatus: true,
        activeTab,
        devicePixelRatio: 1,
      };
    }

    const nav = window.navigator as any;
    const memory = (performance as any)?.memory;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    return {
      userAgent: nav.userAgent || 'Unknown',
      platform: nav.platform || 'Web',
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      language: nav.language || 'en',
      onlineStatus: nav.onLine ?? true,
      activeTab,
      devicePixelRatio: window.devicePixelRatio || 1,
      memoryUsage: memory ? `${Math.round(memory.usedJSHeapSize / (1024 * 1024))}MB / ${Math.round(memory.jsHeapSizeLimit / (1024 * 1024))}MB` : undefined,
      connectionType: connection ? `${connection.effectiveType || connection.type || 'unknown'}` : undefined,
      shakeVelocity,
      sensorSample,
    };
  }

  /**
   * Submits and records a new bug report.
   */
  public static submitReport(reportData: Omit<BugReport, 'id' | 'ticketNumber' | 'timestamp' | 'createdAtISO' | 'status'>): BugReport {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `AXUM-BUG-${randomSuffix}`;
    const id = `report_${timestamp}_${randomSuffix}`;

    const newReport: BugReport = {
      ...reportData,
      id,
      ticketNumber,
      timestamp,
      createdAtISO: new Date(timestamp).toISOString(),
      status: 'submitted',
    };

    try {
      const existing = this.getAllReports();
      const updated = [newReport, ...existing].slice(0, 50); // Keep last 50 reports
      localStorage.setItem(STORAGE_BUG_REPORTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist bug report in localStorage', e);
    }

    return newReport;
  }

  /**
   * Retrieves all locally submitted bug reports.
   */
  public static getAllReports(): BugReport[] {
    try {
      const stored = localStorage.getItem(STORAGE_BUG_REPORTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Exports bug reports as a formatted JSON bundle.
   */
  public static exportReportsAsJson(): string {
    const reports = this.getAllReports();
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        engine: 'Axumite Sovereign Shake-to-Report Diagnostics v5',
        totalCount: reports.length,
        reports,
      },
      null,
      2
    );
  }

  /**
   * Clears all stored bug reports.
   */
  public static clearAllReports(): void {
    try {
      localStorage.removeItem(STORAGE_BUG_REPORTS_KEY);
    } catch {
      // ignore
    }
  }
}
