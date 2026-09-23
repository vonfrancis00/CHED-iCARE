import { accountFetch } from "../services/accountApi";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle, Building2, CheckCircle2, Eye, EyeOff, KeyRound,
  Mail, Pencil, RefreshCw, Search, ShieldCheck, Trash2, UserPlus, UsersRound, X
} from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";

const emptyUser = { name: "", email: "", office: "", password: "", role: "admin" };

function initials(name, email) {
  return (name || email || "U").trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join("");
}

function DetailCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0b2c5b]"><Icon size={20} aria-hidden="true" /></div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

export default function Settings({ user }) {
  const { data, loading: officesLoading, error: officesError, reload } = useDashboard();
  const offices = [...new Set((data?.occOffices || data?.occDistribution || [])
    .map(office => String(office.name || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(emptyUser);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [usersRefresh, setUsersRefresh] = useState(0);
  const [usersQuery, setUsersQuery] = useState("");
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [approvalRequest, setApprovalRequest] = useState(null);
  const newlyCreatedUsers = useRef(new Map());
  const deletedUsers = useRef(new Set());
  const mutationVersion = useRef(0);
  const modalRef = useRef(null);
  const deleteModalRef = useRef(null);
  const returnFocusRef = useRef(null);
  const refreshButtonRef = useRef(null);
  const savingRef = useRef(saving);
  savingRef.current = saving;
  const showFormRef = useRef(showForm);
  showFormRef.current = showForm;
  const deletingRef = useRef(deleting);
  deletingRef.current = deleting;
  const officeOptions = [...new Set([...offices, ...(editingUser?.office ? [editingUser.office] : [])])].sort((a, b) => a.localeCompare(b));
  const currentUserEmail = String(user?.email || "").trim().toLowerCase();
  const directoryUsers = users.filter(account => String(account.email || "").trim().toLowerCase() !== currentUserEmail);
  const visibleUsers = directoryUsers.filter(account => [account.name, account.email, account.office, account.role]
    .some(value => String(value || "").toLowerCase().includes(usersQuery.trim().toLowerCase())));
  const superAdminCount = directoryUsers.filter(account => account.role === "super_admin").length;

  useEffect(() => {
    const controller = new AbortController();
    async function loadUsers() {
      const versionAtStart = mutationVersion.current;
      setUsersLoading(true);
      setUsersError("");
      try {
        const response = await accountFetch("/api/sheet?action=listUsers", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !result.success || !Array.isArray(result.users)) throw new Error(result.message || "Unable to load users.");
        if (versionAtStart !== mutationVersion.current) return;
        const listedEmails = new Set(result.users.map(account => account.email.toLowerCase()));
        for (const email of listedEmails) newlyCreatedUsers.current.delete(email);
        for (const email of deletedUsers.current) if (!listedEmails.has(email)) deletedUsers.current.delete(email);
        const merged = [...result.users.filter(account => !deletedUsers.current.has(account.email.toLowerCase())), ...newlyCreatedUsers.current.values()];
        setUsers(merged.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email)));
      } catch (cause) {
        if (!controller.signal.aborted) setUsersError(cause.message || "Unable to load users.");
      } finally {
        if (!controller.signal.aborted) setUsersLoading(false);
      }
    }
    loadUsers();
    return () => controller.abort();
  }, [usersRefresh]);

  useEffect(() => {
    const controller = new AbortController();
    let checking = false;
    async function loadRequests(initial = false) {
      if (checking || controller.signal.aborted || showFormRef.current || savingRef.current) return;
      if (!initial && (document.visibilityState === "hidden" || !navigator.onLine)) return;
      checking = true;
      const versionAtStart = mutationVersion.current;
      if (initial) setRequestsLoading(true);
      try {
        const response = await accountFetch("/api/sheet?action=listAccountRequests", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        const result = await response.json();
        // A read started before an approval must not restore deleted requests
        // or overwrite the adjusted sheet row numbers.
        if (controller.signal.aborted || showFormRef.current || savingRef.current || versionAtStart !== mutationVersion.current) return;
        if (!response.ok || !result.success || !Array.isArray(result.requests)) throw new Error(result.message || "Unable to load requests.");
        setRequests(result.requests);
        setRequestsError("");
      } catch (cause) { if (!controller.signal.aborted) setRequestsError(cause.message || "Unable to load requests."); }
      finally {
        checking = false;
        if (!controller.signal.aborted) setRequestsLoading(false);
      }
    }
    const refreshRequests = () => loadRequests();
    loadRequests(true);
    const interval = window.setInterval(refreshRequests, 15000);
    window.addEventListener("focus", refreshRequests);
    window.addEventListener("online", refreshRequests);
    document.addEventListener("visibilitychange", refreshRequests);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshRequests);
      window.removeEventListener("online", refreshRequests);
      document.removeEventListener("visibilitychange", refreshRequests);
    };
  }, [usersRefresh]);

  useEffect(() => {
    if (!showForm) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalRef.current?.querySelector("input")?.focus();
    function handleKeyDown(event) {
      if (event.key === "Escape" && !savingRef.current) closeForm();
      if (event.key !== "Tab") return;
      const focusable = [...modalRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
      else refreshButtonRef.current?.focus();
    };
  }, [showForm]);

  useEffect(() => {
    if (!deleteTarget) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    deleteModalRef.current?.querySelector("button")?.focus();
    function handleKeyDown(event) {
      if (event.key === "Escape" && !deletingRef.current) setDeleteTarget(null);
      if (event.key !== "Tab") return;
      const focusable = [...deleteModalRef.current.querySelectorAll('button:not(:disabled)')];
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
      else refreshButtonRef.current?.focus();
    };
  }, [deleteTarget]);

  function update(event) {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  }

  function closeForm() {
    setShowForm(false);
    setEditingUser(null);
    setForm(emptyUser);
    setConfirmPassword("");
    setShowPassword(false);
    setError("");
    setApprovalRequest(null);
  }

  function openApprove(event, request) {
    returnFocusRef.current = event.currentTarget;
    setApprovalRequest(request); setEditingUser(null);
    setForm({ name: request.name, email: request.email, office: request.office, password: "", role: "admin" });
    setConfirmPassword(""); setShowForm(true); setSuccess("");
  }

  function openCreate(event) {
    returnFocusRef.current = event.currentTarget;
    setEditingUser(null);
    setForm(emptyUser);
    setSuccess("");
    setShowForm(true);
  }

  function openEdit(event, account) {
    returnFocusRef.current = event.currentTarget;
    setEditingUser(account);
    setForm({ name: account.name, email: account.email, office: account.office, role: account.role, password: "" });
    setConfirmPassword("");
    setSuccess("");
    setShowForm(true);
  }

  function openDelete(event, account) {
    returnFocusRef.current = event.currentTarget;
    setDeleteError("");
    setDeleteTarget(account);
  }

  async function saveUser(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (form.password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const action = approvalRequest ? "approveAccountRequest" : editingUser ? "updateUser" : "createUser";
      const response = await accountFetch(`/api/sheet?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ...form, targetEmail: editingUser?.email, requestRow: approvalRequest?.row, email: form.email.trim(), name: form.name.trim(), office: form.office.trim() })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to add user.");
      const account = result.user || {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        office: form.office.trim(),
        role: form.role
      };
      mutationVersion.current += 1;
      if (editingUser) {
        newlyCreatedUsers.current.delete(editingUser.email.toLowerCase());
        if (editingUser.email.toLowerCase() !== account.email.toLowerCase()) deletedUsers.current.add(editingUser.email.toLowerCase());
      }
      deletedUsers.current.delete(account.email.toLowerCase());
      newlyCreatedUsers.current.set(account.email.toLowerCase(), account);
      setUsers(current => [...current.filter(item => item.email.toLowerCase() !== (editingUser?.email || account.email).toLowerCase()), account]
        .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email)));
      if (approvalRequest) {
        // Deleting a Google Sheet row moves every later request up one row.
        // Keep their identifiers in sync so the next request can be approved
        // immediately, without requiring a browser refresh.
        setRequests(current => current
          .filter(item => item.row !== approvalRequest.row)
          .map(item => item.row > approvalRequest.row ? { ...item, row: item.row - 1 } : item));
      }
      closeForm();
      setSuccess(result.message || (approvalRequest ? "Request approved." : "User added successfully."));
    } catch (cause) {
      setError(cause.message || "Unable to add user. Please retry.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await accountFetch("/api/sheet?action=deleteUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ targetEmail: deleteTarget.email })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to delete user.");
      mutationVersion.current += 1;
      newlyCreatedUsers.current.delete(deleteTarget.email.toLowerCase());
      deletedUsers.current.add(deleteTarget.email.toLowerCase());
      setUsers(current => current.filter(account => account.email.toLowerCase() !== deleteTarget.email.toLowerCase()));
      setSuccess(result.message || "User deleted successfully.");
      setDeleteTarget(null);
    } catch (cause) {
      setDeleteError(cause.message || "Unable to delete user. Please retry.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[28px] bg-[#0b2c5b] px-6 py-8 text-white shadow-xl shadow-blue-950/10 sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border border-white/10 bg-white/5" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 right-24 h-64 w-64 rounded-full border border-white/10" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-100"><ShieldCheck size={14} />Super admin workspace</div>
            <h1 className="text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">Settings</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">Manage who can access the childcare dashboard and assign each person to an office.</p>
          </div>
          <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0b2c5b] shadow-lg shadow-blue-950/20 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" onClick={openCreate} aria-haspopup="dialog">
            <UserPlus size={18} />Add user
          </button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <DetailCard icon={ShieldCheck} label="Your access" value="Super Admin" detail={user?.email || "User management access"} />
        <DetailCard icon={Building2} label="Office directory" value={officesLoading && !offices.length ? "Loading..." : `${offices.length} offices`} detail="Options from the OCC office register" />
        <DetailCard icon={Mail} label="Account email" value="@ched.gov.ph" detail="Required for every new dashboard user" />
      </div>

      {success && <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{success}</div>}
      {showForm && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget && !saving) closeForm(); }}>
        <section ref={modalRef} role="dialog" aria-modal="true" className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl" aria-labelledby="user-management-title">
          <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-6 sm:px-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0b2c5b]"><UsersRound size={22} /></div>
            <div className="min-w-0 flex-1">
              <h2 id="user-management-title" className="text-lg font-bold text-slate-900">{approvalRequest ? "Approve account request" : editingUser ? "Edit user" : "Add user"}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">{approvalRequest ? "Set the password and access role before creating this account." : editingUser ? `Update ${editingUser.name || editingUser.email}'s account details.` : "Create an account with an office assignment and the right level of access."}</p>
            </div>
            <button type="button" onClick={closeForm} disabled={saving} aria-label="Close user form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={20} /></button>
          </div>

          <div className="px-6 py-6 sm:px-8">
            {error && <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert"><AlertCircle size={18} className="mt-0.5 shrink-0" />{error}</div>}

              <form id="settings-user-form" className="space-y-7" onSubmit={saveUser}>
                <div>
                  <div className="mb-4 flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#0b2c5b]">1</span><h3 className="text-sm font-bold text-slate-800">Account details</h3></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="settings-label" htmlFor="new-user-name">Full name</label><input className="settings-input" id="new-user-name" name="name" value={form.name} onChange={update} required maxLength={120} autoComplete="off" placeholder="Enter full name" /></div>
                    <div><label className="settings-label" htmlFor="new-user-email">CHED email</label><input className="settings-input" id="new-user-email" name="email" type="email" title="Use a @ched.gov.ph email address" value={form.email} onChange={update} required disabled={editingUser?.email.toLowerCase() === user?.email?.toLowerCase()} maxLength={254} autoComplete="off" placeholder="name@ched.gov.ph" /><p className="mt-1.5 text-xs text-slate-500">Only @ched.gov.ph addresses are accepted.</p></div>
                    <div><label className="settings-label" htmlFor="new-user-office">Office</label><select className="settings-input" id="new-user-office" name="office" value={form.office} onChange={update} required disabled={!officeOptions.length}><option value="">{officesLoading ? "Loading offices..." : officesError && !officeOptions.length ? "Unable to load offices" : "Select an office"}</option>{officeOptions.map(office => <option key={office} value={office}>{office}</option>)}</select></div>
                    <div><label className="settings-label" htmlFor="new-user-role">Access role</label><select className="settings-input" id="new-user-role" name="role" value={form.role} onChange={update} disabled={editingUser?.email.toLowerCase() === user?.email?.toLowerCase()}><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select><p className="mt-1.5 text-xs text-slate-500">{form.role === "super_admin" ? "Can manage users and access Settings." : "Can view dashboard pages, except Settings."}</p></div>
                  </div>
                  {officesError && !offices.length && <button type="button" className="mt-3 text-sm font-semibold text-blue-700 underline" onClick={() => reload()}>Retry loading offices</button>}
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <div className="mb-4 flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-[#0b2c5b]">2</span><h3 className="text-sm font-bold text-slate-800">Sign-in credentials</h3></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><label className="settings-label" htmlFor="new-user-password">{editingUser ? "New password (optional)" : "Initial password"}</label><div className="relative"><input className="settings-input settings-input-with-action" id="new-user-password" name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={update} required={!editingUser} minLength={8} maxLength={128} autoComplete="new-password" placeholder={editingUser ? "Leave blank to keep current password" : "At least 8 characters"} /><button type="button" className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-[#0b2c5b]" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
                    <div><label className="settings-label" htmlFor="new-user-password-confirm">Confirm password</label><input className="settings-input" id="new-user-password-confirm" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required={!!form.password} minLength={8} maxLength={128} autoComplete="new-password" placeholder="Re-enter password" /></div>
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><KeyRound size={14} />Share the password with the new user through an approved channel.</p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-6">
                  <button type="button" className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={closeForm} disabled={saving}>Cancel</button>
                  <button type="submit" className="settings-register min-h-11 disabled:cursor-wait disabled:opacity-60" disabled={saving || !officeOptions.length}>{editingUser ? <Pencil size={17} /> : <UserPlus size={17} />}{saving ? "Saving..." : approvalRequest ? "Approve & create user" : editingUser ? "Save changes" : "Create user"}</button>
                </div>
              </form>
          </div>
        </section>
        </div>,
        document.body
      )}

      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget && !deleting) setDeleteTarget(null); }}>
          <section ref={deleteModalRef} role="alertdialog" aria-modal="true" aria-labelledby="delete-user-title" aria-describedby="delete-user-description" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-700"><Trash2 size={22} /></div>
            <h2 id="delete-user-title" className="mt-5 text-xl font-bold text-slate-900">Delete this user?</h2>
            <p id="delete-user-description" className="mt-2 text-sm leading-6 text-slate-600">This will remove <strong>{deleteTarget.name || deleteTarget.email}</strong> ({deleteTarget.email}) from the Users sheet.</p>
            {deleteError && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{deleteError}</p>}
            <div className="mt-7 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={deleteUser} disabled={deleting} className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"><Trash2 size={16} />{deleting ? "Deleting..." : "Delete user"}</button>
            </div>
          </section>
        </div>,
        document.body
      )}

      <section className="overflow-hidden rounded-[24px] border border-amber-200 bg-white shadow-sm" aria-labelledby="requests-list-title">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-100 bg-amber-50/70 px-6 py-5 sm:px-8"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">Account access</p><h2 id="requests-list-title" className="mt-1 text-xl font-bold text-slate-900">Requesting Users</h2><p className="mt-1 text-sm text-slate-500">Review people who requested dashboard access.</p></div><span className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-amber-800">{requests.length} pending</span></div>
        <ul className="divide-y divide-slate-100">{requests.map(request => <li key={request.row} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-8"><div><p className="font-bold text-slate-900">{request.name}</p><p className="mt-1 text-sm text-slate-500">{request.email} Â· {request.office}</p></div><button type="button" onClick={event => openApprove(event, request)} className="inline-flex items-center gap-2 rounded-xl bg-[#0b2c5b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900"><CheckCircle2 size={16} />Review & approve</button></li>)}</ul>
        {requestsError && <div className="px-6 py-4 text-sm text-red-800" role="alert">{requestsError} <button type="button" disabled={requestsLoading} onClick={() => setUsersRefresh(value => value + 1)} className="font-semibold underline">Retry</button></div>}
        {!requestsLoading && !requestsError && !requests.length && <p className="px-6 py-8 text-center text-sm text-slate-500">No account requests are pending.</p>}{requestsLoading && <p className="px-6 py-8 text-center text-sm text-slate-500">Loading requests...</p>}
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm" aria-labelledby="users-list-title">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50/70 px-6 py-7 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0b2c5b] text-white shadow-md shadow-blue-950/15"><UsersRound size={23} /></div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">Directory</p>
                <h2 id="users-list-title" className="mt-1 text-xl font-bold tracking-tight text-slate-900">Dashboard Users</h2>
                <p className="mt-1 text-sm text-slate-500">People with access to the childcare dashboard.</p>
              </div>
            </div>
            <button ref={refreshButtonRef} type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#0b2c5b] shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60" onClick={() => setUsersRefresh(value => value + 1)} disabled={usersLoading}>
              <RefreshCw size={16} className={usersLoading ? "animate-spin" : ""} aria-hidden="true" />Refresh list
            </button>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700"><span className="h-2 w-2 rounded-full bg-blue-600" />{directoryUsers.length} other users</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700"><ShieldCheck size={13} className="text-blue-700" />{superAdminCount} super admins</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700"><UsersRound size={13} className="text-blue-700" />{directoryUsers.length - superAdminCount} admins</span>
          </div>
        </div>

        <div className="px-6 py-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-md">
              <Search size={18} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" aria-hidden="true" />
              <input type="search" aria-label="Search users" value={usersQuery} onChange={event => setUsersQuery(event.target.value)} placeholder="Search by name, email, or office" className="settings-input settings-input-with-leading-icon settings-search-input" />
            </div>
            <p className="text-xs font-medium text-slate-500" aria-live="polite">Showing {visibleUsers.length} of {directoryUsers.length}</p>
          </div>
          {usersError && <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert"><AlertCircle size={18} className="shrink-0" />{usersError}</div>}
          <ul className="mt-5 space-y-3">
            {visibleUsers.map((account, index) => (
              <li key={`${account.email}-${index}`} className="group grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-md lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto] lg:items-center lg:gap-5 sm:px-5 sm:py-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${account.role === "super_admin" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"}`}>{initials(account.name, account.email)}</div>
                  <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900" title={account.name}>{account.name || "Unnamed user"}</p><p className="mt-1 truncate text-xs text-slate-500" title={account.email}>{account.email}</p></div>
                </div>
                <div className="flex min-w-0 items-center gap-2 pl-16 text-sm text-slate-600 sm:pl-0"><Building2 size={16} className="shrink-0 text-slate-400" aria-hidden="true" /><span className="truncate" title={account.office}>{account.office || "No office assigned"}</span></div>
                <div className="pl-16 lg:pl-0"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${account.role === "super_admin" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"}`}><span className={`h-1.5 w-1.5 rounded-full ${account.role === "super_admin" ? "bg-blue-600" : "bg-slate-500"}`} />{account.role === "super_admin" ? "Super Admin" : "Admin"}</span></div>
                <div className="flex items-center gap-2 pl-16 lg:justify-end lg:pl-0">
                  <button type="button" onClick={event => openEdit(event, account)} aria-label={`Edit ${account.name || account.email}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"><Pencil size={16} /></button>
                  <button type="button" onClick={event => openDelete(event, account)} disabled={account.email.toLowerCase() === user?.email?.toLowerCase()} aria-label={`Delete ${account.name || account.email}`} title={account.email.toLowerCase() === user?.email?.toLowerCase() ? "You cannot delete your own account" : "Delete user"} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
          {!usersLoading && !usersError && !visibleUsers.length && <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">{usersQuery ? "No users match your search." : "No other users found in the Users sheet."}</div>}
          {usersLoading && !directoryUsers.length && <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500" role="status">Loading users...</div>}
        </div>
      </section>
    </div>
  );
}
