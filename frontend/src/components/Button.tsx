import { useState } from 'react';
import type { ButtonHTMLAttributes, FC, CSSProperties, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
}

const styles: Record<string, CSSProperties> = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 150ms cubic-bezier(0.4,0,0.2,1)',
    whiteSpace: 'nowrap',
    letterSpacing: '0.01em',
    textDecoration: 'none',
  },
  sm:  { padding: '0.4375rem 1rem',   fontSize: '0.8125rem', borderRadius: '6px' },
  md:  { padding: '0.625rem 1.25rem', fontSize: '0.9375rem', borderRadius: '8px' },
  lg:  { padding: '0.8125rem 1.75rem', fontSize: '1rem',     borderRadius: '8px' },

  primary:   { background: 'var(--brand-accent)',    color: '#fff',                     boxShadow: '0 1px 2px rgba(0,0,0,0.08)' },
  secondary: { background: 'var(--brand-primary)',   color: '#fff',                     boxShadow: '0 1px 2px rgba(0,0,0,0.08)' },
  outline:   { background: 'transparent',            color: 'var(--text-primary)',       border: '1.5px solid var(--border-default)' },
  ghost:     { background: 'transparent',            color: 'var(--text-secondary)',     border: 'none' },
  danger:    { background: 'var(--color-danger)',    color: '#fff',                     boxShadow: '0 1px 2px rgba(0,0,0,0.08)' },
};

const hoverMap: Record<string, string> = {
  primary:   'var(--brand-accent-hover)',
  secondary: 'var(--brand-primary-light)',
  outline:   'var(--neutral-50)',
  ghost:     'var(--neutral-100)',
  danger:    '#b91c1c',
};

export const Button: FC<ButtonProps> = ({
  children, variant = 'primary', size = 'md', isLoading = false,
  leftIcon, style, ...props
}) => {
  const [hovered, setHovered] = useState(false);
  const disabled = props.disabled || isLoading;

  const computedStyle: CSSProperties = {
    ...styles.base,
    ...styles[size],
    ...styles[variant],
    opacity: disabled ? 0.65 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    background:
      variant === 'outline' || variant === 'ghost'
        ? hovered && !disabled ? hoverMap[variant] : styles[variant].background as string
        : hovered && !disabled ? hoverMap[variant] : styles[variant].background as string,
    transform: hovered && !disabled ? 'translateY(-1px)' : 'none',
    boxShadow: hovered && !disabled && (variant === 'primary' || variant === 'secondary' || variant === 'danger')
      ? '0 4px 12px rgba(0,0,0,0.15)'
      : styles[variant]?.boxShadow as string,
    ...style,
  };

  return (
    <button
      {...props}
      disabled={disabled}
      style={computedStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isLoading ? <span className="spinner" /> : leftIcon}
      {children}
    </button>
  );
};
