import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type RegisterFormValues = z.infer<typeof registerSchema>;

export const Register = () => {
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setServerError('');
    try {
      const res = await fetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Registration failed');
      }
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setServerError(err.message);
    }
  };

  return (
    <div className="auth-page">
      {/* Sidebar */}
      <div className="auth-sidebar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '3rem' }}>
            <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.12)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="var(--brand-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Opallios</span>
          </div>

          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: '1.25rem' }}>
            Create your<br/>CSM workspace
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
            Register to begin creating and managing UKG Ready Health Check referrals for your customers.
          </p>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
          Confidential — For Opallios & authorized UKG CSM personnel only.
        </p>
      </div>

      {/* Form */}
      <div className="auth-main">
        <div className="auth-form-card">
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>Create an account</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>One workspace for all your referrals</p>
          </div>

          {success ? (
            <div className="alert alert-success">
              ✓ Account created successfully! Redirecting to login…
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              {serverError && <div className="alert alert-danger">{serverError}</div>}

              <Input
                label="Full name"
                type="text"
                placeholder="Jane Doe"
                registration={register('name')}
                error={errors.name?.message}
              />
              <Input
                label="Work email"
                type="email"
                placeholder="name@company.com"
                registration={register('email')}
                error={errors.email?.message}
              />
              <Input
                label="Password"
                type="password"
                placeholder="Minimum 6 characters"
                registration={register('password')}
                error={errors.password?.message}
              />

              <div style={{ paddingTop: '0.5rem' }}>
                <Button type="submit" isLoading={isSubmitting} style={{ width: '100%' }} size="lg">
                  Create account
                </Button>
              </div>
            </form>
          )}

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--brand-accent)', fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
