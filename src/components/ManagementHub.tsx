import React, { useState } from 'react';
import { UserProfile, AppSystemConfig } from '../types';
import { UserManagementView } from './UserManagementView';
import { PaymentManagementView } from './PaymentManagementView';
import { CustomerManagementView } from './CustomerManagementView';
import { AdminConfigView } from './AdminConfigView';
import { RbacDashboardView } from './rbac/RbacDashboardView';
import { AuditLogModal } from './AuditLogModal';
import { SystemActivityView } from './SystemActivityView';
import { AdminDataExportModal } from './AdminDataExportModal';
import { SuperAdminDashboard } from './super-admin/SuperAdminDashboard';
import { SaasSubscriptionAdminDeck } from './SaasSubscriptionAdminDeck';
import { DashboardLayoutShell, DashboardTabItem } from './DashboardLayoutShell';
import { HapticFeedbackToggle } from './HapticFeedbackToggle';
import { HapticPatternSelector } from './HapticPatternSelector';
import { HapticAccessibilitySettings } from './HapticAccessibilitySettings';
import { SwipeSensitivitySlider } from './SwipeSensitivitySlider';
import { BatterySaverToggle } from './BatterySaverToggle';
import { TimeOfDayThemeSettings } from './TimeOfDayThemeSettings';
import { InteractionAnalyticsChart } from './InteractionAnalyticsChart';
import {
  Users,
  CreditCard,
  HeartHandshake,
  ShieldCheck,
  Sliders,
  Crown,
  Shield,
  Clock,
  FileText,
  Activity,
  Download,
  FileSpreadsheet,
  Zap,
  Settings,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { isAdminOrCreator, hasPrivilege } from '../lib/permissions';
import {
  exportUsersToCSV,
  exportUsersToPDF,
  exportPaymentsToCSV,
  exportPaymentsToPDF,
  exportSystemLogsToCSV,
  exportSystemLogsToPDF,
} from '../utils/adminDataExport';

export type ManagementSection =
  | 'super-admin'
  | 'saas-subscriptions'
  | 'rbac'
  | 'users'
  | 'payments'
  | 'customers'
  | 'admin-config'
  | 'settings'
  | 'activity';

interface ManagementHubProps {
  initialSection?: ManagementSection;
  user: UserProfile;
  onUpdateUser?: (updated: Partial<UserProfile>) => void;
  onConfigChange?: (config: AppSystemConfig) => void;
}

export const ManagementHub: React.FC<ManagementHubProps> = ({
  initialSection = 'super-admin',
  user,
  onUpdateUser,
  onConfigChange,
}) => {
  const { language } = useLanguage();
  const [activeSection, setActiveSection] = useState<ManagementSection>(initialSection);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const canConfigApp = isAdminOrCreator(user) || hasPrivilege(user, 'canConfigureApp');
  const canManageUsers = isAdminOrCreator(user) || hasPrivilege(user, 'canManageUsers');
  const canManagePayments = isAdminOrCreator(user) || hasPrivilege(user, 'canManagePayments');
  const canManageCRM = isAdminOrCreator(user) || hasPrivilege(user, 'canManageCRM');
  const canViewActivity =
    isAdminOrCreator(user) ||
    hasPrivilege(user, 'canConfigureApp') ||
    hasPrivilege(user, 'canManagePrivileges');
  const isSuperAdmin = isAdminOrCreator(user);

  const tabs: DashboardTabItem[] = [
    ...(isSuperAdmin
      ? [
          {
            id: 'super-admin',
            label: language === 'ti' ? 'ላዕለዋይ ምሕደራ (Super Admin)' : 'Super Admin Deck',
            icon: Crown,
          },
        ]
      : []),
    ...(isSuperAdmin || canManagePayments
      ? [
          {
            id: 'saas-subscriptions',
            label: language === 'ti' ? 'SaaS ፕላናት & AI ደረት' : 'SaaS Plans & Quotas',
            icon: Zap,
          },
        ]
      : []),
    {
      id: 'rbac',
      label: language === 'ti' ? 'RBAC ምሕደራን መሰላትን' : 'Enterprise RBAC Suite',
      icon: Shield,
    },
    ...(canManageUsers
      ? [
          {
            id: 'users',
            label: language === 'ti' ? 'ተጠቃሚን ማውጫን' : 'User Directory',
            icon: Users,
          },
        ]
      : []),
    ...(canConfigApp
      ? [
          {
            id: 'admin-config',
            label: language === 'ti' ? 'ናይ መድረኽ ቅጥዒ' : 'System Configuration',
            icon: Sliders,
          },
        ]
      : []),
    {
      id: 'settings',
      label: language === 'ti' ? 'ቅጥዕታት ተበጻሕነት' : 'Settings & Accessibility',
      icon: Settings,
    },
    ...(canManagePayments
      ? [
          {
            id: 'payments',
            label: language === 'ti' ? 'ክፍሊት ምሕደራ' : 'Payment Management',
            icon: CreditCard,
          },
        ]
      : []),
    ...(canManageCRM
      ? [
          {
            id: 'customers',
            label: language === 'ti' ? 'ዓማዊል ምሕደራ (CRM)' : 'Customer CRM Desk',
            icon: HeartHandshake,
          },
        ]
      : []),
    ...(canViewActivity
      ? [
          {
            id: 'activity',
            label: language === 'ti' ? 'ናይ ሲስተም ምንቅስቓስ' : 'System Activity',
            icon: Activity,
          },
        ]
      : []),
  ];

  return (
    <>
      <DashboardLayoutShell
        sectionLabel={language === 'ti' ? 'ምሕደራን ቁጽጽርን' : 'Governance & Operations'}
        title={language === 'ti' ? 'ልዑላዊ ምሕደራ ማእከል' : 'Sovereign Management Console'}
        subtitleTi={language === 'ti' ? undefined : 'ምሕደራ ሲስተም'}
        description={
          language === 'ti'
            ? 'ተጠቀምቲ፡ RBAC መሰላት፡ ክፍሊታት፡ CRM ዓማዊልን ናይ ሲስተም ኦዲት መዝገብን ካብ ሓደ ቦታ ኣመሓድሩ።'
            : `Encrypted governance console · Role: ${user.role}. Manage users, RBAC privileges, SaaS quotas, payments, CRM records, and compliance exports.`
        }
        icon={user.role === 'Creator' ? Crown : ShieldCheck}
        actions={
          <>
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 min-h-[40px] rounded-xl bg-[#C5A059] hover:bg-[#D5B26B] text-[#09090B] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Download User Activity, Payment Summaries & System Logs in CSV or PDF"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>{language === 'ti' ? 'ዳታ ኤክስፖርት (CSV/PDF)' : 'Data Export (CSV/PDF)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAuditModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 min-h-[40px] rounded-xl border border-[#8E6D28]/35 bg-[#121318] hover:border-[#C5A059]/60 text-slate-200 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="View Administrative Audit Logs & Action Trail"
            >
              <Clock className="w-3.5 h-3.5 text-[#E1C47D] shrink-0" />
              <span>{language === 'ti' ? 'ናይ ምሕደራ መዝገብ' : 'Audit Logs'}</span>
            </button>
          </>
        }
        bannerNotice={
          <div className="px-5 sm:px-7 py-3 bg-[#090A0E] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileSpreadsheet className="w-4 h-4 text-[#E1C47D] shrink-0" />
              <p className="text-xs text-slate-300 truncate">
                <span className="font-semibold text-[#F3E5AB]">
                  {language === 'ti' ? 'ቅልጡፍ ዳታ ኤክስፖርት' : 'Quick Compliance Exports'}
                </span>
                <span className="text-slate-600 mx-2">·</span>
                <span className="text-slate-400">
                  {language === 'ti'
                    ? 'ናይ ተጠቃሚ ምንቅስቓስ፣ ክፍሊታትን ሲስተም ሎግስን'
                    : 'Users, payments, and telemetry logs in CSV or PDF'}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => exportUsersToCSV(undefined, user)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#121318] hover:bg-[#191B23] border border-[#8E6D28]/25 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Download User Activity Report in CSV"
              >
                <Download className="w-3 h-3 text-[#E1C47D]" />
                <span>Users CSV</span>
              </button>

              <button
                type="button"
                onClick={() => exportUsersToPDF(undefined, user)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#121318] hover:bg-[#191B23] border border-[#8E6D28]/25 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Download User Activity Report in PDF"
              >
                <FileText className="w-3 h-3 text-[#E1C47D]" />
                <span>Users PDF</span>
              </button>

              <button
                type="button"
                onClick={() => exportPaymentsToCSV(undefined, user)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#121318] hover:bg-[#191B23] border border-[#8E6D28]/25 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Download Payment Summary Report in CSV"
              >
                <Download className="w-3 h-3 text-[#E1C47D]" />
                <span>Payments CSV</span>
              </button>

              <button
                type="button"
                onClick={() => exportPaymentsToPDF(undefined, user)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#121318] hover:bg-[#191B23] border border-[#8E6D28]/25 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Download Payment Summary Report in PDF"
              >
                <FileText className="w-3 h-3 text-[#E1C47D]" />
                <span>Payments PDF</span>
              </button>

              <button
                type="button"
                onClick={() => exportSystemLogsToCSV(undefined, undefined, user)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#121318] hover:bg-[#191B23] border border-[#8E6D28]/25 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Download System Usage & Telemetry Logs in CSV"
              >
                <Download className="w-3 h-3 text-emerald-400" />
                <span>System CSV</span>
              </button>

              <button
                type="button"
                onClick={() => exportSystemLogsToPDF(undefined, undefined, user)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#121318] hover:bg-[#191B23] border border-[#8E6D28]/25 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Download System Usage & Telemetry Logs in PDF"
              >
                <FileText className="w-3 h-3 text-emerald-400" />
                <span>System PDF</span>
              </button>
            </div>
          </div>
        }
        tabs={tabs}
        activeTabId={activeSection}
        onSelectTab={(tabId) => setActiveSection(tabId as ManagementSection)}
      >
        <div className="transition-all duration-200">
          {activeSection === 'super-admin' && (
            <SuperAdminDashboard
              currentUser={user}
              onUpdateCurrentUser={onUpdateUser}
              onConfigChange={onConfigChange}
            />
          )}
          {activeSection === 'saas-subscriptions' && <SaasSubscriptionAdminDeck />}
          {activeSection === 'rbac' && <RbacDashboardView />}
          {activeSection === 'users' && (
            <UserManagementView currentUser={user} onUpdateCurrentUser={onUpdateUser} />
          )}
          {activeSection === 'admin-config' && (
            <AdminConfigView currentUser={user} onConfigChange={onConfigChange} />
          )}
          {activeSection === 'settings' && (
            <section
              aria-label={
                language === 'ti'
                  ? 'ቅጥዕታት ተበጻሕነትን ሃፕቲክስን'
                  : 'Management Hub Settings and Accessibility'
              }
              className="space-y-5"
            >
              <div className="bg-[#0B0914] border border-[#8E6D28]/30 rounded-2xl p-5 space-y-4 shadow-lg">
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-[#F3E5AB] font-serif">
                    {language === 'ti'
                      ? 'ቅጥዕታት መተግበሪን ተበጻሕነትን (App Settings & Accessibility)'
                      : 'Settings & Accessibility Controls'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {language === 'ti'
                      ? 'ንምንቅስቓስ UI፣ ስዋይፕን ጠውቅን ዓለምለኻዊ ሃፕቲክ ግብረ-መልሲ ኣመሓድሩ።'
                      : 'Manage global UI gesture haptic preferences and accessibility controls across the workspace.'}
                  </p>
                </div>

                <HapticFeedbackToggle variant="dark" />
                <HapticPatternSelector variant="dark" />
                <SwipeSensitivitySlider variant="dark" />
                <TimeOfDayThemeSettings variant="dark" />
                <BatterySaverToggle variant="dark" />
              </div>

              <HapticAccessibilitySettings
                variant="dark"
                showSwipeSlider={false}
                showPatternSelector={false}
              />
              <InteractionAnalyticsChart variant="dark" />
            </section>
          )}
          {activeSection === 'payments' && <PaymentManagementView />}
          {activeSection === 'customers' && <CustomerManagementView />}
          {activeSection === 'activity' && <SystemActivityView currentUser={user} />}
        </div>
      </DashboardLayoutShell>

      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        currentUser={user}
      />

      <AdminDataExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        currentUser={user}
      />
    </>
  );
};
