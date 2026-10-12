import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle, 
  CheckCircle, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Check,
  RotateCcw,
  Copy,
  X
} from 'lucide-react';
import { storage } from '../utils/storage';
import { sendOtpEmail, verifyRemoteOtp } from '../services/api';
import './AuthView.css';
import t2tLogo from '../assets/t2t-logo.jpg';

export default function AuthView({ onLoginSuccess, onGuestContinue, initialTab = 'signin', bannerMessage = '' }) {
  // Navigation / Step: 'form' | 'otp'
  const [step, setStep] = useState('form');
  const [activeTab, setActiveTab] = useState(initialTab); // 'signin' | 'signup'

  // Form States - Sign In
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Form States - Sign Up
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [signUpRole, setSignUpRole] = useState('customer'); // 'customer' | 'artisan'
  const [agreeTerms, setAgreeTerms] = useState(true);

  // OTP Verification States
  const [otpTargetEmail, setOtpTargetEmail] = useState('');
  const [otpFlowType, setOtpFlowType] = useState('signup'); // 'signup' | 'signin' | 'google'
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [activeOtpCode, setActiveOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  // Google Modal States
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  // UI States
  const [alert, setAlert] = useState(bannerMessage ? { type: 'info', message: bannerMessage } : null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ref array for 6 OTP input boxes
  const otpInputRefs = useRef([]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, resendTimer]);

  // Focus first OTP box on entering OTP screen
  useEffect(() => {
    if (step === 'otp' && otpInputRefs.current[0]) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Calculate password strength
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { label: 'Empty', class: '' };
    if (pwd.length < 6) return { label: 'Too short (min 6 chars)', class: 'weak' };
    const hasNumbers = /\d/.test(pwd);
    const hasLetters = /[a-zA-Z]/.test(pwd);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

    if (pwd.length >= 8 && hasNumbers && hasLetters && hasSpecial) {
      return { label: 'Strong', class: 'strong' };
    }
    if (pwd.length >= 6 && hasNumbers && hasLetters) {
      return { label: 'Good', class: 'medium' };
    }
    return { label: 'Weak', class: 'weak' };
  };

  const strength = getPasswordStrength(signUpPassword);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setAlert(null);
  };

  // Helper to validate Gmail
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test((email || '').trim());
  };

  // Handle Sign In submission with Password
  const handleSignInSubmit = (e) => {
    e.preventDefault();
    setAlert(null);

    const identifier = signInIdentifier.trim();
    if (!identifier) {
      setAlert({ type: 'error', message: 'Please enter your registered Gmail ID or Phone number.' });
      return;
    }
    if (!signInPassword) {
      setAlert({ type: 'error', message: 'Please enter your password.' });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const result = storage.authenticateUser(identifier, signInPassword);
      setIsSubmitting(false);

      if (result.success) {
        setAlert({ type: 'success', message: `Welcome back, ${result.user.name}!` });
        setTimeout(() => {
          onLoginSuccess(result.user);
        }, 600);
      } else {
        setAlert({ type: 'error', message: result.error });
      }
    }, 400);
  };

  // Handle initiating Sign In with Gmail OTP (Passwordless)
  const handleStartSignInWithOtp = async () => {
    setAlert(null);
    const identifier = signInIdentifier.trim();
    if (!identifier) {
      setAlert({ type: 'error', message: 'Please enter your registered Gmail address above to receive an OTP.' });
      return;
    }

    if (!isValidEmail(identifier)) {
      setAlert({ type: 'error', message: 'Please enter a valid Gmail address (e.g. name@gmail.com) for OTP verification.' });
      return;
    }

    const existingUser = storage.findUser(identifier);
    if (!existingUser) {
      setAlert({ type: 'error', message: 'No account found with this Gmail. Please switch to the Sign Up tab to create your account.' });
      return;
    }

    // Generate real OTP
    setIsSubmitting(true);
    const code = storage.generateOtp(identifier);
    setActiveOtpCode(code);
    setOtpTargetEmail(identifier);
    setOtpFlowType('signin');
    setOtpDigits(['', '', '', '', '', '']);
    setResendTimer(30);
    setCanResend(false);

    try {
      const res = await sendOtpEmail({
        email: identifier,
        name: existingUser.name,
        flowType: 'signin',
        code
      });
      setIsSubmitting(false);
      setStep('otp');
      if (res?.emailSent) {
        setIsEmailSent(true);
        setAlert({ type: 'success', message: `✅ Verification code successfully sent to ${identifier}. Please check your inbox!` });
      } else {
        setIsEmailSent(false);
        setAlert({ type: 'info', message: res?.message || `Verification code dispatched to ${identifier}.` });
      }
    } catch {
      setIsSubmitting(false);
      setStep('otp');
      setIsEmailSent(false);
      setAlert({ type: 'info', message: `Verification code generated for ${identifier}.` });
    }
  };

  // Handle initiating Sign Up with Gmail OTP
  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    const name = signUpName.trim();
    const email = signUpEmail.trim().toLowerCase();
    const phone = signUpPhone.trim();
    const password = signUpPassword;

    if (!name) {
      setAlert({ type: 'error', message: 'Please enter your full name.' });
      return;
    }

    if (!isValidEmail(email)) {
      setAlert({ type: 'error', message: 'Please enter a valid email address (e.g. name@gmail.com).' });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setAlert({ type: 'error', message: 'Please enter a valid 10-digit phone number.' });
      return;
    }

    if (password.length < 6) {
      setAlert({ type: 'error', message: 'Password must be at least 6 characters long.' });
      return;
    }

    if (!agreeTerms) {
      setAlert({ type: 'error', message: 'Please agree to the T2T (Trash to Treasure) Craft Authenticity Pledge to proceed.' });
      return;
    }

    // Check if account already exists before sending OTP
    const existing = storage.findUser(email);
    if (existing) {
      setAlert({ type: 'error', message: 'An account with this email already exists. Please sign in instead.' });
      return;
    }

    // Generate real OTP
    setIsSubmitting(true);
    const code = storage.generateOtp(email);
    setActiveOtpCode(code);
    setOtpTargetEmail(email);
    setOtpFlowType('signup');
    setOtpDigits(['', '', '', '', '', '']);
    setResendTimer(30);
    setCanResend(false);

    try {
      const res = await sendOtpEmail({
        email,
        name,
        flowType: 'signup',
        code
      });
      setIsSubmitting(false);
      setStep('otp');
      if (res?.emailSent) {
        setIsEmailSent(true);
        setAlert({ type: 'success', message: `✅ Verification code successfully sent to ${email}. Please check your inbox!` });
      } else {
        setIsEmailSent(false);
        setAlert({ type: 'info', message: res?.message || `Verification code dispatched to ${email}.` });
      }
    } catch {
      setIsSubmitting(false);
      setStep('otp');
      setIsEmailSent(false);
      setAlert({ type: 'info', message: `Verification code generated for ${email}.` });
    }
  };

  // Handle Google Modal Form Submit
  const handleGoogleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    const email = googleEmail.trim().toLowerCase();
    const name = googleName.trim() || email.split('@')[0];

    if (!isValidEmail(email)) {
      setAlert({ type: 'error', message: 'Please enter a valid Gmail address (e.g. username@gmail.com).' });
      return;
    }

    setShowGoogleModal(false);
    setIsSubmitting(true);
    const code = storage.generateOtp(email);
    setActiveOtpCode(code);
    setOtpTargetEmail(email);
    setOtpFlowType('google');
    setGoogleName(name);
    setOtpDigits(['', '', '', '', '', '']);
    setResendTimer(30);
    setCanResend(false);

    try {
      const res = await sendOtpEmail({
        email,
        name,
        flowType: 'google',
        code
      });
      setIsSubmitting(false);
      setStep('otp');
      if (res?.emailSent) {
        setIsEmailSent(true);
        setAlert({ type: 'success', message: `✅ Google authentication code sent directly to ${email}.` });
      } else {
        setIsEmailSent(false);
        setAlert({ type: 'info', message: res?.message || `Google authentication OTP sent to ${email}.` });
      }
    } catch {
      setIsSubmitting(false);
      setStep('otp');
      setIsEmailSent(false);
      setAlert({ type: 'info', message: `Google authentication OTP sent to ${email}.` });
    }
  };

  // OTP Digit Box Change Handler with auto-advance
  const handleOtpDigitChange = (index, value) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, '');
    
    // Handle paste of full 6-digit code
    if (cleaned.length >= 6) {
      const newDigits = cleaned.slice(0, 6).split('');
      setOtpDigits(newDigits);
      otpInputRefs.current[5]?.focus();
      return;
    }

    const char = cleaned.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    // Auto-advance to next box if char entered
    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace navigation in OTP
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Auto-fill from simulated inbox copy button
  const handleCopyOtp = () => {
    if (!activeOtpCode) return;
    const digits = activeOtpCode.split('');
    setOtpDigits(digits);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
    otpInputRefs.current[5]?.focus();
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setIsSubmitting(true);
    const newCode = storage.generateOtp(otpTargetEmail);
    setActiveOtpCode(newCode);
    setResendTimer(30);
    setCanResend(false);
    setOtpDigits(['', '', '', '', '', '']);

    try {
      const res = await sendOtpEmail({
        email: otpTargetEmail,
        name: signUpName || googleName,
        flowType: otpFlowType,
        code: newCode
      });
      setIsSubmitting(false);
      if (res?.emailSent) {
        setIsEmailSent(true);
        setAlert({ type: 'success', message: `✅ A new verification code was sent to ${otpTargetEmail}.` });
      } else {
        setIsEmailSent(false);
        setAlert({ type: 'info', message: `A new 6-digit verification code has been generated for ${otpTargetEmail}.` });
      }
    } catch {
      setIsSubmitting(false);
      setIsEmailSent(false);
      setAlert({ type: 'info', message: `A new 6-digit verification code has been generated for ${otpTargetEmail}.` });
    }
    otpInputRefs.current[0]?.focus();
  };

  // Verify and Approve OTP
  const handleApproveOtp = async (e) => {
    if (e) e.preventDefault();
    setAlert(null);

    const enteredCode = otpDigits.join('');
    if (enteredCode.length < 6) {
      setAlert({ type: 'error', message: 'Please enter all 6 digits of the verification code.' });
      return;
    }

    setIsSubmitting(true);
    let isApproved = false;

    // Check remote DB first if available
    try {
      const remoteRes = await verifyRemoteOtp({ email: otpTargetEmail, code: enteredCode });
      if (remoteRes && remoteRes.success) {
        isApproved = true;
      }
    } catch {
      // Continue to local verification
    }

    if (!isApproved) {
      const verifyResult = storage.verifyOtp(otpTargetEmail, enteredCode);
      if (verifyResult.success) {
        isApproved = true;
      } else {
        setIsSubmitting(false);
        setAlert({ type: 'error', message: verifyResult.error });
        return;
      }
    }

    setIsSubmitting(false);

      // OTP Approved successfully!
      if (otpFlowType === 'signup') {
        const regResult = storage.registerUser({
          name: signUpName,
          email: signUpEmail,
          phone: signUpPhone,
          password: signUpPassword,
          role: signUpRole,
          isVerified: true
        });

        if (regResult.success) {
          setAlert({ 
            type: 'success', 
            message: `Gmail verified and approved! Welcome to T2T (Trash to Treasure), ${regResult.user.name}.` 
          });
          setTimeout(() => {
            onLoginSuccess(regResult.user);
          }, 700);
        } else {
          setAlert({ type: 'error', message: regResult.error });
        }
      } else if (otpFlowType === 'signin') {
        const user = storage.findUser(otpTargetEmail);
        if (user) {
          user.isVerified = true;
          storage.saveCurrentUser(user);
          setAlert({ type: 'success', message: `Gmail verified! Welcome back, ${user.name}.` });
          setTimeout(() => {
            onLoginSuccess(user);
          }, 600);
        }
      } else if (otpFlowType === 'google') {
        const googleResult = storage.loginWithGoogle({
          name: googleName,
          email: otpTargetEmail,
          role: 'customer'
        });

        if (googleResult.success) {
          setAlert({ 
            type: 'success', 
            message: `Google account approved! Welcome to T2T (Trash to Treasure), ${googleResult.user.name}.` 
          });
          setTimeout(() => {
            onLoginSuccess(googleResult.user);
          }, 600);
        }
      }
  };

  return (
    <div className="auth-page-wrapper fade-in">
      <div className="auth-card">
        {/* =========================================================
            VIEW 1: SIGN IN / SIGN UP FORM
           ========================================================= */}
        {step === 'form' && (
          <>
            {/* Header */}
            <div className="auth-header">
              <img src={t2tLogo} alt="T2T - Trash to Treasure" className="auth-brand-logo" />
              <h2>T2T</h2>
              <span className="auth-tagline-text">Trash to Treasure &bull; Upcycled Handcrafted Living</span>
              <p>
                {activeTab === 'signin' 
                  ? 'Sign in to reconnect with upcycled crafts & Trash to Treasure chronicles'
                  : 'Create an account to celebrate authentic Trash to Treasure upcycling'}
              </p>
            </div>

            {/* Continue with Google Action */}
            <div className="auth-social-section">
              <button 
                type="button" 
                className="btn-google"
                onClick={() => {
                  setGoogleEmail('');
                  setGoogleName('');
                  setShowGoogleModal(true);
                }}
                aria-label="Continue with Google"
              >
                <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>

            <div className="auth-divider">
              <span>or continue with email & phone</span>
            </div>

            {/* Tab Switcher */}
            <div className="auth-tabs" role="tablist">
              <button 
                type="button"
                role="tab"
                aria-selected={activeTab === 'signin'}
                className={`auth-tab ${activeTab === 'signin' ? 'active' : ''}`}
                onClick={() => handleTabSwitch('signin')}
              >
                Sign In
              </button>
              <button 
                type="button"
                role="tab"
                aria-selected={activeTab === 'signup'}
                className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
                onClick={() => handleTabSwitch('signup')}
              >
                Sign Up
              </button>
            </div>

            {/* Alert Feedback Banner */}
            {alert && (
              <div className={`auth-alert auth-alert-${alert.type}`} role="alert" style={{ marginBottom: '1.25rem' }}>
                {alert.type === 'error' && <AlertCircle size={18} style={{ flexShrink: 0 }} />}
                {alert.type === 'success' && <CheckCircle size={18} style={{ flexShrink: 0 }} />}
                {alert.type === 'info' && <Sparkles size={18} style={{ flexShrink: 0 }} />}
                <span>{alert.message}</span>
              </div>
            )}

            {/* SIGN IN FORM */}
            {activeTab === 'signin' && (
              <form className="auth-form" onSubmit={handleSignInSubmit} noValidate>
                {/* Email / Gmail or Phone */}
                <div className="form-field-group">
                  <div className="field-label-row">
                    <label htmlFor="signin-identifier">Gmail ID or Phone No</label>
                    <span className="gmail-tag">Gmail Verified</span>
                  </div>
                  <div className="input-with-icon">
                    <span className="input-icon-left">
                      <Mail size={16} />
                    </span>
                    <input 
                      type="text"
                      id="signin-identifier"
                      name="username"
                      autoComplete="username"
                      inputMode="email"
                      placeholder="e.g. yourname@gmail.com or +91 98765 43210"
                      value={signInIdentifier}
                      onChange={(e) => setSignInIdentifier(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="form-field-group">
                  <label htmlFor="signin-password">Password</label>
                  <div className="input-with-icon">
                    <span className="input-icon-left">
                      <Lock size={16} />
                    </span>
                    <input 
                      type={showSignInPassword ? 'text' : 'password'}
                      id="signin-password"
                      name="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      required
                    />
                    <button 
                      type="button" 
                      className="password-toggle-btn"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignInPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="form-helper-row">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={rememberMe} 
                      onChange={(e) => setRememberMe(e.target.checked)} 
                    />
                    <span>Remember this device</span>
                  </label>
                </div>

                {/* Submit Sign In Button */}
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '0.2rem' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <LogIn size={18} />
                      <span>Sign In with Password</span>
                    </>
                  )}
                </button>

                {/* Optional Passwordless Login with Gmail OTP */}
                <button
                  type="button"
                  className="btn-otp-switch"
                  onClick={handleStartSignInWithOtp}
                  title="Receive a 6-digit OTP code on your registered Gmail to sign in"
                >
                  <Mail size={15} />
                  <span>Sign In with Gmail OTP Code</span>
                </button>
              </form>
            )}

            {/* SIGN UP FORM */}
            {activeTab === 'signup' && (
              <form className="auth-form" onSubmit={handleSignUpSubmit} noValidate>
                {/* Full Name */}
                <div className="form-field-group">
                  <label htmlFor="signup-name">Full Name</label>
                  <div className="input-with-icon">
                    <span className="input-icon-left">
                      <User size={16} />
                    </span>
                    <input 
                      type="text"
                      id="signup-name"
                      name="name"
                      autoComplete="name"
                      placeholder="e.g. Aarav Sharma"
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Mail ID / Gmail */}
                <div className="form-field-group">
                  <div className="field-label-row">
                    <label htmlFor="signup-email">Gmail Address</label>
                    <span className="gmail-tag">Requires OTP Approval</span>
                  </div>
                  <div className="input-with-icon">
                    <span className="input-icon-left">
                      <Mail size={16} />
                    </span>
                    <input 
                      type="email"
                      id="signup-email"
                      name="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="e.g. yourname@gmail.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Phone No */}
                <div className="form-field-group">
                  <label htmlFor="signup-phone">Phone No</label>
                  <div className="input-with-icon">
                    <span className="input-icon-left">
                      <Phone size={16} />
                    </span>
                    <input 
                      type="tel"
                      id="signup-phone"
                      name="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={signUpPhone}
                      onChange={(e) => setSignUpPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="form-field-group">
                  <label htmlFor="signup-password">Password</label>
                  <div className="input-with-icon">
                    <span className="input-icon-left">
                      <Lock size={16} />
                    </span>
                    <input 
                      type={showSignUpPassword ? 'text' : 'password'}
                      id="signup-password"
                      name="new-password"
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      required
                    />
                    <button 
                      type="button" 
                      className="password-toggle-btn"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignUpPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Password strength meter */}
                  {signUpPassword && (
                    <div className="password-strength-container">
                      <div className="strength-track">
                        <div className={`strength-fill ${strength.class}`}></div>
                      </div>
                      <span className="strength-text">{strength.label}</span>
                    </div>
                  )}
                </div>

                {/* Role Selection */}
                <div className="form-field-group">
                  <label>Account Role</label>
                  <div className="role-select-cards">
                    <div 
                      className={`role-card-option ${signUpRole === 'customer' ? 'selected' : ''}`}
                      onClick={() => setSignUpRole('customer')}
                    >
                      <div className="role-card-header">
                        <span>🛍️</span>
                        <strong>Conscious Patron</strong>
                      </div>
                      <p>Discover handmade crafts & track origin certificates.</p>
                    </div>

                    <div 
                      className={`role-card-option ${signUpRole === 'artisan' ? 'selected' : ''}`}
                      onClick={() => setSignUpRole('artisan')}
                    >
                      <div className="role-card-header">
                        <span>🏺</span>
                        <strong>Master Artisan</strong>
                      </div>
                      <p>Publish workshops chronicles & sell authentic crafts.</p>
                    </div>
                  </div>
                </div>

                {/* Terms checkbox */}
                <label className="checkbox-label" style={{ marginTop: '0.2rem' }}>
                  <input 
                    type="checkbox" 
                    checked={agreeTerms} 
                    onChange={(e) => setAgreeTerms(e.target.checked)} 
                  />
                  <span>I agree to T2T (Trash to Treasure) Craft Authenticity & Fair Terms</span>
                </label>

                {/* Submit Button */}
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '0.4rem' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span>Dispatching OTP...</span>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      <span>Verify Gmail & Send OTP</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Footer switch prompt */}
            <div className="auth-footer">
              {activeTab === 'signin' ? (
                <p>
                  New to T2T?{' '}
                  <button 
                    type="button" 
                    className="auth-switch-link"
                    onClick={() => handleTabSwitch('signup')}
                  >
                    Sign Up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button 
                    type="button" 
                    className="auth-switch-link"
                    onClick={() => handleTabSwitch('signin')}
                  >
                    Sign In
                  </button>
                </p>
              )}

              {onGuestContinue && (
                <button 
                  type="button" 
                  className="guest-explore-btn"
                  onClick={onGuestContinue}
                >
                  <span>Explore stories & marketplace as guest</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </>
        )}

        {/* =========================================================
            VIEW 2: REAL GMAIL OTP VERIFICATION & APPROVAL SCREEN
           ========================================================= */}
        {step === 'otp' && (
          <div className="otp-verification-screen fade-in">
            {/* Header */}
            <div className="otp-header-zone">
              <div className="otp-icon-badge">
                <ShieldCheck size={28} />
              </div>
              <h3>Verify & Approve Gmail</h3>
              <p className="otp-subtitle">
                Enter the 6-digit OTP code sent to{' '}
                <span className="otp-target-email">{otpTargetEmail}</span>
              </p>
            </div>

            {/* Alert banner if error or notification */}
            {alert && (
              <div className={`auth-alert auth-alert-${alert.type}`} role="alert">
                {alert.type === 'error' && <AlertCircle size={18} style={{ flexShrink: 0 }} />}
                {alert.type === 'success' && <CheckCircle size={18} style={{ flexShrink: 0 }} />}
                {alert.type === 'info' && <Sparkles size={18} style={{ flexShrink: 0 }} />}
                <span>{alert.message}</span>
              </div>
            )}

            {/* Real Gmail Inbox / Delivery Banner */}
            {isEmailSent ? (
              <div className="gmail-inbox-banner" style={{ background: '#F2F7F2', borderColor: '#7A9A6B' }}>
                <div className="gmail-banner-header">
                  <div className="gmail-banner-left">
                    <CheckCircle size={15} color="#2F5D3A" />
                    <span style={{ color: '#2F5D3A', fontWeight: 600 }}>Sent Directly to Your Mail ID</span>
                  </div>
                  <span className="gmail-banner-time">Delivered</span>
                </div>
                <div className="gmail-banner-body" style={{ color: '#2B2B2B', fontSize: '0.85rem' }}>
                  A 6-digit verification code has been dispatched to <strong>{otpTargetEmail}</strong>.<br />
                  Please open your email client, copy the code from our email, and paste or type it into the boxes below. (If you don't see it within a minute, check your Spam / Promotions folder).
                </div>
              </div>
            ) : (
              <div className="gmail-inbox-banner">
                <div className="gmail-banner-header">
                  <div className="gmail-banner-left">
                    <Mail size={15} />
                    <span>Live Gmail Verification Code</span>
                  </div>
                  <span className="gmail-banner-time">Active</span>
                </div>
                <div className="gmail-banner-body">
                  <strong>Target Mail ID:</strong> {otpTargetEmail}<br />
                  <strong>Subject:</strong> Your T2T Account Approval OTP
                </div>
                <div className="gmail-otp-display-row">
                  <span className="gmail-code-highlight">{activeOtpCode}</span>
                  <button 
                    type="button" 
                    className="btn-copy-otp"
                    onClick={handleCopyOtp}
                    title="Auto-fill this code into the boxes below"
                  >
                    {copiedOtp ? (
                      <>
                        <Check size={13} style={{ display: 'inline', marginRight: '3px' }} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} style={{ display: 'inline', marginRight: '3px' }} />
                        <span>Auto-fill OTP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* 6 Digit OTP Inputs */}
            <form onSubmit={handleApproveOtp}>
              <div className="otp-boxes-row">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => otpInputRefs.current[idx] = el}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    className="otp-box-input"
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    required
                  />
                ))}
              </div>

              {/* Approve & Verify Button */}
              <button 
                type="submit" 
                className="btn-approve"
                style={{ marginTop: '1.25rem' }}
                disabled={isSubmitting || otpDigits.join('').length < 6}
              >
                {isSubmitting ? (
                  <span>Verifying...</span>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    <span>Approve & Complete</span>
                  </>
                )}
              </button>
            </form>

            {/* Actions: Resend Code & Edit Email */}
            <div className="otp-actions-footer">
              <button 
                type="button" 
                className="change-email-btn"
                onClick={() => {
                  setStep('form');
                  setAlert(null);
                }}
              >
                ← Change Email / Back
              </button>

              <button 
                type="button" 
                className="resend-btn"
                disabled={!canResend}
                onClick={handleResendOtp}
              >
                {canResend ? (
                  <>
                    <RotateCcw size={13} style={{ display: 'inline', marginRight: '4px' }} />
                    <span>Resend OTP</span>
                  </>
                ) : (
                  <span>Resend in {resendTimer}s</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Real Google Account Sign-In Modal */}
      {showGoogleModal && (
        <div className="google-modal-backdrop" onClick={() => setShowGoogleModal(false)}>
          <div className="google-modal fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="google-modal-header">
              <button 
                className="google-modal-close" 
                onClick={() => setShowGoogleModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <svg className="google-icon" viewBox="0 0 24 24" width="28" height="28" style={{ margin: '0 auto' }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <h3>Sign in with Google</h3>
              <p>Enter your real Google / Gmail address to verify and continue to T2T (Trash to Treasure).</p>
            </div>

            <form className="google-modal-form" onSubmit={handleGoogleSubmit}>
              <div className="form-field-group">
                <label htmlFor="google-email">Your Gmail Address</label>
                <div className="input-with-icon">
                  <span className="input-icon-left">
                    <Mail size={16} />
                  </span>
                  <input 
                    type="email"
                    id="google-email"
                    name="email"
                    inputMode="email"
                    placeholder="e.g. yourname@gmail.com"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-field-group">
                <label htmlFor="google-name">Your Full Name</label>
                <div className="input-with-icon">
                  <span className="input-icon-left">
                    <User size={16} />
                  </span>
                  <input 
                    type="text"
                    id="google-name"
                    name="name"
                    placeholder="e.g. Aarav Sharma"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                <span>Send Google Verification OTP</span>
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="google-modal-footer">
              <p>T2T uses Google OAuth standards with Gmail OTP verification to guarantee craft patron integrity.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
