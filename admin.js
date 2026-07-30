import { isFirebaseConfigured, auth, signInWithEmailAndPassword } from './firebase-config.js';

const ADMIN_USER = "zimbo";
const ADMIN_PASS = "zimboXLR@69";

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect straight to dashboard
  if (sessionStorage.getItem('zim_admin_auth') === 'true') {
    window.location.href = 'dashboard.html';
    return;
  }

  const loginForm = document.getElementById('login-form');
  const statusMsg = document.getElementById('login-status-msg');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      statusMsg.textContent = '';

      const userInput = document.getElementById('admin-username').value.trim();
      const passwordInput = document.getElementById('admin-password').value;

      // Validate credentials (zimbo / zimboXLR@69)
      if (userInput === ADMIN_USER && passwordInput === ADMIN_PASS) {
        sessionStorage.setItem('zim_admin_auth', 'true');
        window.location.href = 'dashboard.html';
        return;
      }

      // Firebase auth fallback check if email input
      if (isFirebaseConfigured && auth && userInput.includes('@')) {
        try {
          await signInWithEmailAndPassword(auth, userInput, passwordInput);
          sessionStorage.setItem('zim_admin_auth', 'true');
          window.location.href = 'dashboard.html';
          return;
        } catch (err) {
          statusMsg.textContent = "go away, who the fuck are you!";
          return;
        }
      }

      // Error message for invalid password or username
      statusMsg.textContent = "go away, who the fuck are you!";
    });
  }
});
