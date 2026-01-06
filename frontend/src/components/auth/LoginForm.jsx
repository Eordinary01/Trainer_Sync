import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom'; 
import { useAuth } from "../../hooks/useAuth";

export default function Login() {
  const { login, loading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const navigate = useNavigate();

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    try {
      const result = await login(formData.username, formData.password);

      if (result.success) {
        const loggedInUser = result.user;

        // ✅ If temp password → force change password
        if (loggedInUser?.isFirstLogin) {
          console.log("⚠ Temporary password detected. Redirecting to Change Password...");
          navigate('/change-password');  
          return;
        }

        // ✅ Otherwise normal redirect based on role
        if (loggedInUser.role === 'ADMIN' || loggedInUser.role === 'HR') {
          navigate('/admin/dashboard');
        } else {
          navigate('/trainer/dashboard');
        }
      }
    } catch (err) {
      console.error("💥 Login error:", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-600">
          TrainerSync Login
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Username"
            className="w-full p-3 border rounded-lg"
            disabled={loading}
            required
          />

          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Password"
            className="w-full p-3 border rounded-lg"
            disabled={loading}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg"
          >
            {loading ? "Logging In..." : "Log In"}
          </button>

          <p className="text-center text-sm text-gray-600">
            <a href="/forgot-password" className="hover:text-blue-600">Forgot Password?</a>
          </p>
        </form>
      </div>
    </div>
  );
}
