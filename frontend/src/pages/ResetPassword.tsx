import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import OpalliosLogo from '../assets/Opallios_logo.jpg';

const schema = z.object({
  new_password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string()
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type FormValues = z.infer<typeof schema>;

export const ResetPassword = () => {
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setServerError('');
    
    if (!token) {
      setServerError('Invalid or missing reset token.');
      return;
    }
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: data.new_password }),
      });
      
      const resData = await res.json();
      
      if (!res.ok) {
        throw new Error(resData.detail || 'Failed to reset password');
      }
      
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setServerError(err.message);
    }
  };

  if (!token) {
    return (
      <div className="auth-page" style={{ justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center', maxWidth: 400 }}>
          <h2 style={{ marginBottom: '1rem' }}>Invalid Request</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>No reset token provided. Please use the link from your email.</p>
          <Button onClick={() => navigate('/login')}>Back to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-sidebar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '3rem' }}>
            <div style={{ width: 48, height: 48, overflow: 'hidden', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              <img src={OpalliosLogo} alt="Opallios Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Opallios</span>
          </div>

          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: '1.25rem' }}>
            Reset your<br/>Password
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
            Choose a secure, new password for your account.
          </p>
        </div>
      </div>

      <div className="auth-main">
        <div className="auth-form-card">
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>New Password</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Enter at least 6 characters.</p>
          </div>

          {success ? (
            <div className="alert alert-success">
              ✓ Password has been reset successfully! Redirecting to login…
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              {serverError && <div className="alert alert-danger">{serverError}</div>}

              <Input
                label="New Password"
                type="password"
                placeholder="********"
                registration={register('new_password')}
                error={errors.new_password?.message}
              />
              
              <Input
                label="Confirm Password"
                type="password"
                placeholder="********"
                registration={register('confirm_password')}
                error={errors.confirm_password?.message}
              />

              <div style={{ paddingTop: '0.5rem' }}>
                <Button type="submit" isLoading={isSubmitting} style={{ width: '100%' }} size="lg">
                  Reset Password
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
