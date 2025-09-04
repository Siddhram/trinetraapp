import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Button, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../lib/firebase';

const CLOUDINARY_UPLOAD_PRESET = 'sidddsutar';
const CLOUDINARY_CLOUD_NAME = 'drxliiejo';

export default function ProfileScreen() {
  const [userData, setUserData] = useState<any>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [missingPersonModalVisible, setMissingPersonModalVisible] = useState(false);
  const [missingPersonName, setMissingPersonName] = useState('');
  const [missingPersonAge, setMissingPersonAge] = useState('');
  const [missingPersonDescription, setMissingPersonDescription] = useState('');
  const [missingPersonImageUploading, setMissingPersonImageUploading] = useState(false);
  const [missingPersonReports, setMissingPersonReports] = useState<any[]>([]);

  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchFamilyMembers();
      fetchMissingPersonReports();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setUserData(docSnap.data());
    }
  };

  const fetchFamilyMembers = async () => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.familyMembers && Array.isArray(data.familyMembers)) {
        // Fetch each family member's data
        const members: any[] = [];
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

  const searchUsersByEmail = async () => {
    if (!searchEmail) return;
    const q = query(collection(db, 'users'), where('email', '>=', searchEmail), where('email', '<=', searchEmail + '\uf8ff'));
    const querySnap = await getDocs(q);
    const results: any[] = [];
    querySnap.forEach((doc) => results.push(doc.data()));
    setSearchResults(results);
  };

  const checkPendingFamilyRequests = async () => {
    if (!user || !userData.email) return;
    
    try {
      // Check if any users have added the current user as a family member
      const q = query(collection(db, 'users'), where('familyMembers', 'array-contains', userData.email));
      const querySnap = await getDocs(q);
      
      const pendingRequests = [];
      for (const doc of querySnap.docs) {
        const otherUserData = doc.data();
        if (otherUserData.email !== userData.email) { // Not the current user
          pendingRequests.push({
            id: doc.id,
            name: otherUserData.name,
            email: otherUserData.email,
            role: otherUserData.role
          });
        }
      }
      
      if (pendingRequests.length > 0) {
        const message = `You have ${pendingRequests.length} pending family member request(s):\n${pendingRequests.map(req => `• ${req.name} (${req.email})`).join('\n')}`;
        alert(message);
      }
    } catch (error) {
      console.error('Error checking pending family requests:', error);
    }
  };

  const addFamilyMember = async (email: string) => {
    if (!user) {
      alert('User not authenticated!');
      return;
    }
    
    try {
      if (!userData.familyMembers) userData.familyMembers = [];
      
      // Prevent adding yourself as a family member
      if (email === userData.email) {
        alert('You cannot add yourself as a family member!');
        return;
      }
      
      // Check if already a family member
      if (userData.familyMembers.includes(email)) {
        alert('This person is already your family member!');
        return;
      }

      // Find the other user's document to get their UID
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnap = await getDocs(q);
      
      if (querySnap.empty) {
        alert('User not found!');
        return;
      }

      const otherUserDoc = querySnap.docs[0];
      const otherUserId = otherUserDoc.id;
      const otherUserData = otherUserDoc.data();

      // Validate that the other user has required fields
      if (!otherUserData.name || !otherUserData.email) {
        alert('Invalid user data. Cannot add as family member.');
        return;
      }

      // Check if the other user already has the current user as family member
      const otherUserFamilyMembers = otherUserData.familyMembers || [];
      if (otherUserFamilyMembers.includes(userData.email)) {
        alert('This person has already added you as a family member!');
        return;
      }

      // Update current user's family members
      const updatedCurrentUserFamilyMembers = [...userData.familyMembers, email];
      await updateDoc(doc(db, 'users', user.uid), { 
        familyMembers: updatedCurrentUserFamilyMembers 
      });

      // Update other user's family members (add current user)
      const updatedOtherUserFamilyMembers = [...otherUserFamilyMembers, userData.email];
      await updateDoc(doc(db, 'users', otherUserId), { 
        familyMembers: updatedOtherUserFamilyMembers 
      });

      // Update local state
      setUserData({ ...userData, familyMembers: updatedCurrentUserFamilyMembers });
      
      // Refresh family members list
      await fetchFamilyMembers();
      
      alert('Family member added successfully!');
      setModalVisible(false);
      setSearchEmail('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding family member:', error);
      alert('Failed to add family member. Please try again.');
    }
  };

  const removeFamilyMember = async (email: string) => {
    if (!user) {
      alert('User not authenticated!');
      return;
    }

    // Ask for confirmation before removing
    const confirmRemove = confirm(`Are you sure you want to remove this family member? This action cannot be undone.`);
    if (!confirmRemove) {
      return;
    }

    try {
      if (!userData.familyMembers) return;
      
      // Check if the person is actually a family member
      if (!userData.familyMembers.includes(email)) {
        alert('This person is not your family member!');
        return;
      }

      // Find the other user's document to get their UID
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnap = await getDocs(q);
      
      if (querySnap.empty) {
        alert('User not found!');
        return;
      }

      const otherUserDoc = querySnap.docs[0];
      const otherUserId = otherUserDoc.id;
      const otherUserData = otherUserDoc.data();

      // Remove from current user's family members
      const updatedCurrentUserFamilyMembers = userData.familyMembers.filter((member: string) => member !== email);
      await updateDoc(doc(db, 'users', user.uid), { 
        familyMembers: updatedCurrentUserFamilyMembers 
      });

      // Remove current user from other user's family members
      const otherUserFamilyMembers = otherUserData.familyMembers || [];
      const updatedOtherUserFamilyMembers = otherUserFamilyMembers.filter((member: string) => member !== userData.email);
      await updateDoc(doc(db, 'users', otherUserId), { 
        familyMembers: updatedOtherUserFamilyMembers 
      });

      // Update local state
      setUserData({ ...userData, familyMembers: updatedCurrentUserFamilyMembers });
      
      // Refresh family members list
      await fetchFamilyMembers();
      
      alert('Family member removed successfully!');
    } catch (error) {
      console.error('Error removing family member:', error);
      alert('Failed to remove family member. Please try again.');
    }
  };

  const fetchMissingPersonReports = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'missingPersonReports'), where('userId', '==', user.uid));
      const querySnap = await getDocs(q);
      const reports: any[] = [];
      querySnap.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() });
      });
      setMissingPersonReports(reports);
    } catch (error) {
      console.error('Error fetching missing person reports:', error);
    }
  };

  const pickMissingPersonImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Permission to access media library is required!');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      uploadMissingPersonImageToCloudinary(uri);
    }
  };

  const uploadMissingPersonImageToCloudinary = async (uri: string) => {
    setMissingPersonImageUploading(true);
    const data = new FormData();
    data.append('file', {
      uri,
      type: 'image/jpeg',
      name: 'missing_person.jpg',
    } as any);
    data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: data,
      });
      const file = await res.json();
      if (file.secure_url) {
        await submitMissingPersonReport(file.secure_url);
      } else {
        Alert.alert('Upload Failed', 'Cloudinary upload failed: ' + (file.error?.message || 'Unknown error'));
      }
    } catch (err: any) {
      Alert.alert('Upload Error', 'Upload error: ' + (err.message || err));
    }
    setMissingPersonImageUploading(false);
  };

  const submitMissingPersonReport = async (imageUrl: string) => {
    if (!user || !missingPersonName.trim() || !missingPersonAge.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      const reportData = {
        userId: user.uid,
        userName: userData.name,
        userEmail: userData.email,
        userPhone: userData.phone,
        missingPersonName: missingPersonName.trim(),
        missingPersonAge: missingPersonAge.trim(),
        missingPersonDescription: missingPersonDescription.trim(),
        missingPersonImageUrl: imageUrl,
        status: 'finding',
        adminNotes: '',
        foundAddress: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'missingPersonReports'), reportData);
      
      Alert.alert('Success', 'Missing person report submitted successfully!');
      setMissingPersonModalVisible(false);
      setMissingPersonName('');
      setMissingPersonAge('');
      setMissingPersonDescription('');
      fetchMissingPersonReports();
    } catch (error) {
      console.error('Error submitting missing person report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  if (!userData) return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>🕉️ Mahakumbh Profile</Text>
      </View>
      
      <View style={styles.profileSection}>
        <View style={styles.profileCard}>
          {userData.imageUrl ? (
            <Image source={{ uri: userData.imageUrl }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
          <TouchableOpacity 
            style={[styles.uploadBtn, imageUploading && styles.uploadBtnDisabled]} 
            onPress={pickImage} 
            disabled={imageUploading}
          >
            <Text style={styles.uploadBtnText}>
              {imageUploading ? 'Uploading...' : 'Upload Profile Image'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.userInfoCard}>
          <Text style={styles.userInfoTitle}>User Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{userData.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{userData.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role:</Text>
            <Text style={styles.infoValue}>{userData.role}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{userData.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Aadhaar:</Text>
            <Text style={styles.infoValue}>{userData.aadhaar}</Text>
          </View>
        </View>
      </View>
      <View style={styles.familySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Family Members</Text>
          <TouchableOpacity style={styles.checkRequestsBtn} onPress={checkPendingFamilyRequests}>
            <Text style={styles.checkRequestsBtnText}>Check Requests</Text>
          </TouchableOpacity>
        </View>
        
        {familyMembers.length > 0 ? (
          <View style={styles.familyList}>
            {familyMembers.map((item) => (
              <View key={item.email} style={styles.familyMemberCard}>
                <View style={styles.familyMemberInfo}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.familyProfileImage} />
                  ) : (
                    <View style={styles.familyProfileImagePlaceholder}>
                      <Text style={styles.placeholderText}>No Image</Text>
                    </View>
                  )}
                  <View style={styles.familyMemberDetails}>
                    <Text style={styles.familyMemberName}>{item.name}</Text>
                    <Text style={styles.familyMemberEmail}>{item.email}</Text>
                    <Text style={styles.familyMemberRole}>Role: {item.role}</Text>
                    <Text style={styles.familyMemberPhone}>Phone: {item.phone}</Text>
                    <Text style={styles.familyMemberAadhaar}>Aadhaar: {item.aadhaar}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.removeBtn} 
                  onPress={() => removeFamilyMember(item.email)}
                >
                  <Text style={styles.removeBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No family members added yet</Text>
          </View>
        )}
        
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ Add Family Member</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.missingPersonSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Missing Person Reports</Text>
          <TouchableOpacity style={styles.missingPersonBtn} onPress={() => setMissingPersonModalVisible(true)}>
            <Text style={styles.missingPersonBtnText}>+ Report Missing</Text>
          </TouchableOpacity>
        </View>
        
        {missingPersonReports.length > 0 ? (
          <View style={styles.missingPersonList}>
            {missingPersonReports.map((item) => (
              <View key={item.id} style={styles.missingPersonCard}>
                <View style={styles.missingPersonInfo}>
                  {item.missingPersonImageUrl ? (
                    <Image source={{ uri: item.missingPersonImageUrl }} style={styles.missingPersonImage} />
                  ) : (
                    <View style={styles.missingPersonImagePlaceholder}>
                      <Text style={styles.placeholderText}>No Image</Text>
                    </View>
                  )}
                  <View style={styles.missingPersonDetails}>
                    <Text style={styles.missingPersonName}>{item.missingPersonName}</Text>
                    <Text style={styles.missingPersonAge}>Age: {item.missingPersonAge}</Text>
                    <Text style={styles.missingPersonDescription}>{item.missingPersonDescription}</Text>
                    <View style={[styles.statusBadge, { 
                      backgroundColor: item.status === 'found' ? '#28a745' : 
                                     item.status === 'not found' ? '#dc3545' : '#ffc107' 
                    }]}>
                      <Text style={styles.statusText}>
                        Status: {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Text>
                    </View>
                    {item.foundAddress && (
                      <Text style={styles.foundAddressText}>Found at: {item.foundAddress}</Text>
                    )}
                    {item.adminNotes && (
                      <Text style={styles.adminNotesText}>Admin Notes: {item.adminNotes}</Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No missing person reports submitted yet</Text>
          </View>
        )}
      </View>
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
              <TouchableOpacity style={styles.familyMemberCard} onPress={() => addFamilyMember(item.email)}>
                <Text>{item.name} ({item.email})</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text>No users found.</Text>}
          />
          <Button title="Close" color="#FFA500" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
      
      <Modal visible={missingPersonModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Missing Person</Text>
              <TouchableOpacity 
                style={styles.closeBtn}
                onPress={() => {
                  setMissingPersonModalVisible(false);
                  setMissingPersonName('');
                  setMissingPersonAge('');
                  setMissingPersonDescription('');
                }}
              >
                <Text style={styles.closeBtnText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Missing Person Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  value={missingPersonName}
                  onChangeText={setMissingPersonName}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Age *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter age"
                  value={missingPersonAge}
                  onChangeText={setMissingPersonAge}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Last seen location, clothing, physical features, etc."
                  value={missingPersonDescription}
                  onChangeText={setMissingPersonDescription}
                  multiline
                  numberOfLines={4}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Person's Photo *</Text>
                <TouchableOpacity 
                  style={[styles.uploadImageBtn, missingPersonImageUploading && styles.uploadImageBtnDisabled]} 
                  onPress={pickMissingPersonImage} 
                  disabled={missingPersonImageUploading}
                >
                  <Text style={styles.uploadImageBtnText}>
                    {missingPersonImageUploading ? 'Uploading...' : '📷 Upload Photo'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.uploadHint}>Please upload a clear photo of the missing person</Text>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelModalBtn}
                onPress={() => {
                  setMissingPersonModalVisible(false);
                  setMissingPersonName('');
                  setMissingPersonAge('');
                  setMissingPersonDescription('');
                }}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    backgroundColor: '#FF8C00',
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  profileSection: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  placeholderText: {
    color: '#6c757d',
    fontSize: 12,
  },
  uploadBtn: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadBtnDisabled: {
    backgroundColor: '#ccc',
  },
  uploadBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  userInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  familySection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  missingPersonSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  checkRequestsBtn: {
    backgroundColor: '#17a2b8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  checkRequestsBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  familyList: {
    marginBottom: 15,
  },
  familyMemberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  familyMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  familyProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e9ecef',
  },
  familyProfileImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyMemberDetails: {
    flex: 1,
    marginLeft: 12,
  },
  familyMemberName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  familyMemberEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  familyMemberRole: {
    fontSize: 12,
    color: '#888',
  },
  familyMemberPhone: {
    fontSize: 12,
    color: '#888',
  },
  familyMemberAadhaar: {
    fontSize: 12,
    color: '#888',
  },
  removeBtn: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-end',
  },
  removeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  addBtn: {
    backgroundColor: '#FF8C00',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  missingPersonBtn: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  missingPersonBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  missingPersonList: {
    marginBottom: 15,
  },
  missingPersonCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  missingPersonInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  missingPersonImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e9ecef',
  },
  missingPersonImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingPersonDetails: {
    flex: 1,
    marginLeft: 12,
  },
  missingPersonName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#dc3545',
    marginBottom: 4,
  },
  missingPersonAge: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  missingPersonDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  foundAddressText: {
    fontSize: 13,
    color: '#28a745',
    fontWeight: '600',
    marginTop: 4,
  },
  adminNotesText: {
    fontSize: 13,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyState: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 20,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  uploadImageBtn: {
    backgroundColor: '#FF8C00',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadImageBtnDisabled: {
    backgroundColor: '#ccc',
  },
  uploadImageBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  uploadHint: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  cancelModalBtn: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalButtonContainer: {
    marginTop: 20,
  },
});
