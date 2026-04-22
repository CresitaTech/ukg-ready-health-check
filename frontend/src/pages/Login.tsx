import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import OpalliosLogo from '../assets/Opallios_logo.jpg';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type LoginFormValues = z.infer<typeof loginSchema>;

export const Login = () => {
  const [serverError, setServerError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setServerError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Login failed');
      }
      const resData = await res.json();
      login(resData.access_token, resData.user);
      navigate(resData.user?.role === 'manager' ? '/manager' : '/dashboard');
    } catch (err: any) {
      setServerError(err.message);
    }
  };

  return (
    <div className="auth-page">
      {/* Sidebar */}
      <div className="auth-sidebar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '3rem' }}>
            <div style={{ width: 48, height: 48, overflow: 'hidden', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              <img src={OpalliosLogo} alt="Opallios Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Opallios</span>
          </div>

          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: '1.25rem' }}>
            UKG Ready<br/>Health Check Platform
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: '2.5rem' }}>
            A structured intake system for CSMs to refer customers for Opallios health check engagements.
          </p>

          {/* Feature list */}
          {[
            'Multi-step structured intake form',
            'Auto-save drafts at every step',
            'Resume from where you left off',
            'Secure JWT-based authentication',
          ].map((feat, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--brand-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{feat}</span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: '2rem' }}>
          Confidential — For Opallios & authorized UKG CSM personnel only.
        </p>
      </div>

      {/* Form */}
      <div className="auth-main">
        <div className="auth-form-card">
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>Welcome</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Sign in to access your workspace</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            {serverError && (
              <div className="alert alert-danger">{serverError}</div>
            )}

            <Input
              label="Work email"
              type="email"
              placeholder="name@company.com"
              registration={register('email')}
              error={errors.email?.message}
            />
            <div>
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                registration={register('password')}
                error={errors.password?.message}
              />
              <div style={{ textAlign: 'right', marginTop: '0.375rem' }}>
                <Link to="/forgot-password" style={{ fontSize: '0.8125rem', color: 'var(--brand-accent)', fontWeight: 500, textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
            </div>

            <div style={{ paddingTop: '0.5rem' }}>
              <Button type="submit" isLoading={isSubmitting} style={{ width: '100%' }} size="lg">
                Sign in
              </Button>
            </div>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--brand-accent)', fontWeight: 600 }}>Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
