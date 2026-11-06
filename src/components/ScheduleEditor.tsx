/**
 * Schedule Editor Component
 * Component for creating and editing homework schedules
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import { HomeworkSchedule } from '@/types';

interface ScheduleEditorProps {
  visible: boolean;
  schedule?: HomeworkSchedule;
  childId: string;
  onSave: (schedule: Omit<HomeworkSchedule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

interface TimePickerProps {
  label: string;
  value: string;
  onChange: (time: string) => void;
}

/**
 * Simple Time Picker Component
 */
const TimePicker: React.FC<TimePickerProps> = ({ label, value, onChange }) => {
  const [showHours, setShowHours] = useState(false);
  const [showMinutes, setShowMinutes] = useState(false);

  const [hours, minutes] = useMemo(() => {
    const parts = value.split(':');
    return [parseInt(parts[0], 10), parseInt(parts[1], 10)];
  }, [value]);

  const handleHourChange = (hour: number) => {
    const newMinutes = String(minutes).padStart(2, '0');
    const newHour = String(hour).padStart(2, '0');
    onChange(`${newHour}:${newMinutes}`);
    setShowHours(false);
  };

  const handleMinuteChange = (minute: number) => {
    const newHour = String(hours).padStart(2, '0');
    const newMinute = String(minute).padStart(2, '0');
    onChange(`${newHour}:${newMinute}`);
    setShowMinutes(false);
  };

  return (
    <View style={styles.timePickerContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.timeDisplay}
        onPress={() => setShowHours(true)}
      >
        <Text style={styles.timeText}>{value}</Text>
      </TouchableOpacity>

      {showHours && (
        <View style={styles.pickerModal}>
          <Text style={styles.pickerTitle}>Select Hour</Text>
          <ScrollView style={styles.pickerScroll}>
            {Array.from({ length: 24 }, (_, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.pickerItem,
                  i === hours && styles.pickerItemSelected,
                ]}
                onPress={() => handleHourChange(i)}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    i === hours && styles.pickerItemTextSelected,
                  ]}
                >
                  {String(i).padStart(2, '0')}:00
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {showMinutes && (
        <View style={styles.pickerModal}>
          <Text style={styles.pickerTitle}>Select Minute</Text>
          <ScrollView style={styles.pickerScroll}>
            {Array.from({ length: 60 }, (_, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.pickerItem,
                  i === minutes && styles.pickerItemSelected,
                ]}
                onPress={() => handleMinuteChange(i)}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    i === minutes && styles.pickerItemTextSelected,
                  ]}
                >
                  {String(i).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

/**
 * Day Selector Component
 */
interface DaySelectorProps {
  selectedDays: number[];
  onChange: (days: number[]) => void;
}

const DaySelector: React.FC<DaySelectorProps> = ({ selectedDays, onChange }) => {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const toggleDay = (day: number) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];
    onChange(newDays.sort());
  };

  return (
    <View style={styles.daySelectorContainer}>
      <Text style={styles.label}>Days of Week</Text>
      <View style={styles.daysGrid}>
        {DAYS.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayButton,
              selectedDays.includes(index) && styles.dayButtonSelected,
            ]}
            onPress={() => toggleDay(index)}
          >
            <Text
              style={[
                styles.dayText,
                selectedDays.includes(index) && styles.dayTextSelected,
              ]}
            >
              {day}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

/**
 * Main Schedule Editor Component
 */
const ScheduleEditor: React.FC<ScheduleEditorProps> = ({
  visible,
  schedule,
  childId,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(schedule?.name || 'Homework Time');
  const [startTime, setStartTime] = useState(schedule?.startTime || '14:00');
  const [endTime, setEndTime] = useState(schedule?.endTime || '18:00');
  const [daysOfWeek, setDaysOfWeek] = useState(
    schedule?.daysOfWeek || [1, 2, 3, 4, 5],
  ); // Weekdays by default
  const [enabled, setEnabled] = useState(schedule?.enabled ?? true);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a schedule name');
      return;
    }

    if (daysOfWeek.length === 0) {
      Alert.alert('Error', 'Please select at least one day of the week');
      return;
    }

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes >= endMinutes) {
      Alert.alert('Error', 'Start time must be before end time');
      return;
    }

    onSave({
      name,
      startTime,
      endTime,
      daysOfWeek,
      enabled,
      childId,
    });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {schedule ? 'Edit Schedule' : 'Create Schedule'}
            </Text>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Schedule Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Schedule Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                maxLength={80}
                accessibilityLabel="Schedule name"
              />
            </View>

            {/* Start Time */}
            <TimePicker label="Start Time" value={startTime} onChange={setStartTime} />

            {/* End Time */}
            <TimePicker label="End Time" value={endTime} onChange={setEndTime} />

            {/* Days of Week */}
            <DaySelector selectedDays={daysOfWeek} onChange={setDaysOfWeek} />

            {/* Enable/Disable */}
            <View style={styles.enableContainer}>
              <Text style={styles.label}>Enable Schedule</Text>
              <Switch value={enabled} onValueChange={setEnabled} />
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Study schedules are kept only in memory until the app closes.
                They do not automatically start or block, monitor, or restrict other apps.
              </Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    paddingTop: 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f5f5f5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },

  // Time Picker
  timePickerContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  timeDisplay: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerScroll: {
    maxHeight: 200,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#666',
  },
  pickerItemTextSelected: {
    color: '#1976D2',
    fontWeight: '600',
  },

  // Day Selector
  daySelectorContainer: {
    marginBottom: 20,
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  dayTextSelected: {
    color: '#fff',
  },

  // Input
  inputGroup: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
    color: '#333',
  },

  // Enable
  enableContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
  },

  // Info Box
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 4,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 18,
  },

  // Buttons
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default ScheduleEditor;
