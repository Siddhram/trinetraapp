import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../lib/firebase';

const { width, height } = Dimensions.get('window');

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [phone, setPhone] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      console.log('Current user state:', user ? user.email : 'No user');
    });

    return () => unsubscribe();
  }, []);

  const validateForm = () => {
    if (!name || !phone || !aadhaar || !email || !password) {
      alert('Please fill in all fields');
      return false;
    }
    
    if (name.trim().length < 2) {
      alert('Name must be at least 2 characters long');
      return false;
    }
    
    if (phone.trim().length < 10) {
      alert('Phone number must be at least 10 digits');
      return false;
    }
    
    if (aadhaar.trim().length !== 12) {
      alert('Aadhaar number must be exactly 12 digits');
      return false;
    }
    
    if (password.length < 6) {
      alert('Password must be at least 6 characters long');
      return false;
    }
    
    return true;
  };

  const register = async () => {
    if (!validateForm()) {
      return;
    }
    
    console.log('Form data:', { name, phone, aadhaar, email, role });
    console.log('Firebase config - Project ID:', 'todoapp-c9ac2');

    setIsLoading(true);
    try {
      console.log('Starting registration process...');
      
      // Check if email already exists in users collection
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        alert('Email is already registered. Please use a different email.');
        return;
      }
      
      console.log('Email is available, proceeding with registration...');
      
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      console.log('User created with UID:', uid);
      
      // Verify user was created in Auth
      if (!userCredential.user) {
        throw new Error('User was not created in Firebase Auth');
      }
      
      console.log('User verified in Auth:', userCredential.user.email);
      
      // Prepare user data for database
      const timestamp = new Date();
      const userData = {
        name: name.trim(),
        role: role,
        phone: phone.trim(),
        aadhaar: aadhaar.trim(),
        email: email.trim().toLowerCase(),
        uid: uid,
        createdAt: timestamp,
        updatedAt: timestamp,
        isActive: true,
        familyMembers: [],
        notifications: [],
        location: null,
        lastLocation: null,
        lastSeen: timestamp,
        relationship: role === 'admin' ? 'Admin' : role === 'medicalAdmin' ? 'Medical Admin' : 'User',
        registrationTimestamp: timestamp.toISOString()
      };
      
      console.log('Saving user data to database:', userData);
      
      // Save user data to Firestore
      await setDoc(doc(db, 'users', uid), userData);
      console.log('User data saved successfully to database');
      
      // Verify the user was saved by reading it back
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          console.log('User verification successful:', userDoc.data());
        } else {
          console.error('User was not saved to database');
          throw new Error('User data was not saved properly');
        }
      } catch (verifyError) {
        console.error('Verification error:', verifyError);
        throw new Error('Failed to verify user data was saved');
      }
      
      // Set step to success
      setStep(2);
      
    } catch (e: any) {
      console.error('Registration error:', e);
      console.error('Error code:', e.code);
      console.error('Error message:', e.message);
      console.error('Full error object:', JSON.stringify(e, null, 2));
      
      let errorMessage = 'Registration failed';
      
      if (e.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already registered. Please use a different email.';
      } else if (e.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      } else if (e.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address. Please check your email.';
      } else if (e.code === 'permission-denied') {
        errorMessage = 'Database permission denied. Please check Firebase rules.';
      } else if (e.message) {
        errorMessage = e.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 2) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successBackground}>
          <View style={styles.successContent}>
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Registration Successful!</Text>
            <Text style={styles.successSubtitle}>Welcome to Trinetra</Text>
            <Text style={styles.successDetails}>User data has been saved to database</Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push('/LoginScreen')}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Sign In Now</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={async () => {
                try {
                  await auth.signOut();
                  console.log('User signed out successfully');
                  alert('User signed out. You can now test the login flow.');
                } catch (error) {
                  console.error('Sign out error:', error);
                  alert('Sign out failed: ' + error.message);
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.signOutButtonText}>Sign Out & Test Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Background Section */}
        <View style={styles.backgroundSection} />
        
        {/* Logo/Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>T</Text>
            </View>
          </View>
          <Text style={styles.appTitle}>Trinetra</Text>
          <Text style={styles.appSubtitle}>Join the Smart Community</Text>
        </View>

        {/* Registration Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Create Account</Text>
          <Text style={styles.formSubtitle}>Join Trinetra for smart crowd management</Text>

          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>👤</Text>
          <TextInput
                style={styles.textInput}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Phone Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>📱</Text>
          <TextInput
                style={styles.textInput}
                placeholder="Enter your phone number"
                placeholderTextColor="#999"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Aadhaar Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Aadhaar Number</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🆔</Text>
          <TextInput
                style={styles.textInput}
                placeholder="Enter your Aadhaar number"
                placeholderTextColor="#999"
            value={aadhaar}
            onChangeText={setAadhaar}
            keyboardType="number-pad"
                maxLength={12}
              />
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>📧</Text>
          <TextInput
                style={styles.textInput}
                placeholder="Enter your email address"
                placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
          <TextInput
                style={styles.textInput}
                placeholder="Create a strong password"
                placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Role Selection */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Select Role</Text>
            <View style={[styles.inputWrapper, styles.pickerWrapper]}>
              <Text style={styles.inputIcon}>👑</Text>
            <Picker
              selectedValue={role}
              style={styles.picker}
              onValueChange={(itemValue: string) => setRole(itemValue)}
            >
              <Picker.Item label="User" value="user" />
              <Picker.Item label="Admin" value="admin" />
              <Picker.Item label="Medical Admin" value="medicalAdmin" />
              <Picker.Item label="Global Admin" value="Globaladmin" />
            </Picker>
          </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
            onPress={register}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          {/* Debug: Test Database Connection */}
          <TouchableOpacity
            style={styles.debugButton}
            onPress={async () => {
              try {
                console.log('Testing database connection...');
                const testDoc = await getDoc(doc(db, 'users', 'test'));
                console.log('Database connection successful');
                alert('Database connection successful!');
              } catch (error) {
                console.error('Database connection failed:', error);
                alert('Database connection failed: ' + error.message);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.debugButtonText}>Test Database Connection</Text>
          </TouchableOpacity>

          {/* Debug: Show Current User Info */}
          {currentUser && (
            <TouchableOpacity
              style={styles.debugButton}
              onPress={() => {
                const userInfo = {
                  uid: currentUser.uid,
                  email: currentUser.email,
                  emailVerified: currentUser.emailVerified,
                  creationTime: currentUser.metadata?.creationTime
                };
                console.log('Current user info:', userInfo);
                alert('Current User:\n' + JSON.stringify(userInfo, null, 2));
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.debugButtonText}>Show Current User Info</Text>
            </TouchableOpacity>
          )}

          {/* Debug: Check User in Database */}
          {currentUser && (
            <TouchableOpacity
              style={styles.debugButton}
              onPress={async () => {
                try {
                  console.log('Checking user in database...');
                  const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    console.log('User found in database:', userData);
                    alert('User found in database:\n' + JSON.stringify(userData, null, 2));
                  } else {
                    console.log('User not found in database');
                    alert('User NOT found in database!');
                  }
                } catch (error) {
                  console.error('Database check error:', error);
                  alert('Database check failed: ' + error.message);
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.debugButtonText}>Check User in Database</Text>
            </TouchableOpacity>
          )}

          {/* Debug: Manually Add User to Database */}
          {currentUser && (
            <TouchableOpacity
              style={styles.debugButton}
              onPress={async () => {
                try {
                  console.log('Manually adding user to database...');
                  const timestamp = new Date();
                  const userData = {
                    name: 'Debug User',
                    role: 'user',
                    phone: '1234567890',
                    aadhaar: '123456789012',
                    email: currentUser.email,
                    uid: currentUser.uid,
                    createdAt: timestamp,
                    updatedAt: timestamp,
                    isActive: true,
                    familyMembers: [],
                    notifications: [],
                    location: null,
                    lastLocation: null,
                    lastSeen: timestamp,
                    relationship: 'User',
                    registrationTimestamp: timestamp.toISOString(),
                    debugAdded: true
                  };
                  
                  await setDoc(doc(db, 'users', currentUser.uid), userData);
                  console.log('User manually added to database');
                  alert('User manually added to database!');
                } catch (error) {
                  console.error('Manual database add error:', error);
                  alert('Manual database add failed: ' + error.message);
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.debugButtonText}>Manually Add User to DB</Text>
            </TouchableOpacity>
          )}

          {/* Debug: Clear User from Database */}
          {currentUser && (
            <TouchableOpacity
              style={styles.debugButton}
              onPress={async () => {
                try {
                  console.log('Clearing user from database...');
                  await setDoc(doc(db, 'users', currentUser.uid), {});
                  console.log('User cleared from database');
                  alert('User cleared from database!');
                } catch (error) {
                  console.error('Clear database add error:', error);
                  alert('Clear database failed: ' + error.message);
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.debugButtonText}>Clear User from DB</Text>
          </TouchableOpacity>
          )}

          {/* Debug: Show All Users in Database */}
          <TouchableOpacity
            style={styles.debugButton}
            onPress={async () => {
              try {
                console.log('Fetching all users from database...');
                const usersRef = collection(db, 'users');
                const querySnapshot = await getDocs(usersRef);
                const users = [];
                querySnapshot.forEach((doc) => {
                  users.push({ id: doc.id, ...doc.data() });
                });
                console.log('All users in database:', users);
                alert('Users in database:\n' + JSON.stringify(users, null, 2));
              } catch (error) {
                console.error('Fetch all users error:', error);
                alert('Fetch all users failed: ' + error.message);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.debugButtonText}>Show All Users in DB</Text>
          </TouchableOpacity>

          {/* Debug: Test Write Permission */}
          <TouchableOpacity
            style={styles.debugButton}
            onPress={async () => {
              try {
                console.log('Testing write permission...');
                const testData = {
                  test: true,
                  timestamp: new Date().toISOString(),
                  message: 'Testing write permission'
                };
                await setDoc(doc(db, 'test', 'permission-test'), testData);
                console.log('Write permission test successful');
                alert('Write permission test successful!');
                
                // Clean up test data
                await setDoc(doc(db, 'test', 'permission-test'), {});
                console.log('Test data cleaned up');
              } catch (error) {
                console.error('Write permission test failed:', error);
                alert('Write permission test failed: ' + error.message);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.debugButtonText}>Test Write Permission</Text>
          </TouchableOpacity>

          {/* Debug: Show Firebase Config */}
          <TouchableOpacity
            style={styles.debugButton}
            onPress={() => {
              const config = {
                projectId: 'todoapp-c9ac2',
                authDomain: 'todoapp-c9ac2.firebaseapp.com',
                storageBucket: 'todoapp-c9ac2.firebasestorage.app',
                messagingSenderId: '378909307345',
                appId: '1:378909307345:web:0b382724153a1dc91ef0f0'
              };
              console.log('Firebase config:', config);
              alert('Firebase Config:\n' + JSON.stringify(config, null, 2));
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.debugButtonText}>Show Firebase Config</Text>
          </TouchableOpacity>

          {/* Debug: Test Network Connectivity */}
          <TouchableOpacity
            style={styles.debugButton}
            onPress={async () => {
              try {
                console.log('Testing network connectivity...');
                const response = await fetch('https://www.google.com');
                if (response.ok) {
                  console.log('Network connectivity test successful');
                  alert('Network connectivity test successful!');
                } else {
                  console.log('Network connectivity test failed');
                  alert('Network connectivity test failed!');
                }
              } catch (error) {
                console.error('Network connectivity test error:', error);
                alert('Network connectivity test failed: ' + error.message);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.debugButtonText}>Test Network Connectivity</Text>
          </TouchableOpacity>

          {/* Debug: Show Auth State */}
          <TouchableOpacity
            style={styles.debugButton}
            onPress={() => {
              const authState = {
                currentUser: auth.currentUser ? {
                  uid: auth.currentUser.uid,
                  email: auth.currentUser.email,
                  emailVerified: auth.currentUser.emailVerified,
                  isAnonymous: auth.currentUser.isAnonymous,
                  metadata: auth.currentUser.metadata
                } : null,
                authState: currentUser ? 'Authenticated' : 'Not Authenticated'
              };
              console.log('Auth state:', authState);
              alert('Auth State:\n' + JSON.stringify(authState, null, 2));
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.debugButtonText}>Show Auth State</Text>
          </TouchableOpacity>

          {/* Debug: Test Firebase Rules */}
          <TouchableOpacity
            style={styles.debugButton}
            onPress={async () => {
              try {
                console.log('Testing Firebase rules...');
                
                // Test read permission
                try {
                  await getDocs(collection(db, 'users'));
                  console.log('Read permission test successful');
                } catch (readError) {
                  console.error('Read permission test failed:', readError);
                  alert('Read permission test failed: ' + readError.message);
                  return;
                }
                
                // Test write permission
                try {
                  const testDoc = doc(db, 'test-rules', 'test-' + Date.now());
                  await setDoc(testDoc, { test: true, timestamp: new Date() });
                  console.log('Write permission test successful');
                  
                  // Clean up
                  await setDoc(testDoc, {});
                  console.log('Test document cleaned up');
                  
                  alert('Firebase rules test successful!');
                } catch (writeError) {
                  console.error('Write permission test failed:', writeError);
                  alert('Write permission test failed: ' + writeError.message);
                }
              } catch (error) {
                console.error('Firebase rules test error:', error);
                alert('Firebase rules test failed: ' + error.message);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.debugButtonText}>Test Firebase Rules</Text>
          </TouchableOpacity>

          {/* Debug: Show Common Error Codes */}
          <TouchableOpacity
            style={styles.debugButton}
            onPress={() => {
              const commonErrors = {
                'permission-denied': 'Firebase security rules are blocking access',
                'unavailable': 'Firebase service is unavailable',
                'unauthenticated': 'User is not authenticated',
                'not-found': 'Document or collection not found',
                'already-exists': 'Document already exists',
                'failed-precondition': 'Operation failed due to a precondition',
                'aborted': 'Operation was aborted',
                'out-of-range': 'Operation is out of valid range',
                'unimplemented': 'Operation is not implemented',
                'internal': 'Internal error occurred',
                'unavailable': 'Service is currently unavailable',
                'data-loss': 'Unrecoverable data loss or corruption'
              };
              console.log('Common Firebase error codes:', commonErrors);
              alert('Common Firebase Error Codes:\n' + JSON.stringify(commonErrors, null, 2));
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.debugButtonText}>Show Common Error Codes</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Login Link */}
          <TouchableOpacity 
            onPress={() => router.push('/LoginScreen')} 
            style={styles.loginLink}
            activeOpacity={0.7}
          >
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginTextBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2024 Trinetra. All rights reserved.</Text>
    </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: height,
  },
  backgroundSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.35,
    backgroundColor: '#FF8C00',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: height * 0.06,
    paddingBottom: 30,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    padding: 32,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    marginTop: -20,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#f8f9fa',
  },
  pickerWrapper: {
    paddingVertical: 8,
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  picker: {
    flex: 1,
    height: 50,
    color: '#333',
  },
  registerButton: {
    backgroundColor: '#FF8C00',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#FF8C00',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    alignSelf: 'center',
    minWidth: 200,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugButton: {
    backgroundColor: '#6c757d',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    alignSelf: 'center',
    minWidth: 200,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  loginLink: {
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: '#666',
  },
  loginTextBold: {
    color: '#FF8C00',
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  // Success Screen Styles
  successContainer: {
    flex: 1,
  },
  successBackground: {
    flex: 1,
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    alignItems: 'center',
    padding: 40,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  successIconText: {
    fontSize: 50,
    color: '#fff',
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
    textAlign: 'center',
  },
  successDetails: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 40,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loginButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signOutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: 16,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
