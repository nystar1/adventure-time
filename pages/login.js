import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch('/api/sendOtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setError('');
        setShowOtpInput(true);
      } else {
        setError(data.message || 'An error occurred');
      }
    } catch (err) {
      setError('Failed to connect to the server');
      console.error('Error:', err);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/verifyOtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.toLowerCase().trim(),
          otp: otp
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setError('');
        localStorage.setItem('authToken', data.token);
        // Redirect to intended page if present
        const redirect = localStorage.getItem('redirectAfterLogin');
        if (redirect) {
          localStorage.removeItem('redirectAfterLogin');
          router.push(redirect);
        } else {
          router.push('/review');
        }
      } else {
        setError(data.message || 'Invalid OTP');
      }
    } catch (err) {
      setError('Failed to verify OTP');
      console.error('Error:', err);
    }
  };

  return (
    <div>
      <div>
        <h2>Sign in to your account</h2>
      </div>
      <form onSubmit={showOtpInput ? handleVerifyOTP : handleSendOTP}>
        <div>
          <div>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={showOtpInput}
            />
          </div>
          {showOtpInput && (
            <div>
              <label htmlFor="otp">OTP</label>
              <input
                id="otp"
                name="otp"
                type="text"
                required
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>
          )}
        </div>

        {error && (
          <div>{error}</div>
        )}

        <div>
          <button type="submit">
            {showOtpInput ? 'Verify' : 'Send OTP'}
          </button>
        </div>
      </form>
    </div>
  );
} 