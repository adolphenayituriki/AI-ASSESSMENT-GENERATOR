import { useState } from 'react';
import {
  UserPlus,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  Users as UsersIcon,
} from 'lucide-react';
import Spinner from '../../components/Spinner';
import Alert from '../../components/Alert';
import { useFetch } from '../../hooks/useFetch';
import api from '../../api';
import { useToast } from '../../context/ToastContext';
import { errorMessage, roleLabel, formatDateTime } from '../../utils/helpers';

const ROLE_ICONS = { admin: ShieldCheck, leader: GraduationCap, teacher: BookOpen };
const ROLE_BADGE = {
  admin: 'bg-violet-100 text-violet-700',
  leader: 'bg-amber-100 text-amber-700',
  teacher: 'bg-emerald-100 text-emerald-700',
};

const emptyForm = {
  name: '',
  username: '',
  email: '',
  role: 'teacher',
  title: '',
  assignedClass: '',
  active: true,
  password: '',
};

const AVATAR_CLS = {
  admin: 'bg-violet-100 text-violet-700',
  leader: 'bg-amber-100 text-amber-700',
  teacher: 'bg-brand-green-light text-brand-green-deep',
};

const initials = (name) =>
  String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export default function Users() {
  const { data, loading, error, reload } = useFetch('/admin/users');
  const users = data || [];
  const toast = useToast();

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const openCreate = () => {
    setForm(emptyForm);
    setFormError(null);
    setModal({ editing: null });
  };

  const openEdit = (u) => {
    setForm({
      name: u.name,
      username: u.username,
      email: u.email,
      role: u.role,
      title: u.title,
      assignedClass: u.assignedClass,
      active: u.active,
      password: '',
    });
    setFormError(null);
    setModal({ editing: u });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (modal.editing) {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.patch(`/admin/users/${modal.editing.id}`, payload);
        toast.success('User updated successfully.');
      } else {
        await api.post('/admin/users', form);
        toast.success('User created successfully.');
      }
      setModal(null);
      reload();
    } catch (err) {
      setFormError(errorMessage(err, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete ${u.name} (${u.username})? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      toast.success('User deleted.');
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Delete failed'));
    }
  };

  const field = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const stats = [
    { label: 'Total users', value: users.length, icon: UsersIcon, cls: 'text-brand-green-dark' },
    { label: 'Teachers', value: users.filter((u) => u.role === 'teacher').length, icon: BookOpen, cls: 'text-emerald-600' },
    { label: 'Leaders', value: users.filter((u) => u.role === 'leader').length, icon: GraduationCap, cls: 'text-amber-600' },
    { label: 'Admins', value: users.filter((u) => u.role === 'admin').length, icon: ShieldCheck, cls: 'text-violet-600' },
  ];

  return (
    <div className="page-fade space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900 sm:text-xl">
            <UsersIcon className="h-5 w-5 text-brand-green-dark" /> User Management
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Create, update or remove teacher, leader and admin accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reload} className="btn-outline !px-3.5 !py-2 !text-xs" aria-label="Refresh">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button onClick={openCreate} className="btn-primary !px-3.5 !py-2 !text-xs">
            <UserPlus className="h-3.5 w-3.5" /> Add user
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card flex items-center gap-3 p-4">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.cls}`}>
              <s.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-xl font-bold leading-none text-slate-900">{s.value}</p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-3">
          <Alert type="error" message={`${errorMessage(error, 'Could not load users')}. The backend may need to be restarted to expose the admin API.`} onClose={() => reload()} />
          <button onClick={reload} className="btn-outline shrink-0 !px-3.5 !py-2 !text-xs">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-500">
          <Spinner size="sm" /> Loading users...
        </div>
      ) : users.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-green-light text-brand-green-dark">
            <UsersIcon className="h-7 w-7" />
          </span>
          <div>
            <p className="font-display text-base font-bold text-slate-800">No users yet</p>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">Add the first teacher, leader or admin account to get started.</p>
          </div>
          <button onClick={openCreate} className="btn-primary !px-4 !py-2 !text-xs">
            <UserPlus className="h-3.5 w-3.5" /> Add your first user
          </button>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Username</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const RoleIcon = ROLE_ICONS[u.role] || BookOpen;
                return (
                  <tr key={u.id} className="transition hover:bg-brand-green-light/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${AVATAR_CLS[u.role] || AVATAR_CLS.teacher}`}>
                          {initials(u.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{u.name}</p>
                          <p className="truncate text-xs text-slate-400">{u.email}</p>
                          {u.title && <p className="truncate text-xs text-slate-500">{u.title}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">@{u.username}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${ROLE_BADGE[u.role] || ROLE_BADGE.teacher}`}>
                        <RoleIcon className="h-3 w-3" /> {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-green-dark hover:text-brand-green-dark"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-slate-900">
                {modal.editing ? 'Edit user' : 'Add user'}
              </h2>
              <button onClick={() => setModal(null)} className="text-slate-400 transition hover:text-slate-600" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && <div className="mb-4"><Alert type="error" message={formError} /></div>}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="label-field">Full name</label>
                <input value={form.name} onChange={(e) => field('name', e.target.value)} required className="input-field" placeholder="e.g. Jean Pierre Mugabo" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label-field">Username</label>
                  <input value={form.username} onChange={(e) => field('username', e.target.value)} required className="input-field" placeholder="jpmugabo" />
                </div>
                <div>
                  <label className="label-field">Role</label>
                  <select value={form.role} onChange={(e) => field('role', e.target.value)} className="input-field">
                    <option value="teacher">Teacher</option>
                    <option value="leader">School Leader</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label-field">Email</label>
                <input type="email" value={form.email} onChange={(e) => field('email', e.target.value)} required className="input-field" placeholder="you@school.ac.rw" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label-field">Title (optional)</label>
                  <input value={form.title} onChange={(e) => field('title', e.target.value)} className="input-field" placeholder="e.g. Senior Teacher of Mathematics" />
                </div>
                <div>
                  <label className="label-field">Assigned class (optional)</label>
                  <input value={form.assignedClass} onChange={(e) => field('assignedClass', e.target.value)} className="input-field" placeholder="e.g. S2" />
                </div>
              </div>

              <div>
                <label className="label-field">
                  {modal.editing ? 'New password (leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => field('password', e.target.value)}
                  required={!modal.editing}
                  minLength={6}
                  autoComplete="new-password"
                  className="input-field"
                  placeholder="At least 6 characters"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => field('active', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-green-dark focus:ring-brand-green-dark"
                />
                Account active (can sign in)
              </label>

              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setModal(null)} className="btn-outline !py-2">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary !py-2 disabled:opacity-60">
                  {saving ? <Spinner size="sm" light /> : null}
                  {saving ? 'Saving...' : modal.editing ? 'Save changes' : 'Create user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
