import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import SignInPage from './pages/SignInPage';
// import SignUpPage from './pages/SignUpPage';
import ChatPage from './pages/ChatPage';

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Redirect to sign-in page */}
        {/* <Route path="/" element={<Navigate to="/signin" />} /> */}

        {/* Other routes */}
        {/* <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} /> */}
        <Route path="/" element={<ChatPage />} />
      </Routes>
    </Router>
  );
};

export default App;
