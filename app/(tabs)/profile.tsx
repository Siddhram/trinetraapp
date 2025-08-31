import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Button, TouchableOpacity, TextInput, Modal, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { db, auth } from '../../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'expo-router';

const CLOUDINARY_UPLOAD_PRESET = 'sidddsutar';
const CLOUDINARY_CLOUD_NAME = 'drxliiejo';

export default function ProfileScreen() {
  const [userData, setUserData] = useState<any>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchFamilyMembers();
    }
  }, [user]);

  const fetchUserData = async () => {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setUserData(docSnap.data());
    }
  };

  const fetchFamilyMembers = async () => {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.familyMembers && Array.isArray(data.familyMembers)) {
        // Fetch each family member's data
        const members = [];
        for (const email of data.familyMembers) {
          const q = query(collection(db, 'users'), where('email', '==', email));
          const querySnap = await getDocs(q);
          querySnap.forEach((doc) => members.push(doc.data()));
        }
        setFamilyMembers(members);
      } else {
        setFamilyMembers([]);
      }
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Permission to access media library is required!');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
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
      if (file.secure_url) {
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

  const searchUsersByEmail = async () => {
    if (!searchEmail) return;
    const q = query(collection(db, 'users'), where('email', '>=', searchEmail), where('email', '<=', searchEmail + '\uf8ff'));
    const querySnap = await getDocs(q);
    const results: any[] = [];
    querySnap.forEach((doc) => results.push(doc.data()));
    setSearchResults(results);
  };

  const addFamilyMember = async (email: string) => {
    if (!userData.familyMembers) userData.familyMembers = [];
    if (!userData.familyMembers.includes(email)) {
      const updated = [...userData.familyMembers, email];
      await updateDoc(doc(db, 'users', user.uid), { familyMembers: updated });
      setUserData({ ...userData, familyMembers: updated });
      fetchFamilyMembers();
    }
    setModalVisible(false);
    setSearchEmail('');
    setSearchResults([]);
  };

  if (!userData) return <View style={styles.container}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
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
      <Text style={styles.familyTitle}>Family Members</Text>
      <FlatList
        data={familyMembers}
        keyExtractor={(item) => item.email}
        renderItem={({ item }) => (
          <View style={styles.familyMemberBox}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.familyProfileImage} />
            ) : (
              <View style={styles.familyProfileImagePlaceholder}><Text>No Image</Text></View>
            )}
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.familyMemberName}>{item.name}</Text>
              <Text style={styles.familyMemberEmail}>{item.email}</Text>
              <Text style={styles.familyMemberRole}>Role: {item.role}</Text>
              <Text style={styles.familyMemberPhone}>Phone: {item.phone}</Text>
              <Text style={styles.familyMemberAadhaar}>Aadhaar: {item.aadhaar}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text>No family members added.</Text>}
      />
      <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.addBtnText}>+ Add Family Member</Text>
      </TouchableOpacity>
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Add Family Member</Text>
          <TextInput
            style={styles.input}
            placeholder="Search by email"
            value={searchEmail}
            onChangeText={setSearchEmail}
          />
          <Button title="Search" color="#FFA500" onPress={searchUsersByEmail} />
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.email}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.familyMemberBox} onPress={() => addFamilyMember(item.email)}>
                <Text>{item.name} ({item.email})</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text>No users found.</Text>}
          />
          <Button title="Close" color="#FFA500" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFA500',
    marginBottom: 16,
    alignSelf: 'center',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 12,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  familyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFA500',
    marginTop: 24,
    marginBottom: 8,
  },
  familyMemberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7E0',
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
  },
  familyProfileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eee',
  },
  familyProfileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyMemberName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#FFA500',
  },
  familyMemberEmail: {
    fontSize: 14,
    color: '#333',
  },
  familyMemberRole: {
    fontSize: 13,
    color: '#666',
  },
  familyMemberPhone: {
    fontSize: 13,
    color: '#666',
  },
  familyMemberAadhaar: {
    fontSize: 13,
    color: '#666',
  },
  addBtn: {
    backgroundColor: '#FFA500',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFA500',
    marginBottom: 12,
    alignSelf: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#FFA500',
    padding: 8,
    marginVertical: 8,
    borderRadius: 8,
    color: '#FFA500',
    backgroundColor: '#fff',
  },
});
