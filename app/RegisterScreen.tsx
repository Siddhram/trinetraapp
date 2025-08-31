import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [phone, setPhone] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1);

  const register = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      await setDoc(doc(db, 'users', uid), {
        name,
        role,
        phone,
        aadhaar,
        email,
        uid,
      });
      setStep(2);
    } catch (e: any) {
      alert('Registration failed: ' + (e?.message || e));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      {step === 1 && (
        <>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#FFA500"
          />
          <TextInput
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            keyboardType="phone-pad"
            placeholder="Phone Number"
            placeholderTextColor="#FFA500"
          />
          <TextInput
            value={aadhaar}
            onChangeText={setAadhaar}
            style={styles.input}
            keyboardType="number-pad"
            placeholder="Aadhaar Card Number"
            placeholderTextColor="#FFA500"
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor="#FFA500"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#FFA500"
            secureTextEntry
          />
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Role:</Text>
            <Picker
              selectedValue={role}
              style={styles.picker}
              onValueChange={(itemValue: string) => setRole(itemValue)}
            >
              <Picker.Item label="User" value="user" />
              <Picker.Item label="Admin" value="admin" />
              <Picker.Item label="Globaladmin" value="Globaladmin" />
            </Picker>
          </View>
          <Button title="Register" color="#FFA500" onPress={register} />
          <TouchableOpacity onPress={() => router.push('/LoginScreen')} style={styles.linkBtn}>
            <Text style={styles.linkText}>Go to Login</Text>
          </TouchableOpacity>
        </>
      )}
      {step === 2 && <Text style={styles.success}>Registration Successful!</Text>}
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
  pickerContainer: {
    width: '80%',
    marginVertical: 8,
  },
  pickerLabel: {
    color: '#FFA500',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  picker: {
    height: 50,
    width: '100%',
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
