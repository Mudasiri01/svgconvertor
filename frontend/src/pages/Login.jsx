import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import '../styles/App.css'; // using existing styles

const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.warning('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      // Get or generate machine ID
      let machineId = localStorage.getItem('aura_machine_id');
      if (!machineId) {
        machineId = uuidv4();
        localStorage.setItem('aura_machine_id', machineId);
      }

      const API_URL = import.meta.env.VITE_API_URL || 'https://your-vercel-api.vercel.app/api';

      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, machineId })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Login failed.');
        setIsLoading(false);
        return;
      }

      // Save token and notify parent
      localStorage.setItem('aura_token', data.token);
      toast.success('Login successful!');
      onLoginSuccess(data.user);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Network error or server is unreachable.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#0a0a0f', color: '#fff'
    }}>
      <div className="login-box" style={{
        backgroundColor: '#151520', padding: '40px', borderRadius: '12px', border: '1px solid rgba(0, 212, 255, 0.3)', width: '400px', maxWidth: '90%', textAlign: 'center'
      }}>
        <div className="logo-section" style={{ marginBottom: '30px' }}>
          <span className="aura-icon" style={{ fontSize: '32px', color: '#00d4ff' }}>✦</span>
          <h1 className="app-title" style={{ fontSize: '28px', margin: '10px 0' }}>AURA</h1>
          <span className="app-subtitle" style={{ color: '#888', fontSize: '12px', letterSpacing: '2px' }}>LICENSED DESKTOP APP</span>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: '12px', borderRadius: '6px', border: '1px solid #333', backgroundColor: '#0a0a0f', color: '#fff', fontSize: '14px'
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: '12px', borderRadius: '6px', border: '1px solid #333', backgroundColor: '#0a0a0f', color: '#fff', fontSize: '14px'
            }}
          />
          <button type="submit" disabled={isLoading} style={{
            padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#00d4ff', color: '#000', fontWeight: 'bold', cursor: isLoading ? 'not-allowed' : 'pointer', marginTop: '10px'
          }}>
            {isLoading ? 'AUTHENTICATING...' : 'LOGIN'}
          </button>
        </form>
        <p style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>Contact your administrator for access.</p>
      </div>
    </div>
  );
};

export default Login;
