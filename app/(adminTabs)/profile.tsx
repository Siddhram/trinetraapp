import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Button } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { db, auth } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const CLOUDINARY_UPLOAD_PRESET = 'sachin';
const CLOUDINARY_CLOUD_NAME = 'drxliiejo';

export default function AdminProfileScreen() {
  const [userData, setUserData] = useState<any>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    if (user) fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) setUserData(docSnap.data());
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Permission to access media library is required!');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images','videos'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      uploadImageToCloudinary(uri);
    }
  };

  const uploadImageToCloudinary = async (uri: string) => {
    setImageUploading(true);
    const data = new FormData();
    data.append('file', {
      uri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    } as any);
    data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: data,
      });
      const file = await res.json();
      if (file.secure_url && user) {
        await updateDoc(doc(db, 'users', user.uid), { imageUrl: file.secure_url });
        fetchUserData();
      } else {
        alert('Cloudinary upload failed: ' + (file.error?.message || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Upload error: ' + (err.message || err));
    }
    setImageUploading(false);
  };

  if (!userData) return <View style={styles.container}><Text>Loading...</Text></View>;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Profile</Text>
      {userData.imageUrl ? (
        <Image source={{ uri: userData.imageUrl }} style={styles.profileImage} />
      ) : (
        <View style={styles.profileImagePlaceholder}><Text>No Image</Text></View>
      )}
      <Button title={imageUploading ? 'Uploading...' : 'Upload Image'} color="#FFA500" onPress={pickImage} disabled={imageUploading} />
      <Text>Name: {userData.name}</Text>
      <Text>Email: {userData.email}</Text>
      <Text>Role: {userData.role}</Text>
      <Text>Phone: {userData.phone}</Text>
      <Text>Aadhaar: {userData.aadhaar}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFA500', marginBottom: 16, alignSelf: 'center' },
  profileImage: { width: 120, height: 120, borderRadius: 60, alignSelf: 'center', marginBottom: 12 },
  profileImagePlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
});
