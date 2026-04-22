import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';
import OpalliosLogo from '../assets/Opallios_logo.jpg';

export const Navbar = () => {
  const { user, logout, isManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const dashboardPath = isManager ? '/manager' : '/dashboard';

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
          onClick={() => navigate(user ? dashboardPath : '/login')}
        >
          <div style={{
            width: 46, height: 46, overflow: 'hidden', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <img src={OpalliosLogo} alt="Opallios Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--brand-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              Opallios
            </div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>
              UKG Health Check
            </div>
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user ? (
            <>
              <Link
                to={dashboardPath}
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: location.pathname === dashboardPath ? 'var(--brand-accent)' : 'var(--text-secondary)',
                  textDecoration: 'none',
                  padding: '0.25rem 0.5rem',
                  borderRadius: 6,
                  transition: 'color 150ms',
                }}
              >
                Dashboard
              </Link>

              <div style={{
                width: 1, height: 20,
                background: 'var(--border-subtle)',
              }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{
                  width: 32, height: 32,
                  background: 'var(--brand-accent-subtle)',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.875rem', fontWeight: 700, color: 'var(--brand-accent)',
                }}>
                  {user.name?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>{user.email}</div>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={handleLogout}>
                Sign out
              </Button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Log in</Button>
              <Button size="sm" onClick={() => navigate('/register')}>Get started</Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
