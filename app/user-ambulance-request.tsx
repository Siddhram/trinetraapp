import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import FirebaseService from '../lib/firebaseService';

interface FormData {
  patientName: string;
  patientPhone: string;
  emergencyType: string;
  description: string;
  patientAddress: string;
}

const emergencyTypes = [
  'Heart Attack',
  'Stroke',
  'Trauma/Accident',
  'Respiratory Distress',
  'Severe Bleeding',
  'Unconsciousness',
  'Other'
];

export default function UserAmbulanceRequestScreen() {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [formData, setFormData] = useState<FormData>({
    patientName: '',
    patientPhone: '',
    emergencyType: '',
    description: '',
    patientAddress: ''
  });

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to send ambulance requests.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. Please enter your address manually.');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.patientName.trim()) {
      newErrors.patientName = 'Patient name is required';
    }

    if (!formData.patientPhone.trim()) {
      newErrors.patientPhone = 'Phone number is required';
    } else if (!/^[0-9+\-\s()]{10,}$/.test(formData.patientPhone.replace(/\s/g, ''))) {
      newErrors.patientPhone = 'Please enter a valid phone number';
    }

    if (!formData.emergencyType) {
      newErrors.emergencyType = 'Please select an emergency type';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Please describe the emergency situation';
    }

    if (!formData.patientAddress.trim() && !location) {
      newErrors.patientAddress = 'Please provide your address or allow location access';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!location) {
      Alert.alert('Location Required', 'Please allow location access or provide your address manually.');
      return;
    }

    setLoading(true);

    try {
      const ambulanceRequest = {
        patientName: formData.patientName.trim(),
        patientPhone: formData.patientPhone.trim(),
        emergencyType: formData.emergencyType,
        description: formData.description.trim(),
        patientAddress: formData.patientAddress.trim() || 'Location-based address',
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        status: 'pending' as const,
        createdAt: new Date(),
        userId: 'user_' + Date.now(), // In a real app, this would be the actual user ID
        hospitalName: '',
        estimatedTime: null,
        distance: null
      };

      await FirebaseService.createAmbulanceRequest(ambulanceRequest);

      Alert.alert(
        'Request Sent Successfully!',
        'Your ambulance request has been sent to medical administrators. They will review and respond shortly.',
        [
          {
            text: 'View My Requests',
            onPress: () => router.push('/(tabs)/my-requests')
          },
          {
            text: 'OK',
            style: 'default'
          }
        ]
      );

      // Reset form
      setFormData({
        patientName: '',
        patientPhone: '',
        emergencyType: '',
        description: '',
        patientAddress: ''
      });

    } catch (error) {
      console.error('Error submitting ambulance request:', error);
      Alert.alert(
        'Submission Failed',
        'There was an error sending your request. Please try again or contact emergency services directly.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyTypeSelect = (type: string) => {
    setFormData(prev => ({ ...prev, emergencyType: type }));
    setErrors(prev => ({ ...prev, emergencyType: undefined }));
  };

  const updateFormField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Ambulance</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Emergency Banner */}
      <View style={styles.emergencyBanner}>
        <Ionicons name="warning" size={24} color="white" />
        <Text style={styles.emergencyText}>
          This is for emergency situations only. For immediate life-threatening emergencies, call emergency services directly.
        </Text>
      </View>

      {/* Form */}
      <View style={styles.formContainer}>
        {/* Patient Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={[styles.input, errors.patientName && styles.inputError]}
              placeholder="Enter patient's full name"
              value={formData.patientName}
              onChangeText={(value) => updateFormField('patientName', value)}
            />
            {errors.patientName && <Text style={styles.errorText}>{errors.patientName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={[styles.input, errors.patientPhone && styles.inputError]}
              placeholder="Enter phone number"
              value={formData.patientPhone}
              onChangeText={(value) => updateFormField('patientPhone', value)}
              keyboardType="phone-pad"
            />
            {errors.patientPhone && <Text style={styles.errorText}>{errors.patientPhone}</Text>}
          </View>
        </View>

        {/* Emergency Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Type *</Text>
          <View style={styles.emergencyTypeGrid}>
            {emergencyTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.emergencyTypeButton,
                  formData.emergencyType === type && styles.emergencyTypeButtonActive
                ]}
                onPress={() => handleEmergencyTypeSelect(type)}
              >
                <Text style={[
                  styles.emergencyTypeText,
                  formData.emergencyType === type && styles.emergencyTypeTextActive
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.emergencyType && <Text style={styles.errorText}>{errors.emergencyType}</Text>}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Description *</Text>
          <TextInput
            style={[styles.textArea, errors.description && styles.inputError]}
            placeholder="Describe the emergency situation, symptoms, and any relevant details..."
            value={formData.description}
            onChangeText={(value) => updateFormField('description', value)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          {location ? (
            <View style={styles.locationInfo}>
              <Ionicons name="checkmark-circle" size={20} color="#28a745" />
              <Text style={styles.locationText}>
                Location detected: {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
              </Text>
            </View>
          ) : (
            <View style={styles.locationInfo}>
              <Ionicons name="warning" size={20} color="#ffc107" />
              <Text style={styles.locationText}>Location not available</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your address if location is not detected"
              value={formData.patientAddress}
              onChangeText={(value) => updateFormField('patientAddress', value)}
            />
          </View>

          <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
            <Ionicons name="location" size={20} color="#007AFF" />
            <Text style={styles.locationButtonText}>Update Location</Text>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="medical" size={20} color="white" />
              <Text style={styles.submitButtonText}>Send Ambulance Request</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
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
    backgroundColor: '#FF6B6B',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  emergencyBanner: {
    backgroundColor: '#dc3545',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  emergencyText: {
    color: 'white',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  formContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 4,
  },
  emergencyTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emergencyTypeButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  emergencyTypeButtonActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  emergencyTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  emergencyTypeTextActive: {
    color: 'white',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  submitButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
