import { useState } from 'react';
import {
  UserPlus,
  Pencil,
  Trash2,
  RefreshCw,
  X,
  Power,
  Search,
  ChevronDown,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  Users as UsersIcon,
} from 'lucide-react';
import Spinner from '../../components/Spinner';
import Alert from '../../components/Alert';
import { useFetch } from '../../hooks/useFetch';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
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
  const { user: currentUser } = useAuth();

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [joinedFilter, setJoinedFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

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

  const toggleActive = async (u) => {
    const next = !u.active;
    if (!next) {
      if (String(u.id) === String(currentUser?.id)) {
        toast.error('You cannot disable your own account.');
        return;
      }
      if (!window.confirm(`Deactivate ${u.name} (${u.username})? They will no longer be able to sign in.`)) return;
    }
    try {
      await api.patch(`/admin/users/${u.id}`, { active: next });
      toast.success(next ? `${u.name} activated.` : `${u.name} deactivated.`);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Action failed'));
    }
  };

  const field = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const stats = [
    { label: 'Total users', value: users.length, icon: UsersIcon, cls: 'text-brand-green-dark' },
    { label: 'Teachers', value: users.filter((u) => u.role === 'teacher').length, icon: BookOpen, cls: 'text-emerald-600' },
    { label: 'Leaders', value: users.filter((u) => u.role === 'leader').length, icon: GraduationCap, cls: 'text-amber-600' },
    { label: 'Admins', value: users.filter((u) => u.role === 'admin').length, icon: ShieldCheck, cls: 'text-violet-600' },
  ];

  const filtered = users.filter((u) => {
    const needle = q.trim().toLowerCase();
    const matchQ = !needle || `${u.name} ${u.username} ${u.email} ${u.title || ''}`.toLowerCase().includes(needle);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.active : !u.active);
    let matchJoined = true;
    if (joinedFilter !== 'all') {
      const created = new Date(u.createdAt);
      const days = joinedFilter === 'week' ? 7 : joinedFilter === 'month' ? 30 : joinedFilter === 'year' ? 365 : 0;
      matchJoined = created >= new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }
    return matchQ && matchRole && matchStatus && matchJoined;
  });

  const visible = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'role':
        return a.role.localeCompare(b.role) || a.name.localeCompare(b.name);
      case 'joinedNew':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'joinedOld':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'name':
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const clearFilters = () => {
    setQ('');
    setRoleFilter('all');
    setStatusFilter('all');
    setJoinedFilter('all');
    setSortBy('name');
  };

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

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card flex items-center gap-2.5 px-3.5 py-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.cls}`}>
              <s.icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-lg font-bold leading-none text-slate-900">{s.value}</p>
              <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card flex flex-col gap-2.5 p-3 sm:flex-row sm:items-center sm:gap-3 sm:px-3.5 sm:py-3">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, username or email..."
            className="input-field py-2 pl-10 pr-3.5 text-[13px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field appearance-none py-2 pr-8 text-[13px]"
            >
              <option value="all">All roles</option>
              <option value="teacher">Teachers</option>
              <option value="leader">Leaders</option>
              <option value="admin">Admins</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field appearance-none py-2 pr-8 text-[13px]"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="relative">
            <select
              value={joinedFilter}
              onChange={(e) => setJoinedFilter(e.target.value)}
              className="input-field appearance-none py-2 pr-8 text-[13px]"
            >
              <option value="all">Joined: Any time</option>
              <option value="week">Joined: Last 7 days</option>
              <option value="month">Joined: Last 30 days</option>
              <option value="year">Joined: Last 365 days</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field appearance-none py-2 pr-8 text-[13px]"
            >
              <option value="name">Sort: Name A–Z</option>
              <option value="role">Sort: Role</option>
              <option value="joinedNew">Sort: Newest joined</option>
              <option value="joinedOld">Sort: Oldest joined</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
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
      ) : visible.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Search className="h-6 w-6" />
          </span>
          <div>
            <p className="font-display text-base font-bold text-slate-800">No users match your filters</p>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">Try a different search term or clear the filters.</p>
          </div>
          <button onClick={clearFilters} className="btn-outline !px-4 !py-2 !text-xs">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-3.5 py-2.5 font-semibold">User</th>
                <th className="px-3.5 py-2.5 font-semibold">Username</th>
                <th className="px-3.5 py-2.5 font-semibold">Role</th>
                <th className="px-3.5 py-2.5 font-semibold">Status</th>
                <th className="px-3.5 py-2.5 font-semibold">Joined</th>
                <th className="px-3.5 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((u) => {
                const RoleIcon = ROLE_ICONS[u.role] || BookOpen;
                return (
                  <tr key={u.id} className="transition hover:bg-brand-green-light/40">
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${AVATAR_CLS[u.role] || AVATAR_CLS.teacher}`}>
                          {initials(u.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold leading-tight text-slate-800">{u.name}</p>
                          <p className="truncate text-[11px] leading-tight text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="text-xs font-medium text-slate-600">@{u.username}</span>
                      {u.title && <p className="truncate text-[10px] text-slate-400">{u.title}</p>}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_BADGE[u.role] || ROLE_BADGE.teacher}`}>
                        <RoleIcon className="h-2.5 w-2.5" /> {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      {u.active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-[11px] text-slate-500">{formatDateTime(u.createdAt)}</td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleActive(u)}
                          disabled={String(u.id) === String(currentUser?.id)}
                          title={String(u.id) === String(currentUser?.id) ? 'This is your account' : u.active ? 'Deactivate account' : 'Activate account'}
                          aria-label={u.active ? `Deactivate ${u.name}` : `Activate ${u.name}`}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border bg-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            u.active
                              ? 'border-slate-200 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600'
                              : 'border-slate-200 text-slate-500 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600'
                          }`}
                        >
                          <Power className={`h-3 w-3 ${u.active ? '' : 'text-emerald-600'}`} />
                        </button>
                        <button
                          onClick={() => openEdit(u)}
                          title="Edit user"
                          aria-label={`Edit ${u.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-brand-green-dark hover:bg-brand-green-light hover:text-brand-green-dark"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          title="Delete user"
                          aria-label={`Delete ${u.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3 w-3" />
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
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
