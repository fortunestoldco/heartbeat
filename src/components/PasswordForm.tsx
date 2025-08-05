'use client';

import { useState } from 'react';

interface PasswordFormProps {
  onSubmit: (password: string) => void;
  disabled: boolean;
}

export default function PasswordForm({ onSubmit, disabled }: PasswordFormProps) {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || disabled || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      onSubmit(password);
    } finally {
      setIsSubmitting(false);
      setPassword('');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            Security Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={disabled || isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Enter your security password"
            required
          />
        </div>
        <button
          type="submit"
          disabled={disabled || isSubmitting || !password.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isSubmitting ? 'Verifying...' : 'Submit Check-in'}
        </button>
      </form>
    </div>
  );
}