import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom'; 
import { useAuth } from "../../hooks/useAuth";

export default function Login() {
  const { login, loading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({ 
    username: '', 
    password: '' 
  });
  const navigate = useNavigate(); 

  // Clear error when component mounts or form changes
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: value 
    }));
    
    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    // Basic validation
    if (!formData.username || !formData.password) {
      return;
    }

    const result = await login(formData.username, formData.password);
    if (result && result.success) {
      // Navigate based on user role - both ADMIN and HR go to admin dashboard
      if (result.user.role === 'ADMIN' || result.user.role === 'HR') {
        navigate('/admin/dashboard');
      } else {
        navigate('/trainer/dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100"> 
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-sm"> 
        
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-600"> 
          TrainerSync Login
        </h1>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          
          {/* Username Input Field */}
          <div>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Username"
              required
              disabled={loading}
            />
          </div>

          {/* Password Input Field */}
          <div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Password"
              required
              disabled={loading}
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading || !formData.username || !formData.password}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging In...
              </div>
            ) : (
              "Log In"
            )}
          </button>
          
          <p className="text-center text-sm text-gray-600 pt-2"> 
            <a href="/forgot-password" className="hover:text-blue-600 transition-colors">
              Forgot Password?
            </a>
          </p>
        </form>

        
      </div>
    </div>
  );
}