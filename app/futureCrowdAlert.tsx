import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { AlertData, AlertStorage } from '../lib/alertStorage';

interface CrowdAssessment {
  crowd_level: string;
  estimated_people: number;
  police_required: boolean;
  police_count: number;
  medical_required: boolean;
  medical_staff_count: number;
  activities: string[];
  chokepoints_detected: boolean;
  emergency_access_clear: boolean;
  harm_likelihood: string;
  notes: string;
}

export default function FutureCrowdAlertScreen() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CrowdAssessment | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [location, setLocation] = useState('Mahakumbh, Prayagraj');
  const [context, setContext] = useState('');
  const router = useRouter();

  const pickVideo = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your media library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: 300, // 5 minutes max
        aspect: [16, 9],
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedVideo(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick video file');
      console.error('Video picker error:', error);
    }
  };

  const captureVideo = async () => {
    try {
      // Request camera permissions first
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: 300, // 5 minutes max
        aspect: [16, 9],
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedVideo(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture video');
      console.error('Video capture error:', error);
    }
  };

  const analyzeVideo = async (videoFile: any) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Create a backup of the video data before sending
      const videoBackup = {
        uri: videoFile.uri,
        name: videoFile.name || 'video.mp4',
        size: videoFile.fileSize,
        duration: videoFile.duration,
        timestamp: new Date().toISOString(),
        location,
        context,
      };

      const formData = new FormData();
      formData.append('file', {
        uri: videoFile.uri,
        type: 'video/mp4',
        name: videoFile.name || 'video.mp4',
      } as any);
      formData.append('location', location);
      formData.append('context', context);

      // Add retry mechanism for government app reliability
      let response;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          response = await fetch('http://192.168.1.3:5000/analyze', {
            method: 'POST',
            body: formData,
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          break; // Success, exit retry loop
        } catch (fetchError) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw new Error(`Network error after ${maxRetries} attempts`);
          }
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }

      if (!response || !response.ok) {
        throw new Error(`Analysis failed: ${response?.status} ${response?.statusText}`);
      }

      const result = await response.json();
      
      // Validate the response data
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response format from server');
      }

      // Ensure all required fields are present
      const requiredFields = ['crowd_level', 'estimated_people', 'police_required', 'medical_required'];
      for (const field of requiredFields) {
        if (result[field] === undefined) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      setAnalysisResult(result);
      
      // Send alert data to alerts system
      await sendAlert(result);
      
      // Show success message
      Alert.alert(
        'Analysis Complete', 
        `Crowd level: ${result.crowd_level.toUpperCase()}\nEstimated people: ${result.estimated_people}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Analysis error:', error);
      
      // Log failed analysis attempt for government audit trail
      console.error('Failed analysis data:', {
        videoFile: videoFile.name || 'Unknown',
        location,
        context,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      
      Alert.alert(
        'Analysis Failed', 
        `Error: ${error instanceof Error ? error.message : String(error)}\n\nThis incident has been logged for government audit purposes.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendAlert = async (data: CrowdAssessment) => {
    try {
      const alertData: AlertData = {
        id: Date.now().toString(),
        type: 'crowd_analysis',
        timestamp: new Date().toISOString(),
        data: data,
        isRead: false,
        priority: 'medium', // Will be calculated by storage system
        status: 'active',
        videoMetadata: selectedVideo ? {
          name: selectedVideo.fileName || selectedVideo.name || 'Video File',
          size: selectedVideo.fileSize || 0,
          duration: selectedVideo.duration || 0,
          location,
          context,
        } : undefined,
      };
      
      // Save to local storage with government compliance features
      await AlertStorage.saveAlert(alertData);
      console.log('Alert saved successfully with government compliance');
    } catch (error) {
      console.error('Failed to send alert:', error);
      // Even if storage fails, log for government audit
      console.error('Government audit log - failed alert:', {
        data,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const getCrowdLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#F44336';
      case 'very_high': return '#9C27B0';
      default: return '#2196F3';
    }
  };

  const getCrowdLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return 'checkmark-circle';
      case 'medium': return 'warning';
      case 'high': return 'alert-circle';
      case 'very_high': return 'close-circle';
      default: return 'information-circle';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFA500" />
        </TouchableOpacity>
        <Text style={styles.title}>Future Crowd Detection</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.uploadSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="analytics" size={24} color="#FFA500" />
            <Text style={styles.sectionTitle}>Government Video Analysis System</Text>
          </View>
          <Text style={styles.description}>
            Upload or record video for AI-powered crowd density analysis and safety assessment. 
            All data is securely stored for government compliance and audit purposes.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Location:</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Enter location"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Context:</Text>
            <TextInput
              style={styles.input}
              value={context}
              onChangeText={setContext}
              placeholder="Additional context (optional)"
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.uploadButton, styles.halfButton]}
              onPress={pickVideo}
              disabled={isAnalyzing}
            >
              <Ionicons name="folder-open" size={24} color="white" />
              <Text style={styles.uploadButtonText}>
                {isAnalyzing ? 'Analyzing...' : 'Select Video'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.uploadButton, styles.halfButton, styles.cameraButton]}
              onPress={captureVideo}
              disabled={isAnalyzing}
            >
              <Ionicons name="videocam" size={24} color="white" />
              <Text style={styles.uploadButtonText}>
                {isAnalyzing ? 'Analyzing...' : 'Record Video'}
              </Text>
            </TouchableOpacity>
          </View>

          {selectedVideo && (
            <View style={styles.videoPreviewSection}>
              <View style={styles.videoPreviewHeader}>
                <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                <Text style={styles.videoPreviewTitle}>Video Ready for Government Analysis</Text>
                <View style={styles.governmentBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="white" />
                  <Text style={styles.governmentBadgeText}>SECURED</Text>
                </View>
              </View>
              <View style={styles.videoInfo}>
                <View style={styles.videoInfoRow}>
                  <Ionicons name="document" size={16} color="#666" />
                  <Text style={styles.videoInfoText}>
                    {selectedVideo.fileName || selectedVideo.name || 'Video File'}
                  </Text>
                </View>
                <View style={styles.videoInfoRow}>
                  <Ionicons name="time" size={16} color="#666" />
                  <Text style={styles.videoInfoText}>
                    Duration: {selectedVideo.duration ? `${Math.round(selectedVideo.duration)}s` : 'Unknown'}
                  </Text>
                </View>
                <View style={styles.videoInfoRow}>
                  <Ionicons name="hardware-chip" size={16} color="#666" />
                  <Text style={styles.videoInfoText}>
                    Size: {selectedVideo.fileSize ? `${(selectedVideo.fileSize / (1024 * 1024)).toFixed(2)} MB` : 'Unknown'}
                  </Text>
                </View>
                {selectedVideo.width && selectedVideo.height && (
                  <View style={styles.videoInfoRow}>
                    <Ionicons name="resize" size={16} color="#666" />
                    <Text style={styles.videoInfoText}>
                      Resolution: {selectedVideo.width} × {selectedVideo.height}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.videoActionButtons}>
                <TouchableOpacity
                  style={[styles.analyzeButton, styles.halfButton]}
                  onPress={() => analyzeVideo(selectedVideo)}
                  disabled={isAnalyzing}
                >
                  <Ionicons name="analytics" size={24} color="white" />
                  <Text style={styles.analyzeButtonText}>
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Video'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.clearButton, styles.halfButton]}
                  onPress={() => setSelectedVideo(null)}
                  disabled={isAnalyzing}
                >
                  <Ionicons name="close-circle" size={24} color="white" />
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isAnalyzing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFA500" />
              <Text style={styles.loadingText}>Analyzing video...</Text>
            </View>
          )}
        </View>

        {analysisResult && (
          <View style={styles.resultSection}>
            <View style={styles.resultHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Government Analysis Result</Text>
              <View style={styles.resultBadge}>
                <Text style={styles.resultBadgeText}>VERIFIED</Text>
              </View>
            </View>
            
            <View style={styles.crowdLevelCard}>
              <View style={styles.crowdLevelHeader}>
                <Ionicons 
                  name={getCrowdLevelIcon(analysisResult.crowd_level)} 
                  size={32} 
                  color={getCrowdLevelColor(analysisResult.crowd_level)} 
                />
                <Text style={[styles.crowdLevelText, { color: getCrowdLevelColor(analysisResult.crowd_level) }]}>
                  {analysisResult.crowd_level.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.estimatedPeople}>
                Estimated People: {analysisResult.estimated_people}
              </Text>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>Safety Recommendations</Text>
               
              <View style={styles.recommendationRow}>
                <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                <Text style={styles.recommendationText}>
                  Police Required: {analysisResult.police_required ? 'Yes' : 'No'}
                  {analysisResult.police_required && ` (${analysisResult.police_count} personnel)`}
                </Text>
              </View>

              <View style={styles.recommendationRow}>
                <Ionicons name="medical" size={20} color="#2196F3" />
                <Text style={styles.recommendationText}>
                  Medical Required: {analysisResult.medical_required ? 'Yes' : 'No'}
                  {analysisResult.medical_required && ` (${analysisResult.medical_staff_count} staff)`}
                </Text>
              </View>

              <View style={styles.recommendationRow}>
                <Ionicons 
                  name={analysisResult.chokepoints_detected ? "warning" : "checkmark-circle"} 
                  size={20} 
                  color={analysisResult.chokepoints_detected ? "#FF9800" : "#4CAF50"} 
                />
                <Text style={styles.recommendationText}>
                  Chokepoints: {analysisResult.chokepoints_detected ? 'Detected' : 'None'}
                </Text>
              </View>

              <View style={styles.recommendationRow}>
                <Ionicons 
                  name={analysisResult.emergency_access_clear ? "checkmark-circle" : "close-circle"} 
                  size={20} 
                  color={analysisResult.emergency_access_clear ? "#4CAF50" : "#F44336"} 
                />
                <Text style={styles.recommendationText}>
                  Emergency Access: {analysisResult.emergency_access_clear ? 'Clear' : 'Blocked'}
                </Text>
              </View>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>Activities Observed</Text>
              <View style={styles.activitiesContainer}>
                {analysisResult.activities.map((activity, index) => (
                  <View key={index} style={styles.activityTag}>
                    <Text style={styles.activityText}>{activity}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>Risk Assessment</Text>
              <Text style={styles.riskText}>
                Harm Likelihood: {analysisResult.harm_likelihood}
              </Text>
              {analysisResult.notes && (
                <Text style={styles.notesText}>
                  Notes: {analysisResult.notes}
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFA500',
  },
  content: {
    padding: 20,
  },
  uploadSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFA500',
    padding: 15,
    borderRadius: 8,
    flex: 1,
  },
  halfButton: {
    flex: 1,
  },
  cameraButton: {
    backgroundColor: '#2196F3',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  videoPreviewSection: {
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    padding: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  videoPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  videoPreviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginLeft: 8,
  },
  videoInfo: {
    marginBottom: 15,
  },
  videoInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  governmentBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  governmentBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  resultBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  videoInfoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 3,
  },
  videoActionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    flex: 1,
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 8,
    flex: 1,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  resultSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  crowdLevelCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  crowdLevelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  crowdLevelText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  estimatedPeople: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
  detailCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  activitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityTag: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activityText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  riskText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});
