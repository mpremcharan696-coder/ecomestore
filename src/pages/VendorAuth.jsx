import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { useAuth } from "../context/AuthContext";
import { 
  Store, 
  Mail, 
  Lock, 
  User, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  X 
} from "lucide-react";

export default function VendorAuth() {
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const cardRef = useRef(null);
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();

  // Navigation and view toggles
  const [activeTab, setActiveTab] = useState("signin"); // "signin" or "signup"
  const [view, setView] = useState("auth"); // "auth" or "forgot"
  const [isSuccess, setIsSuccess] = useState(false); // for password reset confirmation
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  // Input Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Custom red Toast Tray
  const [toasts, setToasts] = useState([]);

  // Helper to add error notification
  const addToast = (message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Convert Firebase error codes to friendly messages
  const getFriendlyErrorMessage = (code) => {
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Invalid email or password connection.";
      case "auth/email-already-in-use":
        return "This email is already registered!";
      case "auth/weak-password":
        return "Password must be at least 6 characters!";
      case "auth/invalid-email":
        return "Invalid email address format!";
      case "auth/missing-password":
        return "Please input a valid password.";
      case "auth/popup-closed-by-user":
        return "Google authorization window closed.";
      default:
        return "Authorization failed. Check connection.";
    }
  };

  // Trigger staggered inputs animations on tab toggle
  useEffect(() => {
    if (view === "auth") {
      gsap.fromTo(
        ".stagger-input",
        { opacity: 0, y: 15 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.4, 
          stagger: 0.05, 
          ease: "power2.out", 
          overwrite: "auto" 
        }
      );
    }
  }, [activeTab, view]);

  // Entrance animations for Card
  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, scale: 0.95, y: 30 },
      { opacity: 1, scale: 1, y: 0, duration: 1.0, ease: "power3.out" }
    );
  }, []);

  // Sign In Action
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast("Please fill in all credentials.");
      return;
    }
    try {
      setLoading(true);
      await signIn(email, password);
      navigate("/vendor-dashboard");
    } catch (error) {
      addToast(getFriendlyErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  // Sign Up Action
  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!fullName || !storeName || !email || !password || !confirmPassword) {
      addToast("Please fill in all fields.");
      return;
    }
    if (storeName.trim().length < 2) {
      addToast("Store name must be at least 2 characters!");
      return;
    }
    if (password !== confirmPassword) {
      addToast("Passwords do not match!");
      return;
    }
    try {
      setLoading(true);

      // 1. Register the store name securely in Neon PostgreSQL first via Express backend
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ storeName: storeName.trim() })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw { code: "custom/db-error", message: errData.error || "Failed to register store." };
      }

      // 2. If PostgreSQL insert succeeds, sign up the vendor in Firebase
      await signUp(email, password, storeName.trim());
      navigate("/vendor-dashboard");
    } catch (error) {
      if (error.code === "custom/db-error") {
        addToast(error.message);
      } else {
        addToast(getFriendlyErrorMessage(error.code));
      }
    } finally {
      setLoading(false);
    }
  };

  // Google Provider Action
  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      navigate("/vendor-dashboard");
    } catch (error) {
      addToast(getFriendlyErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  // Reset Password Action
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      addToast("Please enter your email.");
      return;
    }
    try {
      setLoading(true);
      await resetPassword(resetEmail);
      setIsSuccess(true);
      // Animate checkmark transition
      setTimeout(() => {
        gsap.fromTo(
          ".checkmark-anim",
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)" }
        );
      }, 50);
    } catch (error) {
      addToast(getFriendlyErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    // Horizontal slide transitions
    gsap.to(".auth-card-content", {
      opacity: 0,
      x: 20,
      duration: 0.3,
      onComplete: () => {
        setView("auth");
        setIsSuccess(false);
        setResetEmail("");
        gsap.fromTo(
          ".auth-card-content",
          { opacity: 0, x: -20 },
          { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }
        );
      }
    });
  };

  const handleGoToForgot = () => {
    gsap.to(".auth-card-content", {
      opacity: 0,
      x: -20,
      duration: 0.3,
      onComplete: () => {
        setView("forgot");
        gsap.fromTo(
          ".auth-card-content",
          { opacity: 0, x: 20 },
          { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }
        );
      }
    });
  };

  return (
    <div ref={pageRef} className="w-full min-h-screen flex flex-col items-center justify-center px-6 relative py-16 text-slate-800">
      
      {/* Dynamic Floating Red Toast Alert Notifications */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 bg-red-50/95 border border-red-200 text-red-800 px-4 py-3 rounded-2xl shadow-xl hover:border-red-300 transition-all duration-300 animate-slide-in"
            style={{
              animation: "slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards"
            }}
          >
            <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {toast.message}
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-red-400 hover:text-red-700 transition-colors p-0.5 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Primary Auth Card Container */}
      <div 
        ref={cardRef} 
        className="w-full max-w-md bg-white/70 border border-slate-200/80 backdrop-blur-md p-8 md:p-10 rounded-3xl transition-all duration-500 shadow-xl border-glow-cyan z-10"
      >
        <div className="auth-card-content w-full flex flex-col">
          
          {/* Sign In / Sign Up Layout */}
          {view === "auth" ? (
            <>
              {/* Card Header */}
              <div className="flex flex-col items-center text-center mb-8 stagger-input">
                <div className="w-16 h-16 bg-cyan-50 border border-cyan-100 rounded-2xl flex items-center justify-center mb-4 text-cyan-600 shadow-sm">
                  <Store size={30} strokeWidth={1.5} />
                </div>
                <h1 className="font-display font-black text-2xl tracking-tight text-slate-900 uppercase">
                  Vendor Portal
                </h1>
                <p className="text-slate-500 text-xs font-medium mt-1">
                  Access your commerce dashboard nodes
                </p>
              </div>

              {/* Tab Switcher */}
              <div className="flex border-b border-slate-100 mb-8 p-1 bg-slate-50 rounded-xl stagger-input">
                <button
                  onClick={() => setActiveTab("signin")}
                  className={`flex-1 py-3 text-xs tracking-wider font-display font-bold uppercase rounded-lg transition-all duration-300 ${
                    activeTab === "signin" 
                      ? "bg-white text-cyan-600 shadow-sm border border-slate-200/30" 
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setActiveTab("signup")}
                  className={`flex-1 py-3 text-xs tracking-wider font-display font-bold uppercase rounded-lg transition-all duration-300 ${
                    activeTab === "signup" 
                      ? "bg-white text-cyan-600 shadow-sm border border-slate-200/30" 
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Sign In Form View */}
              {activeTab === "signin" ? (
                <form onSubmit={handleSignIn} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5 stagger-input">
                    <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@vendor.com" 
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 stagger-input">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase">
                        Password
                      </label>
                      <button 
                        type="button"
                        onClick={handleGoToForgot}
                        className="text-[10px] font-display font-extrabold tracking-widest text-cyan-600 uppercase hover:text-cyan-800 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full pl-11 pr-11 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-display font-bold text-xs tracking-wider uppercase rounded-xl transition-all duration-300 hover:shadow-neonCyan hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mt-2 stagger-input"
                  >
                    {loading ? (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : "Sign In Portal"}
                  </button>
                </form>
              ) : (
                /* Sign Up Form View */
                <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5 stagger-input">
                    <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe" 
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 stagger-input">
                    <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-1">
                      Store Name
                    </label>
                    <div className="relative">
                      <Store size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="My Digital Store" 
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 stagger-input">
                    <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@vendor.com" 
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 stagger-input">
                    <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full pl-11 pr-11 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 stagger-input">
                    <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full pl-11 pr-11 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-display font-bold text-xs tracking-wider uppercase rounded-xl transition-all duration-300 hover:shadow-neonCyan hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mt-2 stagger-input"
                  >
                    {loading ? (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : "Create Account"}
                  </button>
                </form>
              )}

              {/* Social Login Divider */}
              <div className="flex items-center my-6 stagger-input">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="text-[10px] font-display font-bold uppercase tracking-widest text-slate-400 px-3 select-none">
                  or continue with
                </span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              {/* Google OAuth Button */}
              <button
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-display font-bold text-xs tracking-wider uppercase rounded-xl transition-all duration-300 flex items-center justify-center gap-2.5 active:scale-[0.98] stagger-input hover:border-cyan-300"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                {activeTab === "signin" ? "Sign In with Google" : "Sign Up with Google"}
              </button>
            </>
          ) : (
            /* Forgot Password View */
            <div className="flex flex-col">
              
              {/* Back Navigation */}
              <button 
                onClick={handleBackToSignIn}
                className="w-fit flex items-center gap-1.5 text-slate-400 hover:text-cyan-600 font-display text-[10px] font-bold tracking-widest uppercase transition-colors mb-6 select-none"
              >
                <ArrowLeft size={12} /> Return Back
              </button>

              {!isSuccess ? (
                <>
                  <h2 className="font-display font-black text-2xl mb-2 text-slate-900 uppercase tracking-tight">
                    Reset Password
                  </h2>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">
                    Configure your registered email address to dispatch an access reset coordinate link.
                  </p>

                  <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-1">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="email" 
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="name@vendor.com" 
                          className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-display font-bold text-xs tracking-wider uppercase rounded-xl transition-all duration-300 hover:shadow-neonCyan hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
                    >
                      {loading ? (
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : "Send Reset Coordinates"}
                    </button>
                  </form>
                </>
              ) : (
                /* Password Reset Success Screen */
                <div className="checkmark-anim flex flex-col items-center text-center py-6 select-none">
                  <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mb-6 text-green-500 shadow-sm">
                    <CheckCircle2 size={32} strokeWidth={1.5} />
                  </div>
                  <h2 className="font-display font-black text-2xl mb-2 text-slate-900 uppercase tracking-tight">
                    Reset Sent!
                  </h2>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed max-w-xs mb-8">
                    We've dispatched a secure access recovery coordinate transmission to <span className="text-slate-800 font-bold">{resetEmail}</span>.
                  </p>
                  <button 
                    onClick={handleBackToSignIn}
                    className="w-full py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-display font-bold text-xs tracking-wider uppercase rounded-xl transition-all duration-300"
                  >
                    Return to Sign In
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Styled slideIn animation for notifications */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

    </div>
  );
}
