import React, { useEffect } from 'react'
import Navbar from './components/Navbar.jsx';
import { Routes, Route, Navigate } from 'react-router-dom';

import HomePage from './pages/HomePage.jsx';
import SignUpPage from './pages/SignUpPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import UserProfilePage from './pages/UserProfilePage.jsx';
import OAuthSuccessPage from './pages/OAuthSuccessPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import { axiosInstance } from './lib/axios.js';
import { useAuthStore } from './store/useAuthStore.js';
import {Loader} from  "lucide-react";
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from './store/useThemeStore.js';




const App = () => {

  const {authUser, checkAuth, isCheckingAuth, onlineUsers} = useAuthStore();
  const {theme} = useThemeStore();

  console.log({onlineUsers});

  useEffect(() => {
    checkAuth();
  },[checkAuth]);

  console.log({authUser});


  if (isCheckingAuth && !authUser) return(
    <div className="flex items-center justify-center h-screen">
      <Loader className="size-10 animate spin"/>
    </div>
  )
  return (
    <div data-theme={theme}>

      <Navbar/>

      <Routes>
        <Route path="/" element= {authUser ? <HomePage /> : <Navigate to="/login" /> }/>
        <Route path="/signup" element= { !authUser ? <SignUpPage/> : <Navigate to="/" />}/>
        <Route path="/login" element= {!authUser ? <LoginPage/> :  <Navigate to= "/" />} />
        <Route path="/settings" element= {<SettingsPage/>} />
        <Route path="/profile" element= {authUser ? <ProfilePage/> : <Navigate to="/login" />} />
        <Route path="/user/:userId" element= {authUser ? <UserProfilePage/> : <Navigate to="/login" />} />
        <Route path="/auth/success" element= {<OAuthSuccessPage/>} />
        <Route path="/analytics" element= {authUser ? <AnalyticsPage/> : <Navigate to="/login" />} />

      </Routes>

      <Toaster/>



    </div>
  );
};

export default App  ;