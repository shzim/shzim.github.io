import { isFirebaseConfigured, auth, signInWithEmailAndPassword, onAuthStateChanged } from './firebase-config.js';

// Fallback credentials for local preview mode (before Firebase keys are pasted)
const LOCAL_FALLBACK_USER = "shzimbaka@gmail.com";
const LOCAL_FALLBACK_PASS = "zimboXLR@69";

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const statusMsg = document.getElementById('login-status-msg');
  const submitBtn = document.getElementById('login-submit-btn');

  // Check Firebase Auth state if Firebase is configured
  if (isFirebaseConfigured && auth) {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        sessionStorage.setItem('zim_admin_auth', 'true');
        window.location.href = 'dashboard.html';
      }
    });
  } else if (sessionStorage.getItem('zim_admin_auth') === 'true') {
    // If running in local fallback mode and already authorized
    window.location.href = 'dashboard.html';
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      statusMsg.className = 'status-msg';
      statusMsg.textContent = '';

      const email = document.getElementById('admin-email').value.trim();
      const password = document.getElementById('admin-password').value;

      if (submitBtn) submitBtn.disabled = true;

      // 1. Firebase Authentication mode
      if (isFirebaseConfigured && auth) {
        try {
          await signInWithEmailAndPassword(auth, email, password);
          sessionStorage.setItem('zim_admin_auth', 'true');
          window.location.href = 'dashboard.html';
        } catch (err) {
          console.error("Firebase auth error:", err);
          statusMsg.className = 'status-msg error';
          if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            statusMsg.textContent = "Invalid email or password. Access denied.";
          } else if (err.code === 'auth/too-many-requests') {
            statusMsg.textContent = "Access temporarily locked due to too many failed attempts. Try again later.";
          } else {
            statusMsg.textContent = `Authentication error: ${err.message || 'Access denied'}`;
          }
          if (submitBtn) submitBtn.disabled = false;
        }
        return;
      }

      // 2. Local fallback mode (if Firebase config contains placeholders)
      if (email.toLowerCase() === LOCAL_FALLBACK_USER.toLowerCase() && password === LOCAL_FALLBACK_PASS) {
        sessionStorage.setItem('zim_admin_auth', 'true');
        window.location.href = 'dashboard.html';
      } else {
        statusMsg.className = 'status-msg error';
        statusMsg.textContent = "Access denied: Invalid credentials.";
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
});

