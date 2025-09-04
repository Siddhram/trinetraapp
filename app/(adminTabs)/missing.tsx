import { useRouter } from 'expo-router';
import { collection, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../../lib/firebase';

export default function MissingScreen() {
  const [missingPersonReports, setMissingPersonReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [status, setStatus] = useState('finding');
  const [adminNotes, setAdminNotes] = useState('');
  const [foundAddress, setFoundAddress] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchMissingPersonReports();
  }, []);

  const fetchMissingPersonReports = async () => {
    try {
      const q = query(collection(db, 'missingPersonReports'), orderBy('createdAt', 'desc'));
      const querySnap = await getDocs(q);
      const reports: any[] = [];
      querySnap.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() });
      });
      setMissingPersonReports(reports);
    } catch (error) {
      console.error('Error fetching missing person reports:', error);
      Alert.alert('Error', 'Failed to fetch missing person reports');
    }
  };

  const openStatusModal = (report: any) => {
    setSelectedReport(report);
    setStatus(report.status);
    setAdminNotes(report.adminNotes || '');
    setFoundAddress(report.foundAddress || '');
    setModalVisible(true);
  };

  const updateReportStatus = async () => {
    if (!selectedReport) return;

    try {
      const reportRef = doc(db, 'missingPersonReports', selectedReport.id);
      await updateDoc(reportRef, {
        status,
        adminNotes: adminNotes.trim(),
        foundAddress: foundAddress.trim(),
        updatedAt: new Date()
      });

      Alert.alert('Success', 'Report status updated successfully!');
      setModalVisible(false);
      fetchMissingPersonReports();
    } catch (error) {
      console.error('Error updating report status:', error);
      Alert.alert('Error', 'Failed to update report status');
    }
  };

  const downloadImage = async (imageUrl: string, personName: string) => {
    try {
      const supported = await Linking.canOpenURL(imageUrl);
      if (supported) {
        await Linking.openURL(imageUrl);
      } else {
        Alert.alert('Error', 'Cannot open image URL');
      }
    } catch (error) {
      console.error('Error opening image:', error);
      Alert.alert('Error', 'Failed to open image');
    }
  };

  const callUser = async (phoneNumber: string, userName: string) => {
    try {
      const phoneUrl = `tel:${phoneNumber}`;
      const supported = await Linking.canOpenURL(phoneUrl);
      if (supported) {
        Alert.alert(
          'Call User',
          `Do you want to call ${userName} at ${phoneNumber}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Call', onPress: () => Linking.openURL(phoneUrl) }
          ]
        );
      } else {
        Alert.alert('Error', 'Phone calling is not supported on this device');
      }
    } catch (error) {
      console.error('Error calling user:', error);
      Alert.alert('Error', 'Failed to initiate call');
    }
  };

  const analyzeWithFaceDetection = (report: any) => {
    // Navigate to face detection analysis with the missing person's image
    router.push({
      pathname: '/faceDetectionAnalysis',
      params: {
        missingPersonImage: report.missingPersonImageUrl,
        missingPersonName: report.missingPersonName,
        reportId: report.id
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'found': return '#28a745';
      case 'not found': return '#dc3545';
      case 'finding': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const renderReport = ({ item }: { item: any }) => (
    <View style={styles.reportCard}>
      <View style={styles.cardHeader}>
        <View style={styles.imageContainer}>
          {item.missingPersonImageUrl ? (
            <Image source={{ uri: item.missingPersonImageUrl }} style={styles.personImage} />
          ) : (
            <View style={styles.noImagePlaceholder}>
              <Text style={styles.noImageText}>No Image</Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={() => downloadImage(item.missingPersonImageUrl, item.missingPersonName)}
          >
            <Text style={styles.actionBtnText}>📥 Download</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionBtn, styles.analyzeBtn]} 
            onPress={() => analyzeWithFaceDetection(item)}
          >
            <Text style={styles.actionBtnText}>🔍 Analyze</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.reportDetails}>
        <View style={styles.personInfo}>
          <Text style={styles.personName}>{item.missingPersonName}</Text>
          <Text style={styles.personAge}>Age: {item.missingPersonAge}</Text>
          <Text style={styles.personDescription}>{item.missingPersonDescription}</Text>
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>Reported by: {item.userName}</Text>
          <Text style={styles.userEmail}>{item.userEmail}</Text>
          <View style={styles.phoneContainer}>
            <Text style={styles.userPhone}>Phone: {item.userPhone}</Text>
            <TouchableOpacity 
              style={styles.callBtn} 
              onPress={() => callUser(item.userPhone, item.userName)}
            >
              <Text style={styles.callBtnText}>📞 Call</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>
              Status: {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
        
        {item.foundAddress && (
          <View style={styles.foundInfo}>
            <Text style={styles.foundAddress}>Found at: {item.foundAddress}</Text>
          </View>
        )}
        
        {item.adminNotes && (
          <View style={styles.notesInfo}>
            <Text style={styles.adminNotes}>Admin Notes: {item.adminNotes}</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.updateStatusBtn} 
          onPress={() => openStatusModal(item)}
        >
          <Text style={styles.updateStatusBtnText}>Update Status</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Missing Person Management</Text>
        <Text style={styles.subtitle}>Manage missing person reports and update their status</Text>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{missingPersonReports.length}</Text>
          <Text style={styles.statLabel}>Total Reports</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {missingPersonReports.filter(r => r.status === 'finding').length}
          </Text>
          <Text style={styles.statLabel}>Finding</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {missingPersonReports.filter(r => r.status === 'found').length}
          </Text>
          <Text style={styles.statLabel}>Found</Text>
        </View>
      </View>
      
      <View style={styles.reportsContainer}>
        {missingPersonReports.length > 0 ? (
          missingPersonReports.map((item) => (
            <View key={item.id}>
              {renderReport({ item })}
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No missing person reports found</Text>
          </View>
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Update Report Status</Text>
            
            <Text style={styles.modalSubtitle}>Missing Person: {selectedReport?.missingPersonName}</Text>
            
            <View style={styles.statusContainer}>
              <Text style={styles.label}>Status:</Text>
              <View style={styles.statusButtons}>
                <TouchableOpacity 
                  style={[styles.statusBtn, status === 'finding' && styles.statusBtnActive]} 
                  onPress={() => setStatus('finding')}
                >
                  <Text style={[styles.statusBtnText, status === 'finding' && styles.statusBtnTextActive]}>
                    Finding
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.statusBtn, status === 'not found' && styles.statusBtnActive]} 
                  onPress={() => setStatus('not found')}
                >
                  <Text style={[styles.statusBtnText, status === 'not found' && styles.statusBtnTextActive]}>
                    Not Found
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.statusBtn, status === 'found' && styles.statusBtnActive]} 
                  onPress={() => setStatus('found')}
                >
                  <Text style={[styles.statusBtnText, status === 'found' && styles.statusBtnTextActive]}>
                    Found
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TextInput
              style={styles.textArea}
              placeholder="Admin Notes (optional)"
              value={adminNotes}
              onChangeText={setAdminNotes}
              multiline
              numberOfLines={3}
            />

            {status === 'found' && (
              <TextInput
                style={styles.input}
                placeholder="Found Address *"
                value={foundAddress}
                onChangeText={setFoundAddress}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.updateBtn} 
                onPress={updateReportStatus}
              >
                <Text style={styles.updateBtnText}>Update</Text>
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
  header: {
    backgroundColor: '#FFA500',
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFA500',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  reportsContainer: {
    paddingHorizontal: 20,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  imageContainer: {
    marginRight: 16,
  },
  personImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  noImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    color: '#6c757d',
    fontSize: 12,
  },
  headerActions: {
    flex: 1,
    justifyContent: 'space-between',
  },
  actionBtn: {
    backgroundColor: '#17a2b8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  analyzeBtn: {
    backgroundColor: '#28a745',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  reportDetails: {
    padding: 16,
  },
  personInfo: {
    marginBottom: 16,
  },
  personName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 4,
  },
  personAge: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  personDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  userInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  phoneContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userPhone: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  callBtn: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  callBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  statusContainer: {
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  foundInfo: {
    marginBottom: 8,
  },
  foundAddress: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: 'bold',
  },
  notesInfo: {
    marginBottom: 12,
  },
  adminNotes: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  updateStatusBtn: {
    backgroundColor: '#FFA500',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateStatusBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFA500',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  statusContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#e9ecef',
    marginHorizontal: 2,
    alignItems: 'center',
  },
  statusBtnActive: {
    backgroundColor: '#FFA500',
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6c757d',
  },
  statusBtnTextActive: {
    color: '#fff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    textAlignVertical: 'top',
    height: 80,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#6c757d',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  updateBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#28a745',
    marginLeft: 8,
    alignItems: 'center',
  },
  updateBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
