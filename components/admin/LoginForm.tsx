'use client';
import { useState } from 'react';
import Logo from '../Logo';

export default function LoginForm({ name }: { name: string }) {
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true); setErr('');
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: fd.get('login'), password: fd.get('password') }) }).catch(() => null);
    if (r?.ok) { window.location.href = '/admin'; return; }
    const data = await r?.json().catch(() => ({}));
    setErr(data?.error ?? 'Нет связи с сервером');
    setBusy(false);
    const pw = form.querySelector<HTMLInputElement>('input[name=password]'); if (pw) pw.value = '';
  }
  return (
    <div className="login">
      <form className="panel" onSubmit={onSubmit}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}><Logo name={name} size="lg" /></div>
        <h1 className="h3" style={{ textAlign: 'center' }}>Кабинет владельца</h1>
        <label className="field group"><span>Логин</span><input className="input" name="login" autoComplete="username" required /></label>
        <label className="field group"><span>Пароль</span><input className="input" name="password" type="password" autoComplete="current-password" required /></label>
        {err && <p className="badge b-ask group" role="alert" style={{ whiteSpace: 'normal' }}>{err}</p>}
        <button type="submit" className="btn btn-ink group" style={{ width: '100%' }} disabled={busy}>{busy ? 'Входим…' : 'Войти'}</button>
      </form>
    </div>
  );
}
