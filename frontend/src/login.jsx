import { useState } from "react";
import { useNavigate } from 'react-router-dom'; 
import axios from 'axios'; // ⬅️ IMPORT: API Client

// 💡 Define the backend URL for Authentication
const API_URL = 'http://localhost:5000/api/auth/login';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // State for loading indicator
  const navigate = useNavigate(); 

  const handleSubmit = async (e) => { // ⬅️ Function must be ASYNC
    e.preventDefault();
    setLoading(true); // Start loading

    try {
      // 1. POST request to the backend login endpoint
      const response = await axios.post(API_URL, { 
        email, 
        password,
      });

      // 2. Extract token and role from the successful response
      const { token, user } = response.data; // Assuming backend sends { token: "...", user: { role: "..." } }
      const userRole = user.role; 

      // 3. Store the JWT and role in the browser (Security: JWT handles authentication)
      localStorage.setItem('userToken', token);
      localStorage.setItem('userRole', userRole);

      // 4. Redirect based on role (FR1.2)
      if (userRole === 'admin') {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }

    } catch (error) {
      // 5. Handle errors (network issues or wrong credentials)
      console.error("Login Error:", error.response || error.message);
      alert(`Login Failed: ${error.response?.data?.message || "Check server status and credentials."}`);

    } finally {
      setLoading(false); // Stop loading
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100"> 
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-sm"> 
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-600"> 
          TrainerSync Login
        </h1>

        <form className="space-y-6" onSubmit={handleSubmit}>
          
          {/* Email Input Field */}
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email" 
            />
          </div>

          {/* Password Input Field */}
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Password"
            />
          </div>

          {/* Login Button: Displays loading state */}
          <button
            type="submit"
            disabled={loading} 
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Logging In..." : "Log In"} 
          </button>
          
          <p className="text-center text-sm text-gray-600 pt-2"> 
            <a href="#" className="hover:text-blue-600">
              Forgot Password?
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}