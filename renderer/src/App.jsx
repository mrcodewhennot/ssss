import React, { useEffect, useState } from 'react'

const T = { ar: { login_title: 'تسجيل الدخول', email: 'البريد الإلكتروني', password: 'كلمة المرور', login: 'تسجيل الدخول', setup_admin: 'إعداد المدير الأول', admin_setup_msg: 'لا يوجد مدير مسجّل — أنشئ حساب المدير الآن.', name: 'الاسم', create_admin: 'إنشاء المدير', logout: 'تسجيل الخروج', theme: 'الثيم', language: 'اللغة', users: 'المستخدمون', create_user: 'إضافة كاشير' }, en: { login_title: 'Sign in', email: 'Email', password: 'Password', login: 'Sign In', setup_admin: 'Initial admin setup', admin_setup_msg: 'No admin found — create the first admin account.', name: 'Name', create_admin: 'Create Admin', logout: 'Sign Out', theme: 'Theme', language: 'Language', users: 'Users', create_user: 'Add Cashier' } }

export default function App(){
  const [lang, setLang] = useState('ar');
  const [theme, setTheme] = useState('light');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [user, setUser] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const t = T[lang];

  useEffect(()=>{
    if(window.electronAPI && !settingsLoaded){
      window.electronAPI.loadSettings().then(res=>{
        if(res.ok && res.settings){ if(res.settings.lang) setLang(res.settings.lang); if(res.settings.theme) setTheme(res.settings.theme); }
        setSettingsLoaded(true);
      }).catch(()=>setSettingsLoaded(true));
    } else setSettingsLoaded(true);
  },[settingsLoaded]);

  useEffect(()=>{ document.documentElement.setAttribute('data-theme', theme==='dark' ? 'dark' : 'light'); },[theme]);

  async function saveSettingsLocal(s){ if(window.electronAPI) await window.electronAPI.saveSettings(s); else localStorage.setItem('medo_ps_settings', JSON.stringify(s)); }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  async function handleLogin(){
    if(window.electronAPI){
      const res = await window.electronAPI.authenticate({ email, password });
      if(res.ok) { setUser(res.user); await loadUsers(); }
      else alert(res.error || 'login failed');
    } else alert('Electron API not available');
  }

  async function handleInitialAdminCreate(){
    if(!name || !email || !password) return alert('fill fields');
    const res = await window.electronAPI.createUser({ name, email, role:'admin', password, permissions: {all:true} });
    if(res.ok){ alert('Admin created'); setUser({id:res.id,name, email, role:'admin', permissions:{all:true}}); await loadUsers(); }
    else alert(res.error || 'error');
  }

  async function loadUsers(){ if(window.electronAPI){ const r = await window.electronAPI.listUsers(); if(r.ok) setUsersList(r.users || []); } }
  useEffect(()=>{ if(user) loadUsers(); },[user]);

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserPerms, setNewUserPerms] = useState({ canRefund:false });

  async function createCashier(){ if(!newUserName || !newUserEmail || !newUserPass) return alert('fill'); const res = await window.electronAPI.createUser({ name:newUserName, email:newUserEmail, role:'cashier', password:newUserPass, permissions:newUserPerms }); if(res.ok){ alert('Cashier created'); setNewUserName(''); setNewUserEmail(''); setNewUserPass(''); await loadUsers(); } else alert(res.error || 'error'); }

  const [checkedAdmin, setCheckedAdmin] = useState(false);
  useEffect(async ()=>{ if(!window.electronAPI) return setCheckedAdmin(true); const r = await window.electronAPI.listUsers(); if(r.ok){ const hasAdmin = (r.users || []).some(u=>u.role==='admin'); setCheckedAdmin(hasAdmin); } setCheckedAdmin(true); },[]);

  useEffect(()=>{ if(settingsLoaded) saveSettingsLocal({ lang, theme }); },[lang, theme, settingsLoaded]);

  function logout(){ setUser(null); setEmail(''); setPassword(''); }

  if(!settingsLoaded) return <div style={{padding:24}}>Loading...</div>;

  if(settingsLoaded && !checkedAdmin){
    return (
      <div style={{padding:24}}>
        <h2>{t.setup_admin}</h2>
        <p>{t.admin_setup_msg}</p>
        <div style={{marginTop:12}}>
          <label>{t.name}</label><br/>
          <input value={name} onChange={e=>setName(e.target.value)} style={{padding:8, width:300}}/><br/>
          <label>{t.email}</label><br/>
          <input value={email} onChange={e=>setEmail(e.target.value)} style={{padding:8, width:300}}/><br/>
          <label>{t.password}</label><br/>
          <input value={password} onChange={e=>setPassword(e.target.value)} type='password' style={{padding:8, width:300}}/><br/>
          <button onClick={handleInitialAdminCreate} className='btn primary' style={{marginTop:12}}>{t.create_admin}</button>
        </div>
      </div>
    )
  }

  if(!user){
    return (
      <div style={{padding:24}}>
        <h2>{t.login_title}</h2>
        <div style={{marginTop:12}}>
          <label>{t.email}</label><br/>
          <input value={email} onChange={e=>setEmail(e.target.value)} style={{padding:8, width:300}}/><br/>
          <label>{t.password}</label><br/>
          <input value={password} onChange={e=>setPassword(e.target.value)} type='password' style={{padding:8, width:300}}/><br/>
          <button onClick={handleLogin} className='btn primary' style={{marginTop:12}}>{t.login}</button>
        </div>
        <div style={{marginTop:20}}>
          <label>{t.language}</label>
          <select value={lang} onChange={e=>setLang(e.target.value)} style={{marginLeft:8}}>
            <option value='ar'>العربية</option>
            <option value='en'>English</option>
          </select>
          <label style={{marginLeft:12}}>{t.theme}</label>
          <select value={theme} onChange={e=>setTheme(e.target.value)} style={{marginLeft:8}}>
            <option value='light'>Light</option>
            <option value='dark'>Dark</option>
          </select>
        </div>
      </div>
    )
  }

  return (
    <div style={{padding:24}}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h1>Medo PS</h1>
          <div style={{color:'#666'}}>{user.name} ({user.role})</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>{ setLang(lang==='ar'?'en':'ar'); }} className='btn'>{lang==='ar'?'EN':'ع'}</button>
          <button onClick={()=>{ setTheme(t=>t==='dark'?'light':'dark'); }} className='btn'>{theme==='dark'?'Light':'Dark'}</button>
          <button onClick={logout} className='btn'>{t.logout}</button>
        </div>
      </header>

      <main style={{marginTop:16}}>
        <section style={{display:'grid',gridTemplateColumns:'1fr 320px', gap:16}}>
          <div className='card'>
            <h3>Dashboard</h3>
            <p>لوحة الأجهزة، بدأ الجلسات، كاشير، إلخ (نموذج).</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12, marginTop:12}}>
              {[1,2,3,4].map(n=>(
                <div key={n} className='card'>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <div>جهاز رقم {n}</div>
                    <div style={{color:'#059669'}}>متاح</div>
                  </div>
                  <div style={{marginTop:8, display:'flex', gap:8}}>
                    <button className='btn primary' style={{flex:1}}>Start</button>
                    <button className='btn'>Details</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className='card'>
            <h4>{t.users}</h4>
            {user.role==='admin' && (
              <div>
                <h5 style={{marginTop:8}}>{t.create_user}</h5>
                <input placeholder={t.name} value={newUserName} onChange={e=>setNewUserName(e.target.value)} style={{width:'100%',padding:8, marginTop:6}}/>
                <input placeholder={t.email} value={newUserEmail} onChange={e=>setNewUserEmail(e.target.value)} style={{width:'100%',padding:8, marginTop:6}}/>
                <input placeholder={t.password} value={newUserPass} onChange={e=>setNewUserPass(e.target.value)} type='password' style={{width:'100%',padding:8, marginTop:6}}/>
                <button onClick={createCashier} className='btn primary' style={{marginTop:8}}>Create</button>
              </div>
            )}
            <div style={{marginTop:12}}>
              <strong>All users</strong>
              <ul style={{marginTop:8}}>
                {usersList.map(u=>(
                  <li key={u.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
                    <div>{u.name} ({u.role})</div>
                    {user.role==='admin' && <button onClick={async ()=>{ if(confirm('delete?')){ await window.electronAPI.deleteUser(u.id); await loadUsers(); } }} className='btn'>Del</button>}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}
