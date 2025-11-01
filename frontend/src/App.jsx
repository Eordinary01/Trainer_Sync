import { Routes, Route } from 'react-router-dom';
import Login from './login'; 
import Dashboard from './dashboard'; 
import LeaveApplication from './LeaveApplication'; // ⬅️ NEW IMPORT
import AdminDashoard from './AdminDashboard';
import ProfilePage from './ProfilePage';
function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/leave" element={<LeaveApplication />} /> {/* ⬅️ NEW ROUTE */}
      <Route path="*" element={<h1>404: Page Not Found</h1>} />
    </Routes>
  );
}

export default App;