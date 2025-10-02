import './App.css';
import { Routes, Route } from "react-router-dom";
import Home from "./page/Home";
import Register from "./page/Register";
import Login from "./page/Login";
import Profile from "./page/Profile";
import Details from "./page/Details";
import AdminManagement from './page/AdminManagement';


export default function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/details" element={<Details />} />
        <Route path="/adminmanagement" element={<AdminManagement />} />

      </Routes>
    </div>
  );
}
