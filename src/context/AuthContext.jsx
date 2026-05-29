import { createContext, useContext, useEffect, useState } from "react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  sendPasswordResetEmail, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign Up with Email, Password, and Store Name
  async function signUp(email, password, displayName) {
    const { updateProfile } = await import("firebase/auth");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    return userCredential;
  }

  // Sign In with Email and Password
  function signIn(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Sign In with Google Popup
  function signInWithGoogle() {
    return signInWithPopup(auth, googleProvider);
  }

  // Send Password Reset Email
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  // Sign Out
  function signOutUser() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signUp,
    signIn,
    signInWithGoogle,
    resetPassword,
    signOutUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
