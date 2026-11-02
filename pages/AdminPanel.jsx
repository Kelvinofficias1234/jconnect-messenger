import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Users, RefreshCw, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppLogo from '@/components/AppLogo';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const u = await base44.entities.User.list();
      setUsers(u);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="min-h-screen jconnect-bg text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-white/5"
        style={{ backgroundColor: '#13152a' }}>
        <Link to="/" className="text-white/60 hover:text-white">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-white text-lg flex-1 flex items-center gap-2.5">
          <AppLogo size="sm" name="J-Connect Admin" textClassName="text-lg" />
        </h1>
        <button onClick={loadUsers} className="p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 shadow-2xl"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 0 60px rgba(124,58,237,0.5)' }}>
              <Globe size={40} className="text-white" />
            </div>
            <p className="text-white/50 text-sm mb-2">Total Users Worldwide</p>
            <p className="text-6xl font-bold text-white tracking-tight">{users.length}</p>
            <p className="text-white/40 text-sm mt-3 flex items-center gap-1.5">
              <Users size={14} className="text-purple-400" />
              people using J-Connect across the globe
            </p>
          </div>
        )}
      </div>
    </div>
  );
}