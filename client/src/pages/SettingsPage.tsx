import { useState } from 'react';
import { Bell, Moon, Sun, Shield, Trash2, Download } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { user, setUser, logout } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const navigate = useNavigate();

  const [notifSettings, setNotifSettings] = useState({
    taskReminders: true,
    dueDateReminders: true,
    overdueNotifications: true,
    recurringReminders: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    ...(user?.notification_settings || {}),
  });
  const [savingNotif, setSavingNotif] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleSaveNotifications = async () => {
    setSavingNotif(true);
    try {
      await api.patch('/users/notification-settings', notifSettings);
      toast.success('Notification settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSavingNotif(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await api.get(`/users/export?format=${format}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mytasker-export.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await api.delete('/users/account', { data: { password: deletePassword } });
      await logout();
      navigate('/login');
      toast.success('Account deleted');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeletingAccount(false);
    }
  };

  const Toggle = ({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) => (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-brand-500 ${
        checked ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>

      {/* Theme */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          {theme === 'dark' ? <Moon size={18} className="text-brand-400" /> : <Sun size={18} className="text-yellow-400" />}
          <h2 className="section-title">Appearance</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'light', label: 'Light', icon: '☀️' },
            { value: 'dark', label: 'Dark', icon: '🌙' },
            { value: 'system', label: 'System', icon: '💻' },
          ].map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value as any)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                theme === value
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                  : 'border-slate-200 dark:border-[#2a2a3e] hover:border-slate-300'
              }`}
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={18} className="text-brand-400" />
          <h2 className="section-title">Notifications</h2>
        </div>
        <div className="space-y-4">
          {[
            { key: 'taskReminders', label: 'Task Reminders', desc: 'Receive reminders you set for tasks' },
            { key: 'dueDateReminders', label: 'Due Date Reminders', desc: 'Get notified when tasks are due soon' },
            { key: 'overdueNotifications', label: 'Overdue Alerts', desc: 'Alert when tasks become overdue' },
            { key: 'recurringReminders', label: 'Recurring Reminders', desc: 'Reminders for recurring tasks' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
              <Toggle
                id={`toggle-${key}`}
                checked={notifSettings[key as keyof typeof notifSettings] as boolean}
                onChange={(v) => setNotifSettings({ ...notifSettings, [key]: v })}
              />
            </div>
          ))}

          <div className="border-t border-slate-100 dark:border-[#2a2a3e] pt-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Quiet Hours</p>
                <p className="text-xs text-slate-400">No notifications during these hours</p>
              </div>
              <Toggle
                id="toggle-quiet"
                checked={notifSettings.quietHoursEnabled}
                onChange={(v) => setNotifSettings({ ...notifSettings, quietHoursEnabled: v })}
              />
            </div>
            {notifSettings.quietHoursEnabled && (
              <div className="flex items-center gap-3 animate-fade-in">
                <div className="flex-1">
                  <label className="label text-xs">From</label>
                  <input
                    type="time"
                    value={notifSettings.quietHoursStart}
                    onChange={(e) => setNotifSettings({ ...notifSettings, quietHoursStart: e.target.value })}
                    className="input text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="label text-xs">To</label>
                  <input
                    type="time"
                    value={notifSettings.quietHoursEnd}
                    onChange={(e) => setNotifSettings({ ...notifSettings, quietHoursEnd: e.target.value })}
                    className="input text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSaveNotifications}
            disabled={savingNotif}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {savingNotif && <LoadingSpinner size="sm" />}
            Save Notification Settings
          </button>
        </div>
      </div>

      {/* Data Export */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Download size={18} className="text-brand-400" />
          <h2 className="section-title">Export Data</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Download all your task data in your preferred format.
        </p>
        <div className="flex gap-3">
          <button onClick={() => handleExport('json')} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <Download size={16} /> JSON
          </button>
          <button onClick={() => handleExport('csv')} className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <Download size={16} /> CSV
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card p-5 border-red-200 dark:border-red-900/50">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-red-500" />
          <h2 className="section-title text-red-600 dark:text-red-400">Danger Zone</h2>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Delete Account</p>
            <p className="text-xs text-slate-400">Permanently delete your account and all data. This cannot be undone.</p>
          </div>
          <button
            onClick={() => setShowDeleteAccount(true)}
            className="btn-danger flex items-center gap-2 flex-shrink-0"
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </div>

      {/* Delete Account Modal */}
      <ConfirmDialog
        isOpen={showDeleteAccount}
        onClose={() => { setShowDeleteAccount(false); setDeletePassword(''); }}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="This will permanently delete your account and all your data. This cannot be undone."
        confirmLabel="Delete My Account"
        isLoading={deletingAccount}
      />
    </div>
  );
}
