import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import OpalliosLogo from '../assets/Opallios_logo.jpg';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});
type FormValues = z.infer<typeof schema>;

export const ForgotPassword = () => {
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setServerError('');
    setSuccess(false);
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const resData = await res.json();
      
      if (!res.ok) {
        throw new Error(resData.detail || 'An error occurred');
      }
      
      setSuccess(true);
    } catch (err: any) {
      setServerError(err.message);
    }
  };

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
            Password<br/>Recovery
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
            Enter your email to receive a password reset link.
          </p>
        </div>
      </div>

      <div className="auth-main">
        <div className="auth-form-card">
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>Forgot Password</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>We will send you a reset link if your account exists.</p>
          </div>

          {success ? (
            <div className="alert alert-success">
              If an account exists with that email, a password reset link has been sent. Please check your inbox.
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              {serverError && <div className="alert alert-danger">{serverError}</div>}

              <Input
                label="Work email"
                type="email"
                placeholder="name@company.com"
                registration={register('email')}
                error={errors.email?.message}
              />

              <div style={{ paddingTop: '0.5rem' }}>
                <Button type="submit" isLoading={isSubmitting} style={{ width: '100%' }} size="lg">
                  Send Reset Link
                </Button>
              </div>
            </form>
          )}

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Remembered your password?{' '}
            <Link to="/login" style={{ color: 'var(--brand-accent)', fontWeight: 600 }}>Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
