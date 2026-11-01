// LoginPage Component - Authentication & Collaborator Profile Selection

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth, DEMO_USERS } from '../hooks/useAuth.jsx';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState(DEMO_USERS[0]);
  const [customId, setCustomId] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const targetId = customId.trim() || selectedUser.id;
    if (!targetId) {
      setError('Please select or enter a User ID');
      return;
    }

    try {
      await login(targetId, selectedUser?.name || targetId);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please verify that the backend server is running.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Brand Header */}
        <div className="p-8 text-center border-b border-gray-100 bg-gradient-to-b from-blue-50/50 to-white">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <span className="font-heading font-bold text-2xl text-gray-950">CollabAI</span>
          </Link>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Collaborator Authentication</h2>
          <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
            Select a simulated profile or enter a custom name to test real-time Operational Transformation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Demo Profiles Grid */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2.5">
              Select Demo Collaborator
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {DEMO_USERS.map((u) => {
                const isSelected = selectedUser?.id === u.id && !customId;
                return (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => {
                      setSelectedUser(u);
                      setCustomId('');
                    }}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full text-white font-semibold flex items-center justify-center text-xs shadow-xs"
                      style={{ backgroundColor: u.color }}
                    >
                      {u.name.charAt(0)}
                    </div>
                    <div className="text-xs font-semibold text-gray-900 truncate w-full">{u.name}</div>
                    <div className="text-[10px] text-gray-400 truncate w-full">{u.role}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Or enter ID</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Custom ID Input */}
          <div>
            <label htmlFor="custom-id" className="block text-xs font-medium text-gray-700 mb-1.5">
              Custom User Identifier
            </label>
            <input
              id="custom-id"
              type="text"
              value={customId}
              onChange={(e) => {
                setCustomId(e.target.value);
                setSelectedUser(null);
              }}
              placeholder="e.g. emily-watson"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
            />
          </div>

          {/* Informative Security Disclosure */}
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 leading-relaxed space-y-1">
            <div className="font-semibold text-gray-800 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>Token Issuance Contract</span>
            </div>
            <p>
              The backend issues a 15-minute JWT access token and 7-day Redis-backed refresh token for the provided User ID. Passwords are not required for this distributed systems prototype.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Enter Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
