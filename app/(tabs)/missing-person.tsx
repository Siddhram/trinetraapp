import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { auth } from '../../lib/firebase';
import FirebaseService, { MissingPersonReport } from '../../lib/firebaseService';

const { width } = Dimensions.get('window');

const CLOUDINARY_UPLOAD_PRESET = 'sachin';
const CLOUDINARY_CLOUD_NAME = 'drxliiejo';

export default function MissingPersonScreen() {
  const [user, setUser] = useState(auth.currentUser);
  const [userData, setUserData] = useState<any>(null);
  const [reports, setReports] = useState<MissingPersonReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    missingPersonName: '',
    missingPersonAge: '',
    missingPersonDescription: '',
    lastSeenLocation: '',
    lastSeenDate: '',
    relationship: ''
  });

  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchUserReports();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const data = await FirebaseService.getCurrentUserData(user?.uid || '');
      setUserData(data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchUserReports = async () => {
    try {
      setLoading(true);
      console.log('Fetching reports for user:', user?.uid);
      const userReports = await FirebaseService.getMissingPersonReportsByUser(user?.uid || '');
      console.log('Fetched reports:', userReports);
      setReports(userReports);
    } catch (error) {
      console.error('Error fetching user reports:', error);
      Alert.alert('Error', 'Failed to fetch your reports');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Permission to access media library is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      
      // Try to upload to Cloudinary, but don't fail the form if it doesn't work
      try {
        await uploadImageToCloudinary(uri);
      } catch (error) {
        console.log('Image upload failed, but continuing with local URI:', error);
        // Keep the local URI as fallback
      }
    }
  };

  const uploadImageToCloudinary = async (uri: string) => {
    setImageUploading(true);
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
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const file = await res.json();
      console.log('Cloudinary response:', file);
      
      if (file.secure_url) {
        setSelectedImage(file.secure_url);
        console.log('✅ Image uploaded successfully:', file.secure_url);
      } else {
        console.log('⚠️ Upload failed - no secure_url, keeping local URI');
        // Keep the local URI - don't show error to user
      }
    } catch (err: any) {
      console.log('⚠️ Image upload failed, keeping local URI:', err.message);
      // Keep the local URI - don't show error to user
    }
    setImageUploading(false);
  };

  const handleSubmit = async () => {
    if (!user || !userData) {
      Alert.alert('Error', 'User data not available');
      return;
    }

    // Validation
    if (!formData.missingPersonName.trim()) {
      Alert.alert('Validation Error', 'Please enter the missing person\'s name');
      return;
    }
    if (!formData.missingPersonAge.trim()) {
      Alert.alert('Validation Error', 'Please enter the missing person\'s age');
      return;
    }
    if (!formData.missingPersonDescription.trim()) {
      Alert.alert('Validation Error', 'Please enter a description of the missing person');
      return;
    }
    if (!formData.relationship.trim()) {
      Alert.alert('Validation Error', 'Please specify your relationship to the missing person');
      return;
    }

    setSubmitting(true);
    try {
      const reportData = {
        userId: user.uid,
        userName: userData.name,
        userPhone: userData.phone,
        userEmail: userData.email,
        missingPersonName: formData.missingPersonName.trim(),
        missingPersonAge: formData.missingPersonAge.trim(),
        missingPersonDescription: formData.missingPersonDescription.trim(),
        missingPersonImageUrl: selectedImage || undefined,
        lastSeenLocation: formData.lastSeenLocation.trim() || undefined,
        lastSeenDate: formData.lastSeenDate.trim() || undefined,
        relationship: formData.relationship.trim()
      };

      console.log('Submitting report:', reportData);
      const reportId = await FirebaseService.createMissingPersonReport(reportData);
      console.log('Report created with ID:', reportId);
      
      Alert.alert(
        'Report Submitted', 
        'Your missing person report has been submitted successfully. Our team will review it and update you on the status.',
        [{ text: 'OK', onPress: () => {
          setShowForm(false);
          resetForm();
          fetchUserReports();
        }}]
      );
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      missingPersonName: '',
      missingPersonAge: '',
      missingPersonDescription: '',
      lastSeenLocation: '',
      lastSeenDate: '',
      relationship: ''
    });
    setSelectedImage(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'found': return '#28a745';
      case 'not found': return '#dc3545';
      case 'finding': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'found': return 'checkmark-circle';
      case 'not found': return 'close-circle';
      case 'finding': return 'search';
      default: return 'help-circle';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const renderReport = ({ item }: { item: MissingPersonReport }) => (
    <View style={styles.reportCard}>
      <View style={styles.cardHeader}>
        <View style={styles.imageContainer}>
          {item.missingPersonImageUrl ? (
            <Image source={{ uri: item.missingPersonImageUrl }} style={styles.personImage} />
          ) : (
            <View style={styles.noImagePlaceholder}>
              <Ionicons name="person" size={32} color="#CCCCCC" />
            </View>
          )}
        </View>
        
        <View style={styles.headerInfo}>
          <View style={styles.personBasicInfo}>
            <Text style={styles.personName}>{item.missingPersonName}</Text>
            <Text style={styles.personAge}>Age: {item.missingPersonAge}</Text>
            <Text style={styles.relationship}>Relationship: {item.relationship}</Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Ionicons 
              name={getStatusIcon(item.status)} 
              size={12} 
              color="#FFFFFF" 
            />
            <Text style={styles.statusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.descriptionContainer}>
        <Text style={styles.personDescription}>{item.missingPersonDescription}</Text>
      </View>

      {(item.lastSeenLocation || item.lastSeenDate) && (
        <View style={styles.lastSeenContainer}>
          <View style={styles.lastSeenHeader}>
            <Ionicons name="location" size={14} color="#FF8C00" />
            <Text style={styles.lastSeenTitle}>Last Seen</Text>
          </View>
          {item.lastSeenLocation && (
            <Text style={styles.lastSeenLocation}>{item.lastSeenLocation}</Text>
          )}
          {item.lastSeenDate && (
            <Text style={styles.lastSeenDate}>Date: {item.lastSeenDate}</Text>
          )}
        </View>
      )}

      {(item.foundAddress || item.adminNotes) && (
        <View style={styles.adminInfo}>
          {item.foundAddress && (
            <View style={styles.foundInfo}>
              <View style={styles.foundHeader}>
                <Ionicons name="location" size={14} color="#4CAF50" />
                <Text style={styles.foundTitle}>Found Location</Text>
              </View>
              <Text style={styles.foundAddress}>{item.foundAddress}</Text>
            </View>
          )}
          
          {item.adminNotes && (
            <View style={styles.notesInfo}>
              <View style={styles.notesHeader}>
                <Ionicons name="document-text" size={14} color="#FF8C00" />
                <Text style={styles.notesTitle}>Admin Notes</Text>
              </View>
              <Text style={styles.adminNotes}>{item.adminNotes}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.reportFooter}>
        <Text style={styles.reportDate}>Reported: {formatDate(item.createdAt)}</Text>
        {item.updatedAt && (
          <Text style={styles.updateDate}>Updated: {formatDate(item.updatedAt)}</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#FF8C00" />
            <ThemedText style={styles.loadingText}>Loading your reports...</ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* <StatusBar barStyle="light-content" /> */}
        
        {/* Header */}
        <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="search" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.titleTextContainer}>
              <ThemedText style={styles.title}>Missing Family Member</ThemedText>
              <ThemedText style={styles.subtitle}>Report and track missing persons</ThemedText>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowForm(true)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Reports List */}
      {reports.length > 0 ? (
        <FlatList
          data={reports}
          renderItem={renderReport}
          keyExtractor={(item) => item.id || ''}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="search" size={64} color="#FF8C00" />
          </View>
          <ThemedText style={styles.emptyTitle}>No Missing Person Reports</ThemedText>
          <ThemedText style={styles.emptyText}>
            You haven't submitted any missing person reports yet. Tap the + button to create your first report.
          </ThemedText>
          <TouchableOpacity 
            style={styles.createFirstButton}
            onPress={() => setShowForm(true)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <ThemedText style={styles.createFirstButtonText}>Create First Report</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Report Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="person-add" size={20} color="#FF8C00" />
                </View>
                <ThemedText style={styles.modalTitle}>Report Missing Person</ThemedText>
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
              {/* Image Upload */}
              <View style={styles.imageUploadContainer}>
                <ThemedText style={styles.sectionTitle}>Photo (Optional)</ThemedText>
                <TouchableOpacity 
                  style={styles.imageUploadButton}
                  onPress={pickImage}
                  disabled={imageUploading}
                >
                  {selectedImage ? (
                    <Image source={{ uri: selectedImage }} style={styles.uploadedImage} />
                  ) : (
                    <View style={styles.imageUploadPlaceholder}>
                      {imageUploading ? (
                        <ActivityIndicator size="small" color="#FF8C00" />
                      ) : (
                        <Ionicons name="camera" size={32} color="#CCCCCC" />
                      )}
                      <ThemedText style={styles.imageUploadText}>
                        {imageUploading ? 'Uploading...' : 'Tap to add photo'}
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Form Fields */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Missing Person's Name *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.missingPersonName}
                  onChangeText={(text) => setFormData({...formData, missingPersonName: text})}
                  placeholder="Enter full name"
                  placeholderTextColor="#999999"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Age *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.missingPersonAge}
                  onChangeText={(text) => setFormData({...formData, missingPersonAge: text})}
                  placeholder="Enter age"
                  placeholderTextColor="#999999"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Your Relationship *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.relationship}
                  onChangeText={(text) => setFormData({...formData, relationship: text})}
                  placeholder="e.g., Father, Mother, Brother, Sister, etc."
                  placeholderTextColor="#999999"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Description *</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.missingPersonDescription}
                  onChangeText={(text) => setFormData({...formData, missingPersonDescription: text})}
                  placeholder="Describe the missing person (clothing, physical features, etc.)"
                  placeholderTextColor="#999999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Last Seen Location</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.lastSeenLocation}
                  onChangeText={(text) => setFormData({...formData, lastSeenLocation: text})}
                  placeholder="Where was the person last seen?"
                  placeholderTextColor="#999999"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Last Seen Date</ThemedText>
                <TextInput
                  style={styles.input}
                  value={formData.lastSeenDate}
                  onChangeText={(text) => setFormData({...formData, lastSeenDate: text})}
                  placeholder="When was the person last seen? (e.g., 2024-01-15)"
                  placeholderTextColor="#999999"
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelBtn}
                onPress={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.submitButtonContent}>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <ThemedText style={styles.submitBtnText}>Submit Report</ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FF8C00',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  titleTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFE4B5',
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFF8F0',
    position: 'relative',
  },
  imageContainer: {
    marginRight: 16,
  },
  personImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#FF8C00',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  noImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FF8C00',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  personBasicInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  personAge: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '500',
    marginBottom: 2,
  },
  relationship: {
    fontSize: 12,
    color: '#FF8C00',
    fontWeight: '600',
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  descriptionContainer: {
    padding: 20,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  personDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    fontWeight: '500',
  },
  lastSeenContainer: {
    padding: 20,
    backgroundColor: '#FFF8F0',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastSeenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  lastSeenTitle: {
    fontSize: 12,
    color: '#FF8C00',
    fontWeight: '600',
    marginLeft: 6,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lastSeenLocation: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 4,
  },
  lastSeenDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  adminInfo: {
    padding: 20,
    backgroundColor: '#F0F9FF',
  },
  foundInfo: {
    marginBottom: 16,
  },
  foundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  foundTitle: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginLeft: 6,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  foundAddress: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  notesInfo: {
    marginBottom: 0,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notesTitle: {
    fontSize: 12,
    color: '#FF8C00',
    fontWeight: '600',
    marginLeft: 6,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminNotes: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  reportFooter: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  reportDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  updateDate: {
    fontSize: 12,
    color: '#FF8C00',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 140, 0, 0.2)',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  createFirstButton: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createFirstButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '95%',
    maxHeight: '90%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 140, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    maxHeight: '70%',
    paddingHorizontal: 24,
  },
  imageUploadContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  imageUploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadedImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imageUploadPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  imageUploadText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 24,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#6B7280',
    alignItems: 'center',
    shadowColor: '#6B7280',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#FF8C00',
    alignItems: 'center',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
