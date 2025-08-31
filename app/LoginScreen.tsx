import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Fetch user role from Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      if (userData.role === 'admin') {
        router.push('/(adminTabs)');
      } else {
        router.push('/(tabs)');
      }
    } catch (error) {
      setErrorMsg((error as any).message || 'Login failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#FFA500"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#FFA500"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" color="#FFA500" onPress={handleLogin} />
      {errorMsg ? <Text style={{ color: 'red', marginTop: 8 }}>{errorMsg}</Text> : null}
      <TouchableOpacity onPress={() => router.push('/RegisterScreen')} style={styles.linkBtn}>
        <Text style={styles.linkText}>Go to Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFA500',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#FFA500',
    padding: 8,
    marginVertical: 8,
    width: '80%',
    borderRadius: 8,
    color: '#FFA500',
    backgroundColor: '#fff',
  },
  linkBtn: {
    marginTop: 16,
  },
  linkText: {
    color: '#FFA500',
    fontWeight: 'bold',
    fontSize: 16,
  },
  success: {
    color: '#FFA500',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
