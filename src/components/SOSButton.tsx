/**
 * SOS Button Component
 * Large red button for emergency SOS alerts
 */
import React, { useState, useRef } from 'react';
import { View, StyleSheet, Text, Animated, Alert } from 'react-native';
import { useAppDispatch } from '../store';
import { activateSOS } from '../store/slices/sosSlice';
import { sosAlertService } from '../services/SOSAlertService';
import { logger } from '../utils/logger';

interface SOSButtonProps {
  onPress?: () => void;
  enabled?: boolean;
}

const SOSButton: React.FC<SOSButtonProps> = ({ onPress, enabled = true }) => {
  const dispatch = useAppDispatch();
  const [isPressed, setIsPressed] = useState(false);
  const [holdDuration, setHoldDuration] = useState(0);
  const holdStartTime = useRef<number | null>(null);
  const holdInterval = useRef<NodeJS.Timeout | null>(null);
  const scale = useRef(new Animated.Value(1)).current;

  const HOLD_DURATION_MS = 2000; // 2 seconds to trigger SOS
  const TRIGGER_PERCENTAGE = 100;

  /**
   * Start holding the button
   */
  const handlePressIn = () => {
    if (!enabled) return;

    setIsPressed(true);
    holdStartTime.current = Date.now();

    // Animate scale
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();

    // Track hold duration
    holdInterval.current = setInterval(() => {
      if (holdStartTime.current) {
        const currentDuration = Date.now() - holdStartTime.current;
        setHoldDuration(currentDuration);

        if (currentDuration >= HOLD_DURATION_MS) {
          handleSOSTriggered();
        }
      }
    }, 100);
  };

  /**
   * Release button
   */
  const handlePressOut = () => {
    if (!enabled) return;

    setIsPressed(false);
    setHoldDuration(0);
    holdStartTime.current = null;

    if (holdInterval.current) {
      clearInterval(holdInterval.current);
      holdInterval.current = null;
    }

    // Animate scale back
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  /**
   * Handle SOS trigger
   */
  const handleSOSTriggered = async () => {
    try {
      handlePressOut();
      logger.info('SOS triggered');

      try {
        const sosAlert = await sosAlertService.triggerSOS('Manual SOS trigger');
        dispatch(activateSOS(sosAlert));
        if (sosAlert.status === 'sent') {
          Alert.alert(
            'SOS Alert Sent',
            'Your linked parent was notified. Location was included only if you granted permission.',
          );
        } else {
          Alert.alert('SOS not sent', 'The alert could not reach your linked parent. Please try again.');
        }
      } catch (error) {
        logger.error('Failed to send SOS alert', error);
        Alert.alert('Error', 'Failed to send SOS alert. Please try again.');
      }

      if (onPress) {
        onPress();
      }
    } catch (error) {
      logger.error('Error handling SOS trigger', error);
    }
  };

  const percentage = Math.min((holdDuration / HOLD_DURATION_MS) * TRIGGER_PERCENTAGE, 100);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.button,
          {
            transform: [{ scale }],
          },
        ]}
        onTouchStart={handlePressIn}
        onTouchEnd={handlePressOut}
      >
        {/* Progress ring background */}
        <View style={styles.progressBackground} />

        {/* Progress indicator */}
        {isPressed && percentage > 0 && (
          <View
            style={[
              styles.progressIndicator,
              {
                height: `${percentage}%`,
              },
            ]}
          />
        )}

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.icon}>🆘</Text>
          <Text style={styles.label}>SOS</Text>
          {isPressed && (
            <Text style={styles.instruction}>
              {Math.round((holdDuration / HOLD_DURATION_MS) * 100)}%
            </Text>
          )}
        </View>
      </Animated.View>

      {/* Help text */}
      <Text style={styles.helpText}>Hold for {HOLD_DURATION_MS / 1000} seconds to send SOS</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  button: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  progressBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 60,
  },
  progressIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 60,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  icon: {
    fontSize: 40,
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  instruction: {
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.8,
  },
  helpText: {
    marginTop: 16,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default SOSButton;
