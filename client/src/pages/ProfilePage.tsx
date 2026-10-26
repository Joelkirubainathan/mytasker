import { useState } from 'react';
import { User, Lock, Camera } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDate } from '../utils/helpers';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', timezone: user?.timezone || 'UTC' });
  const [passForm, setPassForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [passError, setPassError] = useState('');

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { data } = await api.patch('/users/profile', profileForm);
      setUser(data.data);
      toast.success('Profile updated!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (passForm.new_password !== passForm.confirm) {
      setPassError('Passwords do not match');
      return;
    }
    if (passForm.new_password.length < 8) {
      setPassError('Password must be at least 8 characters');
      return;
    }
    setSavingPass(true);
    try {
      await api.patch('/users/password', {
        current_password: passForm.current_password,
        new_password: passForm.new_password,
      });
      toast.success('Password changed successfully');
      setPassForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err: any) {
      setPassError(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profile</h1>

      {/* Avatar + basic info */}
      <div className="card p-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center">
              <span className="text-white text-3xl font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name}</h2>
            <p className="text-sm text-slate-400">{user?.email}</p>
            <p className="text-xs text-slate-300 dark:text-slate-500 mt-1">
              Member since {formatDate(user?.created_at || '')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User size={16} className="text-brand-400" />
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Personal Information</h3>
          </div>
          <div>
            <label className="label" htmlFor="profile-name">Full Name</label>
            <input
              id="profile-name"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className="input"
              minLength={2}
              maxLength={100}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input value={user?.email} className="input opacity-60 cursor-not-allowed" disabled aria-label="Email (read-only)" />
            <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={savingProfile || !profileForm.name.trim()}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {savingProfile && <LoadingSpinner size="sm" />} Save Profile
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} className="text-brand-400" />
          <h3 className="section-title">Change Password</h3>
        </div>

        {passError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            {passError}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label" htmlFor="current-pass">Current Password</label>
            <input
              id="current-pass"
              type="password"
              value={passForm.current_password}
              onChange={(e) => setPassForm({ ...passForm, current_password: e.target.value })}
              className="input"
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label" htmlFor="new-pass">New Password</label>
            <input
              id="new-pass"
              type="password"
              value={passForm.new_password}
              onChange={(e) => setPassForm({ ...passForm, new_password: e.target.value })}
              className="input"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="label" htmlFor="confirm-pass">Confirm New Password</label>
            <input
              id="confirm-pass"
              type="password"
              value={passForm.confirm}
              onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })}
              className={`input ${passForm.confirm && passForm.new_password !== passForm.confirm ? 'border-red-400 focus:ring-red-400' : ''}`}
              required
              autoComplete="new-password"
            />
          </div>
          <button type="submit" disabled={savingPass} className="btn-primary flex items-center justify-center gap-2">
            {savingPass && <LoadingSpinner size="sm" />} Change Password
          </button>
        </form>
      </div>
    </div>
  );
}
